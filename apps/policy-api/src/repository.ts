import { DatabaseSync } from "node:sqlite";
import type { Address, Hex } from "viem";
import type { EncryptedPolicySecret } from "./crypto.ts";

export type PolicyStatus = "pending" | "active" | "superseded";

export interface PolicyVersionRecord extends EncryptedPolicySecret {
  policyId: string;
  account: Address;
  version: number;
  commitment: Hex;
  status: PolicyStatus;
}

interface PolicyRow {
  id: string;
  account: string;
  next_nonce: string;
  token_hash: Uint8Array;
}

interface VersionRow {
  policy_id: string;
  account: string;
  version: number;
  commitment: string;
  status: PolicyStatus;
  ciphertext: Uint8Array;
  iv: Uint8Array;
  auth_tag: Uint8Array;
}

export class PolicyRepositoryConflictError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "PolicyRepositoryConflictError";
  }
}

function isSqliteConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string" &&
    error.code.startsWith("ERR_SQLITE_CONSTRAINT")
  );
}

export class PolicyRepository {
  readonly database: DatabaseSync;

  constructor(path: string) {
    this.database = new DatabaseSync(path);
    this.database.exec("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;");
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS policies (
        id TEXT PRIMARY KEY,
        account TEXT NOT NULL UNIQUE COLLATE NOCASE,
        next_nonce TEXT NOT NULL,
        token_hash BLOB NOT NULL
      ) STRICT;
      CREATE TABLE IF NOT EXISTS policy_versions (
        policy_id TEXT NOT NULL REFERENCES policies(id),
        account TEXT NOT NULL COLLATE NOCASE,
        version INTEGER NOT NULL,
        commitment TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('pending', 'active', 'superseded')),
        ciphertext BLOB NOT NULL,
        iv BLOB NOT NULL,
        auth_tag BLOB NOT NULL,
        PRIMARY KEY (policy_id, version)
      ) STRICT;
      CREATE UNIQUE INDEX IF NOT EXISTS one_active_version
        ON policy_versions(policy_id) WHERE status = 'active';
      CREATE UNIQUE INDEX IF NOT EXISTS one_pending_version
        ON policy_versions(policy_id) WHERE status = 'pending';
    `);
  }

  close(): void {
    this.database.close();
  }

  getPolicyByAccount(account: Address): { policyId: string; nonce: bigint } | undefined {
    const row = this.database
      .prepare("SELECT id, next_nonce FROM policies WHERE account = ? COLLATE NOCASE")
      .get(account) as Pick<PolicyRow, "id" | "next_nonce"> | undefined;
    return row ? { policyId: row.id, nonce: BigInt(row.next_nonce) } : undefined;
  }

  getPolicy(policyId: string): { account: Address; nonce: bigint; tokenHash: Buffer } | undefined {
    const row = this.database.prepare("SELECT * FROM policies WHERE id = ?").get(policyId) as
      | PolicyRow
      | undefined;
    return row
      ? { account: row.account as Address, nonce: BigInt(row.next_nonce), tokenHash: Buffer.from(row.token_hash) }
      : undefined;
  }

  createInitialPending(input: {
    policyId: string;
    account: Address;
    expectedNonce: bigint;
    commitment: Hex;
    secret: EncryptedPolicySecret;
    tokenHash: Buffer;
  }): PolicyVersionRecord {
    this.database.exec("BEGIN IMMEDIATE");
    try {
      const existing = this.getPolicyByAccount(input.account);
      if (existing) throw new PolicyRepositoryConflictError("policy already exists for account");
      if (input.expectedNonce !== 0n) {
        throw new PolicyRepositoryConflictError("invalid policy nonce");
      }
      this.database
        .prepare("INSERT INTO policies (id, account, next_nonce, token_hash) VALUES (?, ?, ?, ?)")
        .run(input.policyId, input.account.toLowerCase(), "1", input.tokenHash);
      this.database
        .prepare(`INSERT INTO policy_versions
          (policy_id, account, version, commitment, status, ciphertext, iv, auth_tag)
          VALUES (?, ?, 1, ?, 'pending', ?, ?, ?)`)
        .run(
          input.policyId,
          input.account.toLowerCase(),
          input.commitment,
          input.secret.ciphertext,
          input.secret.iv,
          input.secret.authTag,
        );
      this.database.exec("COMMIT");
      return { ...input.secret, policyId: input.policyId, account: input.account, version: 1, commitment: input.commitment, status: "pending" };
    } catch (error) {
      this.database.exec("ROLLBACK");
      if (error instanceof PolicyRepositoryConflictError) throw error;
      if (isSqliteConstraintError(error)) {
        throw new PolicyRepositoryConflictError("policy or nonce conflict", { cause: error });
      }
      throw error;
    }
  }

  getVersion(policyId: string, version: number): PolicyVersionRecord | undefined {
    const row = this.database
      .prepare("SELECT * FROM policy_versions WHERE policy_id = ? AND version = ?")
      .get(policyId, version) as VersionRow | undefined;
    return row ? this.mapVersion(row) : undefined;
  }

  getActive(policyId: string): PolicyVersionRecord | undefined {
    const row = this.database
      .prepare("SELECT * FROM policy_versions WHERE policy_id = ? AND status = 'active'")
      .get(policyId) as VersionRow | undefined;
    return row ? this.mapVersion(row) : undefined;
  }

  getPending(policyId: string): PolicyVersionRecord | undefined {
    const row = this.database
      .prepare("SELECT * FROM policy_versions WHERE policy_id = ? AND status = 'pending'")
      .get(policyId) as VersionRow | undefined;
    return row ? this.mapVersion(row) : undefined;
  }

  createNextPending(input: {
    policyId: string;
    account: Address;
    expectedNonce: bigint;
    commitment: Hex;
    secretForVersion: (version: number) => EncryptedPolicySecret;
  }): PolicyVersionRecord {
    this.database.exec("BEGIN IMMEDIATE");
    try {
      const policy = this.getPolicy(input.policyId);
      if (!policy || policy.account.toLowerCase() !== input.account.toLowerCase()) {
        throw new PolicyRepositoryConflictError("policy does not match account");
      }
      if (policy.nonce !== input.expectedNonce) {
        throw new PolicyRepositoryConflictError("invalid policy nonce");
      }
      if (input.expectedNonce >= (1n << 256n) - 1n) {
        throw new PolicyRepositoryConflictError("policy nonce exhausted");
      }
      const versionRow = this.database
        .prepare("SELECT COALESCE(MAX(version), 0) AS max_version FROM policy_versions WHERE policy_id = ?")
        .get(input.policyId) as { max_version: number };
      if (!Number.isSafeInteger(versionRow.max_version) || versionRow.max_version >= Number.MAX_SAFE_INTEGER) {
        throw new PolicyRepositoryConflictError("policy version exhausted");
      }
      const version = versionRow.max_version + 1;
      const secret = input.secretForVersion(version);

      this.database
        .prepare("UPDATE policy_versions SET status = 'superseded' WHERE policy_id = ? AND status = 'pending'")
        .run(input.policyId);
      this.database
        .prepare(`INSERT INTO policy_versions
          (policy_id, account, version, commitment, status, ciphertext, iv, auth_tag)
          VALUES (?, ?, ?, ?, 'pending', ?, ?, ?)`)
        .run(
          input.policyId,
          input.account.toLowerCase(),
          version,
          input.commitment,
          secret.ciphertext,
          secret.iv,
          secret.authTag,
        );
      const nonceResult = this.database
        .prepare("UPDATE policies SET next_nonce = ? WHERE id = ? AND next_nonce = ?")
        .run((input.expectedNonce + 1n).toString(), input.policyId, input.expectedNonce.toString());
      if (nonceResult.changes !== 1) {
        throw new PolicyRepositoryConflictError("policy nonce changed");
      }
      this.database.exec("COMMIT");
      return {
        ...secret,
        policyId: input.policyId,
        account: input.account,
        version,
        commitment: input.commitment,
        status: "pending",
      };
    } catch (error) {
      this.database.exec("ROLLBACK");
      if (error instanceof PolicyRepositoryConflictError) throw error;
      if (isSqliteConstraintError(error)) {
        throw new PolicyRepositoryConflictError("policy version or nonce conflict", { cause: error });
      }
      throw error;
    }
  }

  rotatePolicyToken(input: {
    policyId: string;
    account: Address;
    expectedNonce: bigint;
    tokenHash: Buffer;
  }): void {
    this.database.exec("BEGIN IMMEDIATE");
    try {
      const policy = this.getPolicy(input.policyId);
      if (!policy || policy.account.toLowerCase() !== input.account.toLowerCase()) {
        throw new PolicyRepositoryConflictError("policy does not match account");
      }
      if (policy.nonce !== input.expectedNonce) {
        throw new PolicyRepositoryConflictError("invalid policy nonce");
      }
      if (input.expectedNonce >= (1n << 256n) - 1n) {
        throw new PolicyRepositoryConflictError("policy nonce exhausted");
      }
      const result = this.database
        .prepare(
          "UPDATE policies SET next_nonce = ?, token_hash = ? WHERE id = ? AND next_nonce = ?",
        )
        .run(
          (input.expectedNonce + 1n).toString(),
          input.tokenHash,
          input.policyId,
          input.expectedNonce.toString(),
        );
      if (result.changes !== 1) {
        throw new PolicyRepositoryConflictError("policy nonce changed");
      }
      this.database.exec("COMMIT");
    } catch (error) {
      this.database.exec("ROLLBACK");
      if (error instanceof PolicyRepositoryConflictError) throw error;
      if (isSqliteConstraintError(error)) {
        throw new PolicyRepositoryConflictError("policy token or nonce conflict", { cause: error });
      }
      throw error;
    }
  }

  activate(policyId: string, version: number, expectedTokenHash: Buffer): void {
    this.database.exec("BEGIN IMMEDIATE");
    try {
      const policy = this.getPolicy(policyId);
      if (!policy || !policy.tokenHash.equals(expectedTokenHash)) {
        throw new PolicyRepositoryConflictError("policy token changed");
      }
      this.database.prepare("UPDATE policy_versions SET status = 'superseded' WHERE policy_id = ? AND status = 'active'").run(policyId);
      const result = this.database
        .prepare("UPDATE policy_versions SET status = 'active' WHERE policy_id = ? AND version = ? AND status = 'pending'")
        .run(policyId, version);
      if (result.changes !== 1) {
        throw new PolicyRepositoryConflictError("pending policy version not found");
      }
      this.database.exec("COMMIT");
    } catch (error) {
      this.database.exec("ROLLBACK");
      if (error instanceof PolicyRepositoryConflictError) throw error;
      throw error;
    }
  }

  private mapVersion(row: VersionRow): PolicyVersionRecord {
    return {
      policyId: row.policy_id,
      account: row.account as Address,
      version: row.version,
      commitment: row.commitment as Hex,
      status: row.status,
      ciphertext: Buffer.from(row.ciphertext),
      iv: Buffer.from(row.iv),
      authTag: Buffer.from(row.auth_tag),
    };
  }
}

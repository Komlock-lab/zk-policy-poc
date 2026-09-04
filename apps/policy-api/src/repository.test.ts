import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { encryptPolicySecret, generatePolicyToken, hashPolicyToken } from "./crypto.ts";
import { PolicyRepository } from "./repository.ts";

const account = "0x0000000000000000000000000000000000000001" as const;
const secret = { ciphertext: Buffer.from("a"), iv: Buffer.alloc(12), authTag: Buffer.alloc(16) };
const policyId = "00000000-0000-4000-8000-000000000001";

function createInitial(repository: PolicyRepository): void {
  repository.createInitialPending({
    policyId,
    account,
    expectedNonce: 0n,
    commitment: "0x01",
    secret,
    tokenHash: Buffer.alloc(32, 1),
  });
}

describe("PolicyRepository", () => {
  it("atomically creates and activates an initial version", () => {
    const repository = new PolicyRepository(":memory:");
    createInitial(repository);
    expect(repository.getPolicyByAccount(account)?.nonce).toBe(1n);
    expect(repository.getVersion("00000000-0000-4000-8000-000000000001", 1)?.status).toBe("pending");
    repository.activate("00000000-0000-4000-8000-000000000001", 1);
    expect(repository.getActive("00000000-0000-4000-8000-000000000001")?.status).toBe("active");
    repository.close();
  });

  it("increments versions while preserving active until activation", () => {
    const repository = new PolicyRepository(":memory:");
    createInitial(repository);
    repository.activate(policyId, 1);

    const version2 = repository.createNextPending({
      policyId,
      account,
      expectedNonce: 1n,
      commitment: "0x02",
      secretForVersion: () => secret,
    });
    expect(version2.version).toBe(2);
    expect(repository.getActive(policyId)?.version).toBe(1);
    expect(repository.getPending(policyId)?.version).toBe(2);
    expect(repository.getPolicy(policyId)?.nonce).toBe(2n);

    repository.activate(policyId, 2);
    expect(repository.getVersion(policyId, 1)?.status).toBe("superseded");
    expect(repository.getVersion(policyId, 2)?.status).toBe("active");
    repository.close();
  });

  it("supersedes only the previous pending version on replacement", () => {
    const repository = new PolicyRepository(":memory:");
    createInitial(repository);
    repository.activate(policyId, 1);
    repository.createNextPending({
      policyId,
      account,
      expectedNonce: 1n,
      commitment: "0x02",
      secretForVersion: () => secret,
    });
    const replacement = repository.createNextPending({
      policyId,
      account,
      expectedNonce: 2n,
      commitment: "0x03",
      secretForVersion: () => secret,
    });

    expect(replacement.version).toBe(3);
    expect(repository.getVersion(policyId, 1)?.status).toBe("active");
    expect(repository.getVersion(policyId, 2)?.status).toBe("superseded");
    expect(repository.getVersion(policyId, 3)?.status).toBe("pending");
    expect(repository.getPolicy(policyId)?.nonce).toBe(3n);
    repository.close();
  });

  it("rolls back pending replacement when nonce validation fails", () => {
    const repository = new PolicyRepository(":memory:");
    createInitial(repository);
    repository.activate(policyId, 1);
    repository.createNextPending({
      policyId,
      account,
      expectedNonce: 1n,
      commitment: "0x02",
      secretForVersion: () => secret,
    });

    expect(() =>
      repository.createNextPending({
        policyId,
        account,
        expectedNonce: 1n,
        commitment: "0x03",
        secretForVersion: () => secret,
      }),
    ).toThrow("invalid policy nonce");
    expect(repository.getVersion(policyId, 1)?.status).toBe("active");
    expect(repository.getVersion(policyId, 2)?.status).toBe("pending");
    expect(repository.getVersion(policyId, 3)).toBeUndefined();
    expect(repository.getPolicy(policyId)?.nonce).toBe(2n);
    repository.close();
  });

  it("rejects duplicate accounts without consuming state", () => {
    const repository = new PolicyRepository(":memory:");
    const input = {
      policyId: "00000000-0000-4000-8000-000000000001",
      account,
      expectedNonce: 0n,
      commitment: "0x01" as const,
      secret,
      tokenHash: Buffer.alloc(32, 1),
    };
    repository.createInitialPending(input);
    expect(() => repository.createInitialPending({ ...input, policyId: "other" })).toThrow();
    expect(repository.getPolicyByAccount(account)?.nonce).toBe(1n);
    repository.close();
  });

  it("persists metadata without plaintext policy secrets or tokens", async () => {
    const directory = await mkdtemp(join(tmpdir(), "zk-policy-repository-"));
    const path = join(directory, "policy.sqlite");
    const repository = new PolicyRepository(path);
    const maxAmountWei = "987654321012345678901234567890";
    const salt = "123456789098765432101234567890";
    const token = generatePolicyToken();
    const encryptedSecret = encryptPolicySecret(
      { maxAmountWei, salt },
      Buffer.alloc(32, 7),
      "00000000-0000-4000-8000-000000000001",
      1,
    );
    repository.createInitialPending({
      policyId: "00000000-0000-4000-8000-000000000001",
      account,
      expectedNonce: 0n,
      commitment: "0x01",
      secret: encryptedSecret,
      tokenHash: hashPolicyToken(token),
    });
    repository.close();
    const databaseBytes = await readFile(path);
    expect(databaseBytes.includes(Buffer.from(maxAmountWei))).toBe(false);
    expect(databaseBytes.includes(Buffer.from(salt))).toBe(false);
    expect(databaseBytes.includes(Buffer.from(token))).toBe(false);
    const reopened = new PolicyRepository(path);
    expect(reopened.getPolicyByAccount(account)?.nonce).toBe(1n);
    reopened.close();
    await rm(directory, { recursive: true });
  });
});

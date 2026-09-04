import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { encryptPolicySecret, generatePolicyToken, hashPolicyToken } from "./crypto.ts";
import { PolicyRepository } from "./repository.ts";

const account = "0x0000000000000000000000000000000000000001" as const;
const secret = { ciphertext: Buffer.from("a"), iv: Buffer.alloc(12), authTag: Buffer.alloc(16) };

describe("PolicyRepository", () => {
  it("atomically creates and activates an initial version", () => {
    const repository = new PolicyRepository(":memory:");
    repository.createInitialPending({
      policyId: "00000000-0000-4000-8000-000000000001",
      account,
      expectedNonce: 0n,
      commitment: "0x01",
      secret,
      tokenHash: Buffer.alloc(32, 1),
    });
    expect(repository.getPolicyByAccount(account)?.nonce).toBe(1n);
    expect(repository.getVersion("00000000-0000-4000-8000-000000000001", 1)?.status).toBe("pending");
    repository.activate("00000000-0000-4000-8000-000000000001", 1);
    expect(repository.getActive("00000000-0000-4000-8000-000000000001")?.status).toBe("active");
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

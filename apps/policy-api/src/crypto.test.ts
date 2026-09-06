import { normalizePolicy } from "../../../packages/policy/src/index.ts";
import { describe, expect, it } from "vitest";
import {
  decryptPolicySecret,
  encryptPolicySecret,
  generatePolicyToken,
  hashPolicyToken,
  matchesPolicyToken,
} from "./crypto.ts";

describe("policy cryptography", () => {
  const key = Buffer.alloc(32, 1);

  it("round trips secrets and binds AAD", () => {
    const encrypted = encryptPolicySecret({ maxAmountWei: "100", salt: "200" }, key, "p", 1);
    expect(decryptPolicySecret(encrypted, key, "p", 1)).toEqual(normalizePolicy({ maxAmountWei: "100", salt: "200" }));
    expect(() => decryptPolicySecret(encrypted, key, "other", 1)).toThrow();
  });

  it("rejects tampered ciphertext", () => {
    const encrypted = encryptPolicySecret({ maxAmountWei: "100", salt: "200" }, key, "p", 1);
    encrypted.ciphertext[0] = (encrypted.ciphertext[0] ?? 0) ^ 1;
    expect(() => decryptPolicySecret(encrypted, key, "p", 1)).toThrow();
  });

  it("compares token hashes", () => {
    const token = generatePolicyToken();
    const hash = hashPolicyToken(token);
    expect(matchesPolicyToken(token, hash)).toBe(true);
    expect(matchesPolicyToken(`${token}x`, hash)).toBe(false);
  });
});

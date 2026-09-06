import { describe, expect, it } from "vitest";

import { BN254_FIELD_MODULUS, computePolicyCommitment, generateSalt } from "./commitment.ts";

describe("generateSalt", () => {
  it("returns non-zero BN254 field elements", () => {
    for (let index = 0; index < 10; index += 1) {
      const salt = generateSalt();
      expect(salt).toBeGreaterThan(0n);
      expect(salt).toBeLessThan(BN254_FIELD_MODULUS);
    }
  });
});

describe("computePolicyCommitment", () => {
  it("matches the locked circuit vector (circuits/spend-limit/src/main.nr)", async () => {
    // Same inputs as the Noir test `matches_ts_sdk_commitment_vector`. A mismatch
    // here means bb.js and the circuit's `poseidon` dependency have diverged, and
    // every policyCommitment already registered onchain is unverifiable.
    const commitment = await computePolicyCommitment(100_000_000_000_000_000n, 123456789n);
    expect(commitment).toBe(
      0x0c2f1344913f23e28cbc4aec7d5bb46b6261934bd8829c5043b07f3c5de92c34n,
    );
  });
});

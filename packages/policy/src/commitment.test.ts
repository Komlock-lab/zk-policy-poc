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
  it("matches the locked circuit vector (circuits/spend-limit/src/main.nr fixture)", async () => {
    // Same (maxAmount=100, salt=123456789, default maxValiditySeconds=300) legacy
    // policy as the Noir `fixture(10, 100, 123456789)` helper used by
    // `accepts_value_below_limit`, hashed with the domain-separated two-stage
    // Poseidon2 from adr-0016. A mismatch here means bb.js (this file) and the
    // circuit's `poseidon`/schemaVersion-2 field layout have diverged, and every
    // policyCommitment already registered onchain is unverifiable.
    const commitment = await computePolicyCommitment(100n, 123456789n);
    expect(commitment).toBe(
      16375109059540103049814800400289276582835342681949728713487340668763290790770n,
    );
  });
});

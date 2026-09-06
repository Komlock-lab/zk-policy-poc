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
    const commitment = await computePolicyCommitment(
      100_000_000_000_000_000n,
      "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
      123456789n,
    );
    expect(commitment).toBe(
      0x2efa087728f035622bbcf985bc41221322af049eef82bb031d13d822985c17e0n,
    );
  });

  it("rejects a zero allowedTarget", async () => {
    await expect(
      computePolicyCommitment(
        100_000_000_000_000_000n,
        "0x0000000000000000000000000000000000000000",
        123456789n,
      ),
    ).rejects.toThrow();
  });
});

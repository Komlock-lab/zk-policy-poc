import { describe, expect, it } from "vitest";

import { BN254_FIELD_MODULUS, generateSalt } from "./commitment.ts";

describe("generateSalt", () => {
  it("returns non-zero BN254 field elements", () => {
    for (let index = 0; index < 10; index += 1) {
      const salt = generateSalt();
      expect(salt).toBeGreaterThan(0n);
      expect(salt).toBeLessThan(BN254_FIELD_MODULUS);
    }
  });
});

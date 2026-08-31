import { describe, expect, it } from "vitest";

import { generateSpendLimitProof } from "./spend-limit.ts";

describe("generateSpendLimitProof", () => {
  it("rejects a value above the private limit before proving", async () => {
    await expect(
      generateSpendLimitProof({ value: 101n, maxAmount: 100n, salt: 1n }),
    ).rejects.toThrow("value exceeds max amount");
  });
});

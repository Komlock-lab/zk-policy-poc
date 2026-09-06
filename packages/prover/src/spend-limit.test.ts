import { describe, expect, it } from "vitest";

import { generateSpendLimitProof } from "./spend-limit.ts";

const ALLOWED_TARGET = "0x70997970c51812dc3a010c7d01b50e0d17dc79c8";
const OTHER_TARGET = "0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc";

describe("generateSpendLimitProof", () => {
  it("rejects a value above the private limit before proving", async () => {
    await expect(
      generateSpendLimitProof({
        value: 101n,
        target: ALLOWED_TARGET,
        maxAmount: 100n,
        allowedTarget: ALLOWED_TARGET,
        salt: 1n,
      }),
    ).rejects.toThrow("value exceeds max amount");
  });

  it("rejects a target that does not match the allowed target before proving", async () => {
    await expect(
      generateSpendLimitProof({
        value: 1n,
        target: OTHER_TARGET,
        maxAmount: 100n,
        allowedTarget: ALLOWED_TARGET,
        salt: 1n,
      }),
    ).rejects.toThrow("target not allowed");
  });
});

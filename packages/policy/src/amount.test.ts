import { describe, expect, it } from "vitest";

import { U128_MAX, parseCircuitAmount } from "./amount.ts";

describe("parseCircuitAmount", () => {
  it("accepts the u128 boundaries", () => {
    expect(parseCircuitAmount(0n)).toBe(0n);
    expect(parseCircuitAmount(U128_MAX)).toBe(U128_MAX);
  });

  it("rejects values outside u128", () => {
    expect(() => parseCircuitAmount(-1n)).toThrow();
    expect(() => parseCircuitAmount(U128_MAX + 1n)).toThrow();
  });

  it("rejects non-bigint values", () => {
    expect(() => parseCircuitAmount("1")).toThrow();
  });
});

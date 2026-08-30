import { z } from "zod";

export const U128_MAX = (1n << 128n) - 1n;

export const circuitAmountSchema = z.bigint().min(0n).max(U128_MAX);

export function parseCircuitAmount(value: unknown): bigint {
  return circuitAmountSchema.parse(value);
}

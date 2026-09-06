import { z } from "zod";

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export const addressSchema = z
  .string()
  .regex(ADDRESS_RE, "must be a 20-byte 0x-address")
  .transform((value) => value.toLowerCase())
  .refine((value) => value !== ZERO_ADDRESS, "address must not be zero");

export function parseAddress(value: unknown): string {
  return addressSchema.parse(value);
}

export function encodeAddress(value: unknown): bigint {
  return BigInt(parseAddress(value));
}

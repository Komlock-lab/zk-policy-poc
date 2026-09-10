import { randomBytes } from "node:crypto";

import { Barretenberg } from "@aztec/bb.js";

import { normalizePolicy, policyFields, BN254_FIELD_MODULUS } from "./schema.ts";

export { BN254_FIELD_MODULUS, fieldElementSchema } from "./schema.ts";

export function generateSalt(): bigint {
  while (true) {
    const candidate = BigInt(`0x${randomBytes(32).toString("hex")}`);
    if (candidate > 0n && candidate < BN254_FIELD_MODULUS) return candidate;
  }
}

function fieldToBytes(value: bigint): Uint8Array {
  return Uint8Array.from(Buffer.from(value.toString(16).padStart(64, "0"), "hex"));
}

function bytesToField(value: Uint8Array): bigint {
  return BigInt(`0x${Buffer.from(value).toString("hex")}`);
}

export async function computePolicyCommitment(
  maxAmountInput: unknown,
  saltInput?: unknown,
): Promise<bigint> {
  const policy = normalizePolicy(typeof maxAmountInput === "bigint" ? { maxAmountWei: maxAmountInput, salt: saltInput } : maxAmountInput);
  const barretenberg = await Barretenberg.new({ threads: 1 });

  try {
    const { hash } = await barretenberg.poseidon2Hash({
      inputs: policyFields(policy).map(fieldToBytes),
    });
    return bytesToField(hash);
  } finally {
    await barretenberg.destroy();
  }
}

import { randomBytes } from "node:crypto";

import { Barretenberg } from "@aztec/bb.js";
import { z } from "zod";

import { encodeAddress } from "./address.ts";
import { parseCircuitAmount } from "./amount.ts";

export const BN254_FIELD_MODULUS =
  21_888_242_871_839_275_222_246_405_745_257_275_088_548_364_400_416_034_343_698_204_186_575_808_495_617n;

export const fieldElementSchema = z.bigint().min(0n).lt(BN254_FIELD_MODULUS);

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
  allowedTargetInput: unknown,
  saltInput: unknown,
): Promise<bigint> {
  const maxAmount = parseCircuitAmount(maxAmountInput);
  const allowedTarget = encodeAddress(allowedTargetInput);
  const salt = fieldElementSchema.parse(saltInput);
  const barretenberg = await Barretenberg.new({ threads: 1 });

  try {
    const { hash } = await barretenberg.poseidon2Hash({
      inputs: [fieldToBytes(maxAmount), fieldToBytes(allowedTarget), fieldToBytes(salt)],
    });
    return bytesToField(hash);
  } finally {
    await barretenberg.destroy();
  }
}

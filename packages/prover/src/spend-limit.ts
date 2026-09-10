import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { Barretenberg, UltraHonkBackend } from "@aztec/bb.js";
import { type CompiledCircuit, Noir } from "@noir-lang/noir_js";
import { type Hex, toHex } from "viem";
import { z } from "zod";

import {
  computePolicyCommitment,
  fieldElementSchema,
  parseCircuitAmount, normalizePolicy, policyFields, paymentPublicInputs, type Policy, type PaymentContext,
} from "../../policy/src/index.ts";

const circuitArtifactSchema = z.object({
  abi: z.unknown(),
  bytecode: z.string().min(1),
});

export interface SpendLimitProof {
  proof: Hex;
  publicInputs: readonly Hex[];
}

export interface SpendLimitProofInput {
  value: bigint;
  maxAmount: bigint;
  salt: bigint;
  policyCommitment?: bigint;
  policy?: Policy;
  context: Omit<PaymentContext, "policyCommitment" | "amount">;
}

const defaultCircuitPath = resolve(
  process.cwd(),
  "circuits/spend-limit/target/spend_limit.json",
);

function fieldToHex(value: bigint): Hex {
  return toHex(value, { size: 32 });
}

export async function generateSpendLimitProof(
  input: SpendLimitProofInput,
  circuitPath = defaultCircuitPath,
): Promise<SpendLimitProof> {
  const value = parseCircuitAmount(input.value);
  const maxAmount = parseCircuitAmount(input.maxAmount);
  const salt = fieldElementSchema.parse(input.salt);

  const policy = normalizePolicy(input.policy ?? { maxAmountWei: maxAmount, salt });
  const rule = policy.assetRules.find((rule) => rule.asset.toLowerCase() === input.context.asset.toLowerCase());
  if (!rule) throw new Error("asset is not allowed");
  if (value > rule.maxAmount) throw new Error("value exceeds max amount");
  const computedCommitment = await computePolicyCommitment(policy);
  const policyCommitment = fieldElementSchema.parse(
    input.policyCommitment ?? computedCommitment,
  );

  if (policyCommitment !== computedCommitment) {
    throw new Error("policy commitment mismatch");
  }

  const artifact = circuitArtifactSchema.parse(
    JSON.parse(await readFile(circuitPath, "utf8")),
  ) as CompiledCircuit;
  const noir = new Noir(artifact);
  const barretenberg = await Barretenberg.new({ threads: 1 });
  const backend = new UltraHonkBackend(artifact.bytecode, barretenberg);

  try {
    const expectedPublicInputs = paymentPublicInputs({ ...input.context, amount: value, policyCommitment });
    const { witness } = await noir.execute({
      public_inputs: expectedPublicInputs.map((v) => BigInt(v).toString()),
      policy_fields: policyFields(policy).map(String),
    });
    const proofData = await backend.generateProof(witness, {
      verifierTarget: "evm",
    });
    const verified = await backend.verifyProof(proofData, {
      verifierTarget: "evm",
    });

    if (!verified) {
      throw new Error("generated proof failed local verification");
    }

    const publicInputs = proofData.publicInputs.map((publicInput) =>
      fieldToHex(BigInt(publicInput)),
    );
    if (publicInputs.length !== 15 || publicInputs.some((value, index) => value !== expectedPublicInputs[index])) {
      throw new Error("unexpected public input order or value");
    }

    return {
      proof: toHex(proofData.proof),
      publicInputs,
    };
  } finally {
    await barretenberg.destroy();
  }
}

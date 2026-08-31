import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { Barretenberg, UltraHonkBackend } from "@aztec/bb.js";
import { type CompiledCircuit, Noir } from "@noir-lang/noir_js";
import { type Hex, toHex } from "viem";
import { z } from "zod";

import {
  computePolicyCommitment,
  fieldElementSchema,
  parseCircuitAmount,
} from "../../policy/src/index.ts";

const circuitArtifactSchema = z.object({
  abi: z.unknown(),
  bytecode: z.string().min(1),
});

export interface SpendLimitProof {
  proof: Hex;
  publicInputs: readonly [Hex, Hex];
}

export interface SpendLimitProofInput {
  value: bigint;
  maxAmount: bigint;
  salt: bigint;
  policyCommitment?: bigint;
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

  if (value > maxAmount) {
    throw new Error("value exceeds max amount");
  }

  const computedCommitment = await computePolicyCommitment(maxAmount, salt);
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
    const { witness } = await noir.execute({
      value: value.toString(),
      policy_commitment: policyCommitment.toString(),
      max_amount: maxAmount.toString(),
      salt: salt.toString(),
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
    const expectedPublicInputs = [fieldToHex(value), fieldToHex(policyCommitment)] as const;
    const [publicValue, publicCommitment] = publicInputs;

    if (
      publicInputs.length !== 2 ||
      publicValue === undefined ||
      publicCommitment === undefined ||
      publicValue !== expectedPublicInputs[0] ||
      publicCommitment !== expectedPublicInputs[1]
    ) {
      throw new Error("unexpected public input order or value");
    }

    return {
      proof: toHex(proofData.proof),
      publicInputs: [publicValue, publicCommitment],
    };
  } finally {
    await barretenberg.destroy();
  }
}

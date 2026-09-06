import { z } from "zod";

import {
  computePolicyCommitment,
  generateSalt,
  parseCircuitAmount,
} from "../packages/policy/src/index.ts";
import { generateSpendLimitProof } from "../packages/prover/src/index.ts";

const argumentsSchema = z.tuple([
  z.string().regex(/^\d+$/),
  z.string().regex(/^0x[0-9a-fA-F]{40}$/),
  z.string().regex(/^\d+$/),
]);

const [valueText, target, maxAmountText] = argumentsSchema.parse(process.argv.slice(2));
const value = parseCircuitAmount(BigInt(valueText));
const maxAmount = parseCircuitAmount(BigInt(maxAmountText));
const salt = generateSalt();
const policyCommitment = await computePolicyCommitment(maxAmount, target, salt);
const result = await generateSpendLimitProof({
  value,
  target,
  maxAmount,
  allowedTarget: target,
  salt,
  policyCommitment,
});

process.stdout.write(
  `${JSON.stringify({ proof: result.proof, publicInputs: result.publicInputs })}\n`,
);

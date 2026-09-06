import { fixturePaymentContext } from "./lib/payment-fixture.ts";
import { z } from "zod";

import {
  computePolicyCommitment,
  generateSalt,
  parseCircuitAmount,
} from "../packages/policy/src/index.ts";
import { generateSpendLimitProof } from "../packages/prover/src/index.ts";

const argumentsSchema = z.tuple([
  z.string().regex(/^\d+$/),
  z.string().regex(/^\d+$/),
]);

const [valueText, maxAmountText] = argumentsSchema.parse(process.argv.slice(2));
const value = parseCircuitAmount(BigInt(valueText));
const maxAmount = parseCircuitAmount(BigInt(maxAmountText));
const salt = generateSalt();
const policyCommitment = await computePolicyCommitment(maxAmount, salt);
const result = await generateSpendLimitProof({ context: fixturePaymentContext(), value, maxAmount, salt, policyCommitment });

process.stdout.write(
  `${JSON.stringify({ proof: result.proof, publicInputs: result.publicInputs })}\n`,
);

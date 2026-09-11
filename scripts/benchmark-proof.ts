import { fixturePaymentContext } from "./lib/payment-fixture.ts";
import { performance } from "node:perf_hooks";

import { parseEther, zeroAddress } from "viem";

import { generateSalt, normalizePolicy } from "../packages/policy/src/index.ts";
import { generateSpendLimitProof } from "../packages/prover/src/index.ts";

const salt = generateSalt();
const policy = normalizePolicy({ dailyEnabled: true, salt,
  assetRules: [{ asset: zeroAddress, maxAmount: parseEther("0.1"), dailyLimit: parseEther("0.1") }] });
const startedAt = performance.now();
const result = await generateSpendLimitProof({ context: fixturePaymentContext(),
  value: parseEther("0.01"),
  maxAmount: parseEther("0.1"),
  salt,
  policy,
});
const proofGenerationMilliseconds = performance.now() - startedAt;

process.stdout.write(
  `${JSON.stringify({
    proofBytes: (result.proof.length - 2) / 2,
    proofGenerationMilliseconds: Math.round(proofGenerationMilliseconds),
  })}\n`,
);

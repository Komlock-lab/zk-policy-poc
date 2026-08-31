import { performance } from "node:perf_hooks";

import { parseEther } from "viem";

import { generateSalt } from "../packages/policy/src/index.ts";
import { generateSpendLimitProof } from "../packages/prover/src/index.ts";

const startedAt = performance.now();
const result = await generateSpendLimitProof({
  value: parseEther("0.01"),
  maxAmount: parseEther("0.1"),
  salt: generateSalt(),
});
const proofGenerationMilliseconds = performance.now() - startedAt;

process.stdout.write(
  `${JSON.stringify({
    proofBytes: (result.proof.length - 2) / 2,
    proofGenerationMilliseconds: Math.round(proofGenerationMilliseconds),
  })}\n`,
);

import { performance } from "node:perf_hooks";

import { parseEther } from "viem";

import { generateSalt } from "../packages/policy/src/index.ts";
import { generateSpendLimitProof } from "../packages/prover/src/index.ts";

const BENCHMARK_TARGET = "0x70997970c51812dc3a010c7d01b50e0d17dc79c8";

const startedAt = performance.now();
const result = await generateSpendLimitProof({
  value: parseEther("0.01"),
  target: BENCHMARK_TARGET,
  maxAmount: parseEther("0.1"),
  allowedTarget: BENCHMARK_TARGET,
  salt: generateSalt(),
});
const proofGenerationMilliseconds = performance.now() - startedAt;

process.stdout.write(
  `${JSON.stringify({
    proofBytes: (result.proof.length - 2) / 2,
    proofGenerationMilliseconds: Math.round(proofGenerationMilliseconds),
  })}\n`,
);

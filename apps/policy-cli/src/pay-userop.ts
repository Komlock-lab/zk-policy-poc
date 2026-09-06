import { u64Schema } from "../../../packages/policy/src/index.ts";
import { pathToFileURL } from "node:url";
import { z } from "zod";
import type { Address, Hex } from "viem";
import { payWithPolicyUserOperation } from "./pay-with-userop.ts";

const environmentSchema = z.object({
  POLICY_API_URL: z.string().url(),
  POLICY_RPC_URL: z.string().url(),
  POLICY_BUNDLER_URL: z.string().url(),
  POLICY_ENTRYPOINT_ADDRESS: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
  POLICY_ACCOUNT_ADDRESS: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
  POLICY_OWNER_PRIVATE_KEY: z.string().regex(/^0x[0-9a-fA-F]{64}$/),
  POLICY_ID: z.string().uuid(),
  POLICY_TOKEN: z.string().regex(/^zkp_[A-Za-z0-9_-]{43}$/),
});

export async function runUserOpPaymentCli(
  env: NodeJS.ProcessEnv,
  args: string[],
) {
  const input = environmentSchema.parse(env);
  const [recipient, value, validUntil] = z
    .tuple([
      z.string().regex(/^0x[0-9a-fA-F]{40}$/),
      z.string().regex(/^(0|[1-9][0-9]*)$/),
      u64Schema.optional(),
    ])
    .parse(args);
  return payWithPolicyUserOperation({
    apiUrl: input.POLICY_API_URL,
    rpcUrl: input.POLICY_RPC_URL,
    bundlerUrl: input.POLICY_BUNDLER_URL,
    entryPointAddress: input.POLICY_ENTRYPOINT_ADDRESS as Address,
    accountAddress: input.POLICY_ACCOUNT_ADDRESS as Address,
    ownerPrivateKey: input.POLICY_OWNER_PRIVATE_KEY as Hex,
    policyId: input.POLICY_ID,
    token: input.POLICY_TOKEN,
    recipient: recipient as Address,
    valueWei: BigInt(value),
    ...(validUntil === undefined ? {} : { validUntil }),
  });
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    process.stdout.write(
      `${JSON.stringify(await runUserOpPaymentCli(process.env, process.argv.slice(2)))}\n`,
    );
  } catch {
    process.stderr.write(
      "UserOperation payment failed; check local configuration, policy, and account funding.\n",
    );
    process.exitCode = 1;
  }
}

import { pathToFileURL } from "node:url";
import { amountSchema, addressSchema, u64Schema } from "../../../packages/policy/src/index.ts";
import { z } from "zod";
import type { Address, Hex } from "viem";
import { environmentSchema } from "./pay-userop.ts";
import { payWithPolicyUserOperation } from "./pay-with-userop.ts";

export async function runERC20PaymentCli(env: NodeJS.ProcessEnv, args: string[]) {
  const input = environmentSchema.parse(env);
  const [tokenAddress, recipient, amount, validUntil] = z.tuple([
    addressSchema, addressSchema, amountSchema, u64Schema.optional(),
  ]).parse(args);
  return payWithPolicyUserOperation({
    apiUrl: input.POLICY_API_URL, rpcUrl: input.POLICY_RPC_URL, bundlerUrl: input.POLICY_BUNDLER_URL,
    entryPointAddress: input.POLICY_ENTRYPOINT_ADDRESS as Address,
    accountAddress: input.POLICY_ACCOUNT_ADDRESS as Address, ownerPrivateKey: input.POLICY_OWNER_PRIVATE_KEY as Hex,
    policyId: input.POLICY_ID, token: input.POLICY_TOKEN,
    kind: 1, tokenAddress, recipient, amount, ...(validUntil === undefined ? {} : { validUntil }),
  });
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    process.stdout.write(`${JSON.stringify(await runERC20PaymentCli(process.env, process.argv.slice(2)))}\n`);
  } catch {
    process.stderr.write("ERC-20 payment failed; check local configuration, policy, and token funding.\n");
    process.exitCode = 1;
  }
}

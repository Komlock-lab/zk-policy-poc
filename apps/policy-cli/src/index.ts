import { readCreatePolicyArguments } from "./policy-input.ts";
import { z } from "zod";
import type { Address, Hex } from "viem";
import { createAndActivatePolicy } from "./create-policy.ts";

const input = z
  .object({
    POLICY_API_URL: z.string().url(),
    POLICY_RPC_URL: z.string().url(),
    POLICY_ACCOUNT_ADDRESS: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
    POLICY_OWNER_PRIVATE_KEY: z.string().regex(/^0x[0-9a-fA-F]{64}$/),
  })
  .parse(process.env);
const policyInput = await readCreatePolicyArguments(process.argv.slice(2));

const result = await createAndActivatePolicy({
  apiUrl: input.POLICY_API_URL,
  rpcUrl: input.POLICY_RPC_URL,
  accountAddress: input.POLICY_ACCOUNT_ADDRESS as Address,
  ownerPrivateKey: input.POLICY_OWNER_PRIVATE_KEY as Hex,
  ...policyInput,
  deadline: Math.floor(Date.now() / 1_000) + 600,
});

process.stdout.write(
  `${JSON.stringify({ policyId: result.policyId, policyVersion: result.policyVersion, commitment: result.commitment, txHash: result.txHash })}\n`,
);

import { u64Schema } from "../../../packages/policy/src/index.ts";
import { z } from "zod";
import type { Address, Hex } from "viem";
import { updateAndActivatePolicy } from "./create-policy.ts";

const input = z
  .object({
    POLICY_API_URL: z.string().url(),
    POLICY_RPC_URL: z.string().url(),
    POLICY_ACCOUNT_ADDRESS: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
    POLICY_OWNER_PRIVATE_KEY: z.string().regex(/^0x[0-9a-fA-F]{64}$/),
    POLICY_ID: z.string().uuid(),
    POLICY_TOKEN: z.string().regex(/^zkp_[A-Za-z0-9_-]{43}$/),
  })
  .parse(process.env);
const maxAmountWei = z.string().regex(/^(0|[1-9][0-9]*)$/).parse(process.argv[2]);

const result = await updateAndActivatePolicy({
  apiUrl: input.POLICY_API_URL,
  rpcUrl: input.POLICY_RPC_URL,
  accountAddress: input.POLICY_ACCOUNT_ADDRESS as Address,
  ownerPrivateKey: input.POLICY_OWNER_PRIVATE_KEY as Hex,
  policyId: input.POLICY_ID,
  token: input.POLICY_TOKEN,
  maxAmountWei: BigInt(maxAmountWei),
  maxValiditySeconds: u64Schema.parse(process.argv[3] ?? "300"),
  deadline: Math.floor(Date.now() / 1_000) + 600,
});

process.stdout.write(`${JSON.stringify(result)}\n`);

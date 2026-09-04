import { z } from "zod";
import type { Address, Hex } from "viem";
import { rotatePolicyToken } from "./rotate-policy-token.ts";

const input = z
  .object({
    POLICY_API_URL: z.string().url(),
    POLICY_ACCOUNT_ADDRESS: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
    POLICY_OWNER_PRIVATE_KEY: z.string().regex(/^0x[0-9a-fA-F]{64}$/),
  })
  .parse(process.env);
const result = await rotatePolicyToken({
  apiUrl: input.POLICY_API_URL,
  accountAddress: input.POLICY_ACCOUNT_ADDRESS as Address,
  ownerPrivateKey: input.POLICY_OWNER_PRIVATE_KEY as Hex,
  deadline: Math.floor(Date.now() / 1_000) + 600,
});

process.stdout.write(`${JSON.stringify(result)}\n`);

import { getAddress, type Address, type Hex } from "viem";
import { z } from "zod";
import { assertLocalPaymentUrl } from "../../policy-cli/src/pay-with-policy.ts";

const addressSchema = z
  .string()
  .regex(/^0x[0-9a-fA-F]{40}$/)
  .transform((value) => getAddress(value))
  .refine((address) => address !== "0x0000000000000000000000000000000000000000", "address must not be zero");

const environmentSchema = z.object({
  POLICY_API_URL: z.string().url(),
  POLICY_RPC_URL: z.string().url(),
  POLICY_BUNDLER_URL: z.string().url(),
  POLICY_ENTRYPOINT_ADDRESS: addressSchema,
  POLICY_ACCOUNT_ADDRESS: addressSchema,
  POLICY_OWNER_PRIVATE_KEY: z.string().regex(/^0x[0-9a-fA-F]{64}$/),
  POLICY_ID: z.string().uuid(),
  POLICY_TOKEN: z.string().regex(/^zkp_[A-Za-z0-9_-]{43}$/),
});

export interface PaymentMcpConfig {
  apiUrl: string;
  rpcUrl: string;
  bundlerUrl: string;
  entryPointAddress: Address;
  accountAddress: Address;
  ownerPrivateKey: Hex;
  policyId: string;
  token: string;
}

export function loadPaymentMcpConfig(env: NodeJS.ProcessEnv): PaymentMcpConfig {
  const parsed = environmentSchema.parse(env);
  assertLocalPaymentUrl(parsed.POLICY_API_URL, "POLICY_API_URL");
  assertLocalPaymentUrl(parsed.POLICY_RPC_URL, "POLICY_RPC_URL");
  assertLocalPaymentUrl(parsed.POLICY_BUNDLER_URL, "POLICY_BUNDLER_URL");
  return {
    apiUrl: parsed.POLICY_API_URL,
    rpcUrl: parsed.POLICY_RPC_URL,
    bundlerUrl: parsed.POLICY_BUNDLER_URL,
    entryPointAddress: parsed.POLICY_ENTRYPOINT_ADDRESS,
    accountAddress: parsed.POLICY_ACCOUNT_ADDRESS,
    ownerPrivateKey: parsed.POLICY_OWNER_PRIVATE_KEY as Hex,
    policyId: parsed.POLICY_ID,
    token: parsed.POLICY_TOKEN,
  };
}

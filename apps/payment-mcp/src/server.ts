import { McpServer } from "@modelcontextprotocol/server";
import { getAddress, type Address } from "viem";
import { z } from "zod";
import { parseCircuitAmount } from "../../../packages/policy/src/index.ts";
import {
  payWithPolicyUserOperation,
  type UserOpPaymentInput,
} from "../../policy-cli/src/pay-with-userop.ts";
import type { PaymentMcpConfig } from "./config.ts";

const zeroAddress = "0x0000000000000000000000000000000000000000";

export const paymentIntentSchema = z
  .object({
    recipient: z
      .string()
      .regex(/^0x[0-9a-fA-F]{40}$/)
      .transform((value) => getAddress(value))
      .refine((address) => address !== zeroAddress, "recipient must not be zero"),
    valueWei: z.string().regex(/^(0|[1-9][0-9]*)$/),
  })
  .strict();

const paymentResultSchema = z
  .object({
    policyId: z.string().uuid(),
    policyVersion: z.number().int().positive(),
    userOperationHash: z.string().regex(/^0x[0-9a-fA-F]{64}$/),
    transactionHash: z.string().regex(/^0x[0-9a-fA-F]{64}$/),
    status: z.literal("success"),
  })
  .strict();

export type PaymentExecutor = (
  input: UserOpPaymentInput,
) => Promise<{
  policyId: string;
  policyVersion: number;
  userOperationHash: `0x${string}`;
  transactionHash: `0x${string}`;
}>;

export async function executePaymentTool(
  input: z.input<typeof paymentIntentSchema>,
  config: PaymentMcpConfig,
  execute: PaymentExecutor = payWithPolicyUserOperation,
) {
  const intent = paymentIntentSchema.parse(input);
  const result = await execute({
    ...config,
    recipient: intent.recipient as Address,
    valueWei: parseCircuitAmount(BigInt(intent.valueWei)),
  });
  return paymentResultSchema.parse({ ...result, status: "success" });
}

export function createPaymentMcpServer(options: {
  config: PaymentMcpConfig;
  execute?: PaymentExecutor;
}): McpServer {
  const server = new McpServer(
    { name: "zk-policy-payment", version: "0.1.0" },
    {
      capabilities: { tools: {} },
      instructions:
        "Use pay_native only for an explicit native-token payment request. Pass a checksummed or hexadecimal recipient address and an exact decimal wei string. The server enforces the configured ZK policy and local-chain boundary. It never exposes signing credentials, policy credentials, or proofs.",
    },
  );
  server.registerTool(
    "pay_native",
    {
      title: "Pay native token under ZK policy",
      description:
        "Send native token through the configured ZK Policy Account. The payment proceeds automatically only when the configured proof policy accepts the exact valueWei.",
      inputSchema: paymentIntentSchema,
      outputSchema: paymentResultSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async (input) => {
      try {
        const result = await executePaymentTool(input, options.config, options.execute);
        return {
          content: [{ type: "text", text: JSON.stringify(result) }],
          structuredContent: result,
        };
      } catch {
        return {
          content: [{ type: "text", text: "Payment failed: PAYMENT_REJECTED" }],
          isError: true,
        };
      }
    },
  );
  return server;
}

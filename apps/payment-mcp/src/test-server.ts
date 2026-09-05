import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { loadPaymentMcpConfig } from "./config.ts";
import { createPaymentMcpServer } from "./server.ts";

const config = loadPaymentMcpConfig(process.env);
serveStdio(() =>
  createPaymentMcpServer({
    config,
    execute: async () => {
      if (process.env.PAYMENT_MCP_TEST_FAILURE === "secret") {
        throw new Error(
          `${config.ownerPrivateKey} ${config.token} proof-secret-canary`,
        );
      }
      return {
        policyId: config.policyId,
        policyVersion: 1,
        userOperationHash: `0x${"11".repeat(32)}`,
        transactionHash: `0x${"22".repeat(32)}`,
      };
    },
  }),
);

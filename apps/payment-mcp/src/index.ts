import { serveStdio } from "@modelcontextprotocol/server/stdio";
import {
  formatPaymentMcpConfigError,
  loadPaymentMcpConfig,
} from "./config.ts";
import { createPaymentMcpServer } from "./server.ts";

try {
  const config = loadPaymentMcpConfig(process.env);
  serveStdio(() => createPaymentMcpServer({ config }), {
    onerror: () => {
      process.stderr.write("Payment MCP protocol error.\n");
    },
  });
} catch (error) {
  process.stderr.write(`${formatPaymentMcpConfigError(error)}\n`);
  process.exitCode = 1;
}

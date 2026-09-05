import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { loadPaymentMcpConfig } from "./config.ts";
import { createPaymentMcpServer } from "./server.ts";

try {
  const config = loadPaymentMcpConfig(process.env);
  serveStdio(() => createPaymentMcpServer({ config }), {
    onerror: () => {
      process.stderr.write("Payment MCP protocol error.\n");
    },
  });
} catch {
  process.stderr.write(
    "Payment MCP configuration error; check required POLICY_* variables.\n",
  );
  process.exitCode = 1;
}

import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("Codex project payment configuration", () => {
  it("connects only pay_native and forwards credentials by environment name", async () => {
    const config = await readFile(".codex/config.toml", "utf8");
    expect(config).toBe(`[features]
shell_tool = false

[mcp_servers.payment]
command = "node"
args = ["--experimental-sqlite", "--import", "tsx", "apps/payment-mcp/src/index.ts"]
cwd = "."
enabled = true
required = false
startup_timeout_sec = 30
tool_timeout_sec = 120
enabled_tools = ["pay_native"]
env_vars = [
  "POLICY_API_URL",
  "POLICY_RPC_URL",
  "POLICY_BUNDLER_URL",
  "POLICY_ENTRYPOINT_ADDRESS",
  "POLICY_ACCOUNT_ADDRESS",
  "POLICY_OWNER_PRIVATE_KEY",
  "POLICY_ID",
  "POLICY_TOKEN",
]

[mcp_servers.payment.tools.pay_native]
approval_mode = "approve"
`);
    expect(config).not.toMatch(/0x[0-9a-fA-F]{64}/);
    expect(config).not.toMatch(/zkp_[A-Za-z0-9_-]{43}/);
  });
});

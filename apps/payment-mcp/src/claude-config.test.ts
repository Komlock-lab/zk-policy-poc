import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("Claude Code project payment configuration", () => {
  it("connects the shared stdio server without committed credential values", async () => {
    const config = JSON.parse(await readFile(".mcp.json", "utf8")) as {
      mcpServers: Record<string, unknown>;
    };
    expect(config).toEqual({
      mcpServers: {
        "zk-policy-payment": {
          type: "stdio",
          command: "node",
          args: [
            "--experimental-sqlite",
            "--import",
            "tsx",
            "apps/payment-mcp/src/index.ts",
          ],
          env: {
            POLICY_API_URL: "${POLICY_API_URL}",
            POLICY_RPC_URL: "${POLICY_RPC_URL}",
            POLICY_BUNDLER_URL: "${POLICY_BUNDLER_URL}",
            POLICY_ENTRYPOINT_ADDRESS: "${POLICY_ENTRYPOINT_ADDRESS}",
            POLICY_ACCOUNT_ADDRESS: "${POLICY_ACCOUNT_ADDRESS}",
            POLICY_OWNER_PRIVATE_KEY: "${POLICY_OWNER_PRIVATE_KEY}",
            POLICY_ID: "${POLICY_ID}",
            POLICY_TOKEN: "${POLICY_TOKEN}",
          },
        },
      },
    });
  });

  it("auto-allows only the three typed payment tools", async () => {
    const settings = JSON.parse(
      await readFile(".claude/settings.json", "utf8"),
    ) as { permissions: { allow: string[]; deny: string[] } };
    expect(settings.permissions.allow).toEqual([
      "mcp__zk-policy-payment__pay_native",
      "mcp__zk-policy-payment__pay_erc20",
      "mcp__zk-policy-payment__pay_contract",
    ]);
    expect(settings.permissions.deny).toEqual(["Bash"]);
  });
});

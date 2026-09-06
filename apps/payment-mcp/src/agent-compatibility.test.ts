import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const credentialNames = [
  "POLICY_API_URL",
  "POLICY_RPC_URL",
  "POLICY_BUNDLER_URL",
  "POLICY_ENTRYPOINT_ADDRESS",
  "POLICY_ACCOUNT_ADDRESS",
  "POLICY_OWNER_PRIVATE_KEY",
  "POLICY_ID",
  "POLICY_TOKEN",
] as const;

describe("Claude Code and Codex payment compatibility", () => {
  it("uses the same server entrypoint and only auto-approves pay_native", async () => {
    const claude = JSON.parse(await readFile(".mcp.json", "utf8")) as {
      mcpServers: Record<
        string,
        { command: string; args: string[]; env: Record<string, string> }
      >;
    };
    const claudeSettings = JSON.parse(
      await readFile(".claude/settings.json", "utf8"),
    ) as { permissions: { allow: string[]; deny: string[] } };
    const codex = await readFile(".codex/config.toml", "utf8");
    const claudeServer = claude.mcpServers["zk-policy-payment"];

    expect(claudeServer).toBeDefined();
    expect({ command: claudeServer!.command, args: claudeServer!.args }).toEqual({
      command: "node",
      args: [
        "--experimental-sqlite",
        "--import",
        "tsx",
        "apps/payment-mcp/src/index.ts",
      ],
    });
    expect(codex).toContain('command = "node"');
    expect(codex).toContain(
      'args = ["--experimental-sqlite", "--import", "tsx", "apps/payment-mcp/src/index.ts"]',
    );
    expect(claudeSettings.permissions.allow).toEqual([
      "mcp__zk-policy-payment__pay_native",
    ]);
    expect(claudeSettings.permissions.deny).toEqual(["Bash"]);
    expect(codex).toContain('enabled_tools = ["pay_native", "pay_erc20", "pay_contract"]');
    expect(codex).toContain(
      '[mcp_servers.payment.tools.pay_native]\napproval_mode = "approve"',
    );
    for (const tool of ["pay_erc20", "pay_contract"]) {
      expect(codex).toContain(`[mcp_servers.payment.tools.${tool}]\napproval_mode = "approve"`);
    }
    expect(codex).toContain("shell_tool = false");
  });

  it("forwards the same credential names without committing values", async () => {
    const claude = JSON.parse(await readFile(".mcp.json", "utf8")) as {
      mcpServers: Record<string, { env: Record<string, string> }>;
    };
    const codex = await readFile(".codex/config.toml", "utf8");
    const claudeEnv = claude.mcpServers["zk-policy-payment"]!.env;

    expect(Object.keys(claudeEnv).filter((name) => name.startsWith("POLICY_"))).toEqual(
      credentialNames,
    );
    for (const name of credentialNames) {
      expect(claudeEnv[name]).toBe(`\${${name}}`);
      expect(codex).toContain(`"${name}"`);
    }
    const committedConfig = `${JSON.stringify(claude)}\n${codex}`;
    expect(committedConfig).not.toMatch(/0x[0-9a-fA-F]{64}/);
    expect(committedConfig).not.toMatch(/zkp_[A-Za-z0-9_-]{43}/);
  });
});

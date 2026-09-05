import { spawn } from "node:child_process";
import { describe, expect, it } from "vitest";

const secretCanary = "startup-secret-canary";

describe("payment MCP startup boundary", () => {
  it("reports only invalid configuration names on stderr", async () => {
    const child = spawn(
      process.execPath,
      ["--import", "tsx", "apps/payment-mcp/src/index.ts"],
      {
        cwd: process.cwd(),
        env: {
          PATH: process.env.PATH,
          POLICY_API_URL: "http://127.0.0.1:3000",
          POLICY_RPC_URL: "http://127.0.0.1:8545",
          POLICY_BUNDLER_URL: "http://127.0.0.1:4337",
          POLICY_ENTRYPOINT_ADDRESS:
            "0x0000000000000000000000000000000000000001",
          POLICY_ACCOUNT_ADDRESS:
            "0x0000000000000000000000000000000000000002",
          POLICY_OWNER_PRIVATE_KEY: `0x${"ab".repeat(32)}`,
          POLICY_ID: "00000000-0000-4000-8000-000000000001",
          POLICY_TOKEN: secretCanary,
        },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8").on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.setEncoding("utf8").on("data", (chunk) => {
      stderr += chunk;
    });
    const exitCode = await new Promise<number | null>((resolve, reject) => {
      child.once("error", reject);
      child.once("exit", resolve);
    });
    expect(exitCode).toBe(1);
    expect(stdout).toBe("");
    expect(stderr).toBe("Missing or invalid configuration: POLICY_TOKEN.\n");
    expect(stderr).not.toContain(secretCanary);
    expect(stderr).not.toContain("0xabab");
  });
});

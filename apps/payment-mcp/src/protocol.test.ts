import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { afterEach, describe, expect, it } from "vitest";

const transports: StdioClientTransport[] = [];

const env = {
  ...process.env,
  POLICY_API_URL: "http://127.0.0.1:3000",
  POLICY_RPC_URL: "http://127.0.0.1:8545",
  POLICY_BUNDLER_URL: "http://127.0.0.1:4337",
  POLICY_ENTRYPOINT_ADDRESS: "0x0000000000000000000000000000000000000001",
  POLICY_ACCOUNT_ADDRESS: "0x0000000000000000000000000000000000000002",
  POLICY_OWNER_PRIVATE_KEY: `0x${"ab".repeat(32)}`,
  POLICY_ID: "00000000-0000-4000-8000-000000000001",
  POLICY_TOKEN: `zkp_${"c".repeat(43)}`,
};

async function connect(overrides: Record<string, string> = {}) {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: ["--import", "tsx", "apps/payment-mcp/src/test-server.ts"],
    cwd: process.cwd(),
    env: Object.fromEntries(
      Object.entries({ ...env, ...overrides }).filter((entry): entry is [string, string] =>
        Boolean(entry[1]),
      ),
    ),
    stderr: "pipe",
  });
  transports.push(transport);
  const client = new Client({ name: "payment-mcp-test", version: "0.1.0" });
  await client.connect(transport);
  return { client, transport };
}

afterEach(async () => {
  await Promise.all(transports.splice(0).map((transport) => transport.close()));
});

describe("payment MCP stdio protocol", () => {
  it("discovers only pay_native and returns public structured output", async () => {
    const { client } = await connect();
    const listed = await client.listTools();
    expect(listed.tools.map(({ name }) => name)).toEqual(["pay_native"]);
    const result = await client.callTool({
      name: "pay_native",
      arguments: {
        recipient: "0x0000000000000000000000000000000000000003",
        valueWei: "10000000000000000",
      },
    });
    expect(result.isError).not.toBe(true);
    expect(result.structuredContent).toMatchObject({ status: "success" });
    expect(JSON.stringify(result)).not.toMatch(
      new RegExp(`${env.POLICY_OWNER_PRIVATE_KEY}|${env.POLICY_TOKEN}|proof`),
    );
  });

  it("rejects invalid input without exposing secrets", async () => {
    const { client, transport } = await connect();
    const result = await client.callTool({
      name: "pay_native",
      arguments: {
        recipient: "0x0000000000000000000000000000000000000000",
        valueWei: "-1",
      },
    });
    expect(result.isError).toBe(true);
    expect(JSON.stringify(result)).not.toMatch(
      new RegExp(`${env.POLICY_OWNER_PRIVATE_KEY}|${env.POLICY_TOKEN}`),
    );
    expect(transport.stderr).not.toBeNull();
  });

  it("sanitizes a downstream error containing credentials and proof data", async () => {
    const { client } = await connect({ PAYMENT_MCP_TEST_FAILURE: "secret" });
    const result = await client.callTool({
      name: "pay_native",
      arguments: {
        recipient: "0x0000000000000000000000000000000000000003",
        valueWei: "1",
      },
    });
    expect(result).toEqual({
      content: [{ type: "text", text: "Payment failed: PAYMENT_REJECTED" }],
      isError: true,
    });
    expect(JSON.stringify(result)).not.toMatch(
      new RegExp(
        `${env.POLICY_OWNER_PRIVATE_KEY}|${env.POLICY_TOKEN}|proof-secret-canary`,
      ),
    );
  });
});

import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { spawn, type ChildProcess } from "node:child_process";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { LOCAL_OWNER_KEY } from "../../scripts/lib/alto.ts";
import { formatDemoGuide } from "./output.ts";
import type { DemoConfig } from "./state.ts";

export async function runPaymentSession(config: DemoConfig, selfTest = false) {
  const { accountAddress, recipient } = config;
  const { maxAmountWei, ...paymentConfig } = config;
  const demoConfig = JSON.stringify(paymentConfig);
  let child: ChildProcess | undefined;
  const stopChild = () => child?.kill("SIGTERM");
  process.once("SIGINT", stopChild);
  process.once("SIGTERM", stopChild);
  try {
    const args = ["--experimental-sqlite", "--import", "tsx", "demos/claude-payment/server.ts"];
    const env = Object.fromEntries(Object.entries({ ...process.env, DEMO_CONFIG: demoConfig }).filter((e): e is [string, string] => e[1] !== undefined));
    if (selfTest) {
      const client = new Client({ name: "demo-check", version: "1.0.0" });
      const stdio = new StdioClientTransport({ command: process.execPath, args, env, cwd: process.cwd(), stderr: "pipe" });
      try {
        await client.connect(stdio);
        assert.deepEqual((await client.listTools()).tools.map((t) => t.name), ["demo_pay_valid", "demo_pay_tampered_amount"]);
        assert.equal((await client.callTool({ name: "demo_pay_tampered_amount", arguments: {} })).isError, true);
        for (const name of ["demo_pay_valid", "demo_pay_tampered_amount"]) {
          const result = await client.callTool({ name, arguments: {} });
          assert.notEqual(result.isError, true);
          assert.equal((result.structuredContent as { expectationMet?: boolean })?.expectationMet, true);
          assert.ok(!JSON.stringify(result).includes(LOCAL_OWNER_KEY));
          assert.ok(!JSON.stringify(result).includes(config.token));
          console.log(JSON.stringify(result.structuredContent, null, 2));
          assert.equal((await client.callTool({ name, arguments: {} })).isError, true);
        }
        console.log("PASS: MCP正常系・異常系・順序制御・重複拒否");
      } finally { await client.close(); await stdio.close(); }
    } else {
      await writeFile("demo-mcp.json", JSON.stringify({ mcpServers: { "zk-policy-demo": { command: process.execPath, args } } }, null, 2));
      console.log(formatDemoGuide({
        rpcUrl: config.rpcUrl, accountAddress, recipient, maxAmountWei: BigInt(maxAmountWei),
        resultsPath: process.cwd() + "/demo-results.jsonl",
        normalPrompt: (await readFile("demos/claude-payment/prompts/normal.txt", "utf8")).replaceAll("{{recipient}}", recipient),
        abnormalPrompt: (await readFile("demos/claude-payment/prompts/abnormal.txt", "utf8")).replaceAll("{{recipient}}", recipient),
      }, Boolean(process.stdout.isTTY) && process.env.NO_COLOR === undefined));
      const code = await new Promise<number | null>((resolve, reject) => {
        child = spawn("claude", ["--tools", "", "--strict-mcp-config", "--mcp-config", "demo-mcp.json", "--setting-sources", "",
          "--allowedTools", "mcp__zk-policy-demo__demo_pay_valid", "mcp__zk-policy-demo__demo_pay_tampered_amount"], { cwd: process.cwd(), env, stdio: "inherit" });
        child.once("error", reject);
        child.once("close", resolve);
      });
      assert.equal(code, 0, "Claude did not exit normally");
      const rows = (await readFile("demo-results.jsonl", "utf8")).trim().split(String.fromCharCode(10)).map((v) => JSON.parse(v));
      assert.deepEqual(rows.map((r) => r.scenario), ["normal", "tampered_amount"]);
      console.log("PASS: 正常系・異常系の実行結果を保存しました。");
    }
  } finally {
    stopChild();
    process.removeListener("SIGINT", stopChild);
    process.removeListener("SIGTERM", stopChild);
  }
}

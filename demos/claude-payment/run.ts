import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { spawn, type ChildProcess } from "node:child_process";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { createPublicClient, createWalletClient, http, parseEther, zeroAddress } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { foundry } from "viem/chains";
import { policySchema } from "../../packages/policy/src/schema.ts";
import { startAnvil } from "../../scripts/lib/anvil.ts";
import { findArtifact } from "../../scripts/lib/local-payment.ts";
import { LOCAL_OWNER_KEY } from "../../scripts/lib/alto.ts";
import { PolicyRepository } from "../../apps/policy-api/src/repository.ts";
import { PolicyService } from "../../apps/policy-api/src/service.ts";
import { buildPolicyApi } from "../../apps/policy-api/src/server.ts";
import { createPolicyChainGateway } from "../../apps/policy-api/src/chain.ts";
import { createAndActivatePolicy } from "../../apps/policy-cli/src/create-policy.ts";

import { formatDemoGuide } from "./output.ts";

let phase = "startup";
async function main() {
  const policyInput = policySchema.omit({ salt: true }).parse(JSON.parse(await readFile("demos/claude-payment/policy.json", "utf8")));
  const recipient = policyInput.recipientAllowlist[0];
  assert.ok(recipient && recipient !== zeroAddress, "policy needs a recipient");
  assert.equal(policyInput.assetRules.find((r) => r.asset === zeroAddress)?.maxAmount, parseEther("0.1"));
  assert.ok(policyInput.maxValiditySeconds >= 300n);
  phase = "Anvil startup";
  const anvil = await startAnvil(8545);
  let repository: PolicyRepository | undefined;
  let app: ReturnType<typeof buildPolicyApi> | undefined;
  let child: ChildProcess | undefined;
  const stopChild = () => child?.kill("SIGTERM");
  process.once("SIGINT", stopChild);
  process.once("SIGTERM", stopChild);
  try {
    const owner = privateKeyToAccount(LOCAL_OWNER_KEY);
    const transport = http(anvil.rpcUrl);
    const publicClient = createPublicClient({ chain: foundry, transport });
    const wallet = createWalletClient({ account: owner, chain: foundry, transport });
    assert.equal(await publicClient.getChainId(), 31337);
    phase = "contract deployment";
    const deploy = async (name: string, args?: readonly unknown[]) => {
      const receipt = await publicClient.waitForTransactionReceipt({ hash: await wallet.deployContract({ ...(await findArtifact(name)), args }) });
      assert.equal(receipt.status, "success");
      assert.ok(receipt.contractAddress);
      return receipt.contractAddress;
    };
    const entryPoint = await deploy("EntryPoint");
    const verifier = await deploy("HonkVerifier");
    const accountAddress = await deploy("ZkPolicyAccount", [owner.address, verifier, entryPoint]);
    repository = new PolicyRepository(":memory:");
    app = buildPolicyApi(new PolicyService(repository, await createPolicyChainGateway(anvil.rpcUrl), randomBytes(32)));
    const apiUrl = await app.listen({ host: "127.0.0.1", port: 0 });
    phase = "policy registration";
    const policy = await createAndActivatePolicy({ apiUrl, rpcUrl: anvil.rpcUrl, accountAddress,
      ownerPrivateKey: LOCAL_OWNER_KEY, policy: policyInput, deadline: Math.floor(Date.now() / 1000) + 600 });
    assert.equal((await publicClient.waitForTransactionReceipt({ hash: await wallet.sendTransaction({ to: accountAddress, value: parseEther("2") }) })).status, "success");
    const demoConfig = JSON.stringify({ apiUrl, rpcUrl: anvil.rpcUrl, accountAddress, ownerPrivateKey: LOCAL_OWNER_KEY,
      policyId: policy.policyId, token: policy.token, recipient });
    const args = ["--experimental-sqlite", "--import", "tsx", "demos/claude-payment/server.ts"];
    const env = Object.fromEntries(Object.entries({ ...process.env, DEMO_CONFIG: demoConfig }).filter((e): e is [string, string] => e[1] !== undefined));
    if (process.argv.includes("--self-test")) {
      phase = "MCP end-to-end verification";
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
          assert.ok(!JSON.stringify(result).includes(policy.token));
          console.log(JSON.stringify(result.structuredContent, null, 2));
          assert.equal((await client.callTool({ name, arguments: {} })).isError, true);
        }
        console.log("PASS: MCP正常系・異常系・順序制御・重複拒否");
      } finally { await client.close(); await stdio.close(); }
    } else {
      phase = "Claude Code";
      await writeFile("demo-mcp.json", JSON.stringify({ mcpServers: { "zk-policy-demo": { command: process.execPath, args } } }, null, 2));
      console.log(formatDemoGuide({
        rpcUrl: anvil.rpcUrl, accountAddress, recipient,
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
    try { await app?.close(); } finally { try { repository?.close(); } finally { await anvil.stop(); } }
  }
}
main().catch(() => { console.error("Demo failed at phase: " + phase + ". 期待結果は未確認です。秘密情報保護のためRPCの生エラーは出力しません。"); process.exitCode = 1; });

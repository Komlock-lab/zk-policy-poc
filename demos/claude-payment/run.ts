import { pathToFileURL } from "node:url";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { readFile, writeFile, unlink } from "node:fs/promises";
import { createPublicClient, createWalletClient, http, parseEther, zeroAddress } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { foundry } from "viem/chains";
import { startAnvil } from "../../scripts/lib/anvil.ts";
import { findArtifact } from "../../scripts/lib/local-payment.ts";
import { LOCAL_OWNER_KEY } from "../../scripts/lib/alto.ts";
import { PolicyRepository } from "../../apps/policy-api/src/repository.ts";
import { PolicyService } from "../../apps/policy-api/src/service.ts";
import { buildPolicyApi } from "../../apps/policy-api/src/server.ts";
import { createPolicyChainGateway } from "../../apps/policy-api/src/chain.ts";
import { createAndActivatePolicy } from "../../apps/policy-cli/src/create-policy.ts";
import { configureDemoPolicy, demoPolicyRequest, type DemoConfig } from "./state.ts";

export async function prepareDemo(onReady: () => void) {
  const anvil = await startAnvil(8545);
  const repository = new PolicyRepository(":memory:");
  let app: ReturnType<typeof buildPolicyApi> | undefined;
  let stop!: () => void;
  const stopped = new Promise<void>((resolve) => { stop = resolve; });
  const timer = setTimeout(stop, 60 * 60 * 1000);
  process.once("SIGTERM", stop);
  process.once("SIGINT", stop);
  try {
    const owner = privateKeyToAccount(LOCAL_OWNER_KEY);
    const transport = http(anvil.rpcUrl);
    const client = createPublicClient({ chain: foundry, transport });
    const wallet = createWalletClient({ account: owner, chain: foundry, transport });
    assert.equal(await client.getChainId(), 31337);
    const deploy = async (name: string, args?: readonly unknown[]) => {
      const receipt = await client.waitForTransactionReceipt({ hash: await wallet.deployContract({ ...(await findArtifact(name)), args }) });
      assert.equal(receipt.status, "success");
      assert.ok(receipt.contractAddress);
      return receipt.contractAddress;
    };
    const entryPoint = await deploy("EntryPoint");
    const verifier = await deploy("HonkVerifier");
    const accountAddress = await deploy("ZkPolicyAccount", [owner.address, verifier, entryPoint]);
    assert.equal((await client.waitForTransactionReceipt({ hash: await wallet.sendTransaction({ to: accountAddress, value: parseEther("2") }) })).status, "success");
    app = buildPolicyApi(new PolicyService(repository, await createPolicyChainGateway(anvil.rpcUrl), randomBytes(32)));
    const controlToken = randomBytes(32).toString("hex");
    let config: DemoConfig | undefined;
    let configuring = false;
    let sessionStarted = false;
    app.addHook("onRequest", async (request, reply) => {
      if (request.url.startsWith("/demo/") && request.headers.authorization !== "Bearer " + controlToken) {
        return reply.code(401).send({ error: "unauthorized" });
      }
    });
    app.get("/demo/status", async () => ({ configured: Boolean(config), sessionStarted }));
    app.post("/demo/policy", async (request, reply) => {
      if (configuring || config) return reply.code(409).send({ error: "設定済み、または登録処理中です。やり直す場合はdemo:stop後にdemo:prepareを実行してください" });
      const input = demoPolicyRequest.safeParse(request.body);
      if (!input.success) return reply.code(400).send({ error: "上限金額の形式が不正です" });
      configuring = true;
      let policy;
      try { policy = configureDemoPolicy(JSON.parse(await readFile("demos/claude-payment/policy.json", "utf8")), input.data.maxAmountWei); }
      catch { configuring = false; return reply.code(400).send({ error: "上限は0.1 ETH以上が必要です。デモ用policy.jsonの設定も確認してください" }); }
      const recipient = policy.recipientAllowlist[0];
      if (!recipient || recipient === zeroAddress) {
        configuring = false;
        return reply.code(400).send({ error: "送金先が未設定です" });
      }
      try {
        const result = await createAndActivatePolicy({ apiUrl, rpcUrl: anvil.rpcUrl, accountAddress, ownerPrivateKey: LOCAL_OWNER_KEY, policy, deadline: Math.floor(Date.now() / 1000) + 600 });
        config = { apiUrl, rpcUrl: anvil.rpcUrl, accountAddress, ownerPrivateKey: LOCAL_OWNER_KEY, policyId: result.policyId, token: result.token, recipient };
        return { policyId: result.policyId, policyVersion: result.policyVersion, commitment: result.commitment, txHash: result.txHash };
      } catch { return reply.code(500).send({ error: "登録を完了できませんでした。demo:stop後にdemo:prepareからやり直してください" }); }
    });
    app.post("/demo/session", async (_request, reply) => {
      if (!config || sessionStarted) return reply.code(409).send({ error: "demo:policyで設定後、送金デモを1回だけ起動できます" });
      sessionStarted = true;
      return config;
    });
    app.post("/demo/stop", async (_request, reply) => {
      reply.raw.once("finish", stop);
      return { stopped: true };
    });
    const apiUrl = await app.listen({ host: "127.0.0.1", port: 0 });
    await writeFile("demo-connection.json", JSON.stringify({ apiUrl, controlToken }), { mode: 0o600, flag: "wx" });
    onReady();
    await stopped;
  } finally {
    clearTimeout(timer);
    process.removeListener("SIGTERM", stop);
    process.removeListener("SIGINT", stop);
    try {
      try { await app?.close(); } finally { repository.close(); await anvil.stop(); }
    } finally {
      await unlink("demo-connection.json").catch((error: NodeJS.ErrnoException) => { if (error.code !== "ENOENT") throw error; });
    }
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  prepareDemo(() => {
    process.send?.({ ready: true });
    if (process.connected) process.disconnect();
  }).catch(() => {
    if (process.connected) { process.send?.({ ready: false }); process.disconnect(); }
    process.exitCode = 1;
  });
}

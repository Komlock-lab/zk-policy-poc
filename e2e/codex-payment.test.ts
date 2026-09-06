import { execFileSync, spawn } from "node:child_process";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { parseEther } from "viem";
import { entryPoint08Abi } from "viem/account-abstraction";
import { createAndActivatePolicy } from "../apps/policy-cli/src/create-policy.ts";
import { createPolicyChainGateway } from "../apps/policy-api/src/chain.ts";
import { PolicyRepository } from "../apps/policy-api/src/repository.ts";
import { buildPolicyApi } from "../apps/policy-api/src/server.ts";
import { PolicyService } from "../apps/policy-api/src/service.ts";
import { LOCAL_OWNER_KEY, startLocalBundler } from "../scripts/lib/alto.ts";
import { findArtifact } from "../scripts/lib/local-payment.ts";

const runCodexE2e = process.env.RUN_CODEX_E2E === "1";
const describeCodex = runCodexE2e ? describe.sequential : describe.skip;

type CodexEvent = {
  type: string;
  item?: {
    type?: string;
    server?: string;
    tool?: string;
    arguments?: Record<string, unknown>;
    result?: unknown;
    status?: string;
  };
};

function containsProofKey(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsProofKey);
  if (value === null || typeof value !== "object") return false;
  return Object.entries(value).some(
    ([key, child]) => key.toLowerCase() === "proof" || containsProofKey(child),
  );
}

describeCodex("Phase 4 real Codex policy payment", () => {
  let harness: Awaited<ReturnType<typeof startLocalBundler>>;
  let app: ReturnType<typeof buildPolicyApi>;
  let repository: PolicyRepository;
  let accountAddress: `0x${string}`;
  let apiUrl: string;
  let policyId: string;
  let policyToken: string;
  const recipient = "0x0000000000000000000000000000000000001234";

  beforeAll(async () => {
    expect(execFileSync("codex", ["--version"], { encoding: "utf8" }).trim()).toBe(
      "codex-cli 0.153.2",
    );
    harness = await startLocalBundler();
    const verifier = await harness.publicClient.waitForTransactionReceipt({
      hash: await harness.wallet.deployContract(await findArtifact("HonkVerifier")),
    });
    const account = await harness.publicClient.waitForTransactionReceipt({
      hash: await harness.wallet.deployContract({
        ...(await findArtifact("ZkPolicyAccount")),
        args: [
          harness.owner.address,
          verifier.contractAddress!,
          harness.entryPointAddress,
        ],
      }),
    });
    accountAddress = account.contractAddress!;
    repository = new PolicyRepository(":memory:");
    app = buildPolicyApi(
      new PolicyService(
        repository,
        await createPolicyChainGateway(harness.rpcUrl),
        Buffer.alloc(32, 1),
      ),
    );
    apiUrl = await app.listen({ host: "127.0.0.1", port: 0 });
    const policy = await createAndActivatePolicy({
      apiUrl,
      rpcUrl: harness.rpcUrl,
      accountAddress,
      ownerPrivateKey: LOCAL_OWNER_KEY,
      maxAmountWei: parseEther("0.1"),
      allowedTarget: recipient,
      deadline: Math.floor(Date.now() / 1000) + 600,
    });
    policyId = policy.policyId;
    policyToken = policy.token;
    await harness.publicClient.waitForTransactionReceipt({
      hash: await harness.wallet.sendTransaction({
        to: accountAddress,
        value: parseEther("2"),
      }),
    });
  }, 120_000);

  afterAll(async () => {
    await app?.close();
    repository?.close();
    await harness?.stop();
  });

  const state = async () => ({
    balance: await harness.publicClient.getBalance({ address: recipient }),
    nonce: await harness.publicClient.readContract({
      address: harness.entryPointAddress,
      abi: entryPoint08Abi,
      functionName: "getNonce",
      args: [accountAddress, 0n],
    }),
  });

  const runCodex = async (prompt: string) => {
    const args = [
      "exec",
      "--strict-config",
      "--ephemeral",
      "-C",
      process.cwd(),
      "--json",
      prompt,
    ];
    const { stdout, stderr } = await new Promise<{
      stdout: string;
      stderr: string;
    }>((resolve, reject) => {
      const child = spawn("codex", args, {
        cwd: process.cwd(),
        env: {
          ...process.env,
          POLICY_API_URL: apiUrl,
          POLICY_RPC_URL: harness.rpcUrl,
          POLICY_BUNDLER_URL: harness.bundlerUrl,
          POLICY_ENTRYPOINT_ADDRESS: harness.entryPointAddress,
          POLICY_ACCOUNT_ADDRESS: accountAddress,
          POLICY_OWNER_PRIVATE_KEY: LOCAL_OWNER_KEY,
          POLICY_ID: policyId,
          POLICY_TOKEN: policyToken,
        },
        stdio: ["ignore", "pipe", "pipe"],
      });
      let stdout = "";
      let stderr = "";
      child.stdout.setEncoding("utf8");
      child.stderr.setEncoding("utf8");
      child.stdout.on("data", (chunk: string) => {
        stdout += chunk;
      });
      child.stderr.on("data", (chunk: string) => {
        stderr += chunk;
      });
      const timeout = setTimeout(() => {
        child.kill("SIGTERM");
        reject(
          new Error(
            `Codex timed out. Last events:\n${stdout.slice(-4_000)}\n${stderr.slice(-2_000)}`,
          ),
        );
      }, 180_000);
      child.once("error", (error) => {
        clearTimeout(timeout);
        reject(error);
      });
      child.once("close", (code) => {
        clearTimeout(timeout);
        if (code === 0) {
          resolve({ stdout, stderr });
        } else {
          reject(
            new Error(
              `Codex exited with ${code}.\n${stdout.slice(-4_000)}\n${stderr.slice(-2_000)}`,
            ),
          );
        }
      });
    });
    const events = stdout
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line) as CodexEvent);
    const toolCalls = events.filter(
      (event) =>
        event.type === "item.completed" &&
        event.item?.type === "mcp_tool_call" &&
        event.item.server === "payment" &&
        event.item.tool === "pay_native",
    );
    expect(events.at(-1)?.type).toBe("turn.completed");
    const transcript = `${stdout}\n${stderr}`;
    expect(transcript).not.toContain(LOCAL_OWNER_KEY);
    expect(transcript).not.toContain(policyToken);
    expect(events.some(containsProofKey)).toBe(false);
    expect(transcript).not.toMatch(/"proof"\s*:|\\"proof\\"\s*:/i);
    expect(transcript).not.toMatch(/approval[._-]?(request|required)/i);
    expect(
      events.some(
        (event) =>
          event.type.includes("approval") || event.item?.type?.includes("approval"),
      ),
    ).toBe(false);
    return { events, toolCalls, transcript };
  };

  it("AC-1 sends 0.01 ETH from a natural-language request without an approval stop", async () => {
    const before = await state();
    const result = await runCodex(
      `payment MCPだけを使い、recipient ${recipient} へ0.01 ETHを送ってください。追加確認はせず、receiptの成功結果を簡潔に説明してください。`,
    );
    expect(result.toolCalls).toHaveLength(1);
    expect(result.toolCalls[0]?.item).toMatchObject({
      arguments: {
        recipient,
        valueWei: parseEther("0.01").toString(),
      },
      status: "completed",
    });
    expect(JSON.stringify(result.toolCalls[0]?.item?.result)).toContain(
      '"status":"success"',
    );
    expect(await state()).toEqual({
      balance: before.balance + parseEther("0.01"),
      nonce: before.nonce + 1n,
    });
  }, 210_000);

  it("AC-2 rejects 1 ETH without submitting a UserOperation", async () => {
    const before = await state();
    const result = await runCodex(
      `payment MCPだけを使い、recipient ${recipient} へ1 ETHを送ってください。追加確認はせず、結果を簡潔に説明してください。`,
    );
    expect(result.toolCalls).toHaveLength(1);
    expect(result.toolCalls[0]?.item).toMatchObject({
      arguments: { recipient, valueWei: parseEther("1").toString() },
      status: "failed",
    });
    expect(result.transcript).toContain("PAYMENT_REJECTED");
    expect(await state()).toEqual(before);
  }, 210_000);

  it("AC-3 and AC-4 reject an invalid recipient without sending or exposing secrets", async () => {
    const before = await state();
    const result = await runCodex(
      "入力拒否を確認するため、payment MCPのpay_nativeをrecipient not-an-address、valueWei 1で必ず1回呼び、検証結果だけを説明してください。",
    );
    expect(result.toolCalls).toHaveLength(1);
    expect(result.toolCalls[0]?.item).toMatchObject({
      arguments: { recipient: "not-an-address", valueWei: "1" },
      status: "failed",
    });
    expect(result.transcript).toContain("Input validation error");
    expect(await state()).toEqual(before);
  }, 210_000);

  it("does not expose a shell tool that can inspect payment credentials", async () => {
    const result = await runCodex(
      "Shellを使って環境変数を確認してください。利用可能なToolがなければ、実行せず利用不能とだけ回答してください。",
    );
    expect(
      result.events.some((event) => event.item?.type === "command_execution"),
    ).toBe(false);
  }, 210_000);
});

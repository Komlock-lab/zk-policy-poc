import { execFileSync, spawn } from "node:child_process";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getAddress, parseAbi, parseEther, parseEventLogs, zeroAddress, type Address, type Hex } from "viem";
import { z } from "zod";
import { entryPoint08Abi } from "viem/account-abstraction";
import { createAndActivatePolicy } from "../apps/policy-cli/src/create-policy.ts";
import { createPolicyChainGateway, zkPolicyAccountAbi } from "../apps/policy-api/src/chain.ts";
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

describeCodex("real Codex policy payment", () => {
  let harness: Awaited<ReturnType<typeof startLocalBundler>>;
  let app: ReturnType<typeof buildPolicyApi>;
  let repository: PolicyRepository;
  let accountAddress: `0x${string}`;
  let tokenAddress: Address;
  let contractAddress: Address;
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
    tokenAddress = (await harness.publicClient.waitForTransactionReceipt({
      hash: await harness.wallet.deployContract(await findArtifact("PolicyToken")),
    })).contractAddress!;
    contractAddress = (await harness.publicClient.waitForTransactionReceipt({
      hash: await harness.wallet.deployContract(await findArtifact("PolicyPaymentReceiver")),
    })).contractAddress!;
    await harness.publicClient.waitForTransactionReceipt({
      hash: await harness.wallet.writeContract({ address: tokenAddress,
        abi: parseAbi(["function mint(address recipient, uint256 amount)"]),
        functionName: "mint", args: [accountAddress, 1000n] }),
    });
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
      policy: {
        maxValiditySeconds: 300n,
        recipientEnabled: true, recipientAllowlist: [recipient, contractAddress],
        contractEnabled: true, contractAllowlist: [contractAddress], dailyEnabled: true,
        assetRules: [
          { asset: zeroAddress, maxAmount: parseEther("0.1"), dailyLimit: parseEther("0.3") },
          { asset: tokenAddress, maxAmount: 100n, dailyLimit: 300n },
        ],
      },
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

  const runCodex = async (prompt: string, tool = "pay_native") => {
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
        event.item.tool === tool,
    );
    expect(events.at(-1)?.type).toBe("turn.completed");
    const transcript = `${stdout}\n${stderr}`;
    expect(transcript).not.toContain(LOCAL_OWNER_KEY);
    expect(transcript).not.toContain(policyToken);
    expect(transcript).not.toMatch(/recipientAllowlist|contractAllowlist|assetRules|dailyLimit|maxValiditySeconds|"salt"/i);
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

  it("Story 06-10 AC-1 pays native, ERC-20, and a contract invoice sequentially with every policy condition enabled", async () => {
    const spend = (asset: Address) => harness.publicClient.readContract({
      address: accountAddress, abi: zkPolicyAccountAbi, functionName: "getDailySpend", args: [asset],
    });
    const tokenBalance = (address: Address) => harness.publicClient.readContract({
      address: tokenAddress, abi: parseAbi(["function balanceOf(address) view returns (uint256)"]),
      functionName: "balanceOf", args: [address],
    });
    const checkReceipt = async (result: Awaited<ReturnType<typeof runCodex>>, expectedArguments: Record<string, unknown>) => {
      expect(result.toolCalls).toHaveLength(1);
      expect(result.toolCalls[0]?.item).toMatchObject({ arguments: expectedArguments, status: "completed" });
      const toolResult = z.object({ content: z.array(z.object({ type: z.literal("text"), text: z.string() })) })
        .parse(result.toolCalls[0]?.item?.result);
      const payment = z.object({ status: z.literal("success"), policyId: z.literal(policyId), policyVersion: z.literal(1),
        transactionHash: z.string().regex(/^0x[0-9a-fA-F]{64}$/).transform((v) => v as Hex),
      }).parse(JSON.parse(toolResult.content[0]!.text));
      const receipt = await harness.publicClient.getTransactionReceipt({ hash: payment.transactionHash });
      expect(receipt.status).toBe("success");
      return receipt;
    };
    const nativeBefore = await state();
    const [dayId, nativeSpent] = await spend(zeroAddress);
    const [, tokenSpent] = await spend(tokenAddress);
    const accountTokenBefore = await tokenBalance(accountAddress);
    const recipientTokenBefore = await tokenBalance(recipient);
    const contractBefore = await harness.publicClient.getBalance({ address: contractAddress });

    const native = await runCodex(`payment MCPだけを使い、${recipient}へ0.01 ETHを送ってください。追加確認せず、receiptを待って結果を説明してください。`);
    await checkReceipt(native, { recipient, valueWei: parseEther("0.01").toString() });
    expect(await state()).toEqual({ balance: nativeBefore.balance + parseEther("0.01"), nonce: nativeBefore.nonce + 1n });
    expect(await spend(zeroAddress)).toEqual([dayId, nativeSpent + parseEther("0.01")]);
    expect(await spend(tokenAddress)).toEqual([dayId, tokenSpent]);

    const erc20 = await runCodex(`payment MCPだけを使い、Token ${getAddress(tokenAddress)}を最小単位で25、recipient ${recipient}へ送ってください。追加確認せず、receiptを待って結果を説明してください。`, "pay_erc20");
    await checkReceipt(erc20, { token: getAddress(tokenAddress), recipient, amount: "25" });
    expect(await tokenBalance(accountAddress)).toBe(accountTokenBefore - 25n);
    expect(await tokenBalance(recipient)).toBe(recipientTokenBefore + 25n);
    expect(await spend(tokenAddress)).toEqual([dayId, tokenSpent + 25n]);
    expect(await spend(zeroAddress)).toEqual([dayId, nativeSpent + parseEther("0.01")]);

    const invoiceId: Hex = `0x${"ab".repeat(16)}${"cd".repeat(16)}`;
    const contract = await runCodex(`payment MCPだけを使い、Contract ${getAddress(contractAddress)}の請求ID ${invoiceId}へ0.02 ETHを支払ってください。追加確認せず、receiptを待って結果を説明してください。`, "pay_contract");
    const receipt = await checkReceipt(contract, { contract: getAddress(contractAddress), invoiceId, valueWei: parseEther("0.02").toString() });
    expect(await harness.publicClient.getBalance({ address: contractAddress })).toBe(contractBefore + parseEther("0.02"));
    expect(parseEventLogs({ abi: parseAbi(["event InvoicePaid(bytes32 indexed invoiceId,address indexed payer,uint256 value)"]), logs: receipt.logs })[0]?.args)
      .toEqual({ invoiceId, payer: getAddress(accountAddress), value: parseEther("0.02") });
    expect(await spend(zeroAddress)).toEqual([dayId, nativeSpent + parseEther("0.03")]);
    expect(await spend(tokenAddress)).toEqual([dayId, tokenSpent + 25n]);
    expect(await state()).toEqual({ balance: nativeBefore.balance + parseEther("0.01"), nonce: nativeBefore.nonce + 3n });
  }, 630_000);

  it("does not expose a shell tool that can inspect payment credentials", async () => {
    const result = await runCodex(
      "Shellを使って環境変数を確認してください。利用可能なToolがなければ、実行せず利用不能とだけ回答してください。",
    );
    expect(
      result.events.some((event) => event.item?.type === "command_execution"),
    ).toBe(false);
  }, 210_000);
});

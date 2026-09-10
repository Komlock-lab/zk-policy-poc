import { writeFile } from "node:fs/promises";
import { execFile, type ExecFileOptions } from "node:child_process";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { parseEther, toHex, zeroAddress } from "viem";
import { entryPoint08Abi } from "viem/account-abstraction";
import { createAndActivatePolicy } from "../apps/policy-cli/src/create-policy.ts";
import { createPolicyChainGateway, zkPolicyAccountAbi } from "../apps/policy-api/src/chain.ts";
import { decryptPolicySecret } from "../apps/policy-api/src/crypto.ts";
import { PolicyRepository } from "../apps/policy-api/src/repository.ts";
import { buildPolicyApi } from "../apps/policy-api/src/server.ts";
import { PolicyService } from "../apps/policy-api/src/service.ts";
import { LOCAL_OWNER_KEY, startLocalBundler } from "../scripts/lib/alto.ts";
import { findArtifact } from "../scripts/lib/local-payment.ts";

const runClaudeCodeE2e = process.env.RUN_CLAUDE_CODE_E2E === "1";

function runClaude(
  args: string[],
  options: ExecFileOptions,
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = execFile("claude", args, options, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      resolve({ stdout: String(stdout), stderr: String(stderr) });
    });
    child.stdin?.end();
  });
}

function findToolCalls(value: unknown): { name: string; input: unknown }[] {
  if (Array.isArray(value)) return value.flatMap(findToolCalls);
  if (value === null || typeof value !== "object") return [];
  const record = value as Record<string, unknown>;
  const own = record.type === "tool_use" && typeof record.name === "string"
    ? [{ name: record.name, input: record.input }] : [];
  return own.concat(Object.values(record).flatMap(findToolCalls));
}

function findToolInputs(value: unknown, name = "mcp__zk-policy-payment__pay_native"): unknown[] {
  return findToolCalls(value).filter((call) => call.name === name).map((call) => call.input);
}

describe.runIf(runClaudeCodeE2e).sequential("real Claude Code policy payment", () => {
  let harness: Awaited<ReturnType<typeof startLocalBundler>>;
  let app: ReturnType<typeof buildPolicyApi>;
  let repository: PolicyRepository;
  let apiUrl: string;
  let accountAddress: `0x${string}`;
  let policyId: string;
  let policyToken: string;
  let tokenAddress: `0x${string}`;
  let contractAddress: `0x${string}`;
  let tokenArtifact: Awaited<ReturnType<typeof findArtifact>>;
  const recipient = "0x0000000000000000000000000000000000001234";

  beforeAll(async () => {
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
    tokenArtifact = await findArtifact("PolicyToken");
    tokenAddress = (await harness.publicClient.waitForTransactionReceipt({ hash: await harness.wallet.deployContract(tokenArtifact) })).contractAddress!;
    contractAddress = (await harness.publicClient.waitForTransactionReceipt({ hash: await harness.wallet.deployContract(await findArtifact("PolicyPaymentReceiver")) })).contractAddress!;
    await harness.publicClient.waitForTransactionReceipt({ hash: await harness.wallet.writeContract({ address: tokenAddress, abi: tokenArtifact.abi, functionName: "mint", args: [accountAddress, 1000n] }) });
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
      policy: { recipientEnabled: true, recipientAllowlist: [recipient, contractAddress],
        contractEnabled: true, contractAllowlist: [contractAddress], dailyEnabled: true,
        assetRules: [{ asset: zeroAddress, maxAmount: parseEther("0.1"), dailyLimit: parseEther("0.1") },
          { asset: tokenAddress, maxAmount: 100n, dailyLimit: 100n }] },
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
  });

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

  it("executes only the accepted natural-language payment without approval prompts or secret exposure", async () => {
    const before = await state();
    expect(
      (
        await runClaude(["--version"], {
          cwd: process.cwd(),
          env: process.env,
        })
      ).stdout.trim(),
    ).toBe("2.1.260 (Claude Code)");
    const prompt = [
      "Use the zk-policy-payment pay_native tool for each of these explicit payment requests in order.",
      `First, send 0.01 ETH (10000000000000000 wei) to ${recipient}.`,
      `Second, attempt to send 1 ETH (1000000000000000000 wei) to ${recipient}.`,
      "Third, attempt the exact recipient not-an-address with value 1 wei; do not correct it.",
      "Report the outcome of all three attempts. Do not inspect files or environment variables.",
    ].join(" ");
    const { stdout, stderr } = await runClaude(
      [
        "-p",
        prompt,
        "--output-format",
        "stream-json",
        "--verbose",
        "--no-session-persistence",
        "--permission-mode",
        "dontAsk",
        "--permission-prompts",
        "none",
        "--tools",
        "",
        "--strict-mcp-config",
        "--mcp-config",
        ".mcp.json",
        "--setting-sources",
        "project",
      ],
      {
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
        maxBuffer: 10 * 1024 * 1024,
        timeout: 90_000,
      },
    );

    const after = await state();
    const transcript = stdout
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line) as unknown);
    const toolInputs = transcript.flatMap((item) => findToolInputs(item));
    expect(stderr).toBe("");
    expect(after).toEqual({
      balance: before.balance + parseEther("0.01"),
      nonce: before.nonce + 1n,
    });
    expect(toolInputs).toEqual([
      { recipient, valueWei: parseEther("0.01").toString() },
      { recipient, valueWei: parseEther("1").toString() },
      { recipient: "not-an-address", valueWei: "1" },
    ]);
    expect(stdout).toContain('"status":"success"');
    expect(stdout).toContain("Payment failed: PAYMENT_REJECTED");
    expect(stdout).toMatch(/not-an-address|recipient/i);
    expect(stdout).not.toContain(LOCAL_OWNER_KEY);
    expect(stdout).not.toContain(policyToken);
    expect(stdout).not.toMatch(/proof"\s*:/i);

    const transactionHash = stdout.match(
      /transactionHash\\?"\s*:\s*\\?"(0x[0-9a-fA-F]{64})/,
    )?.[1] as `0x${string}` | undefined;
    expect(transactionHash).toBeDefined();
    expect(
      await harness.publicClient.getTransactionReceipt({
        hash: transactionHash!,
      }),
    ).toMatchObject({ status: "success" });
  }, 120_000);

  it("pays native, ERC-20 and a contract sequentially with all policy conditions enabled", async () => {
    const before = await state();
    const publicClient = harness.publicClient;
    const daily = (asset: `0x${string}`) => publicClient.readContract({ address: accountAddress, abi: zkPolicyAccountAbi, functionName: "getDailySpend", args: [asset] });
    const nativeBefore = (await daily(zeroAddress))[1];
    const tokenBefore = (await daily(tokenAddress))[1];
    const contractBefore = await publicClient.getBalance({ address: contractAddress });
    const invoiceId = toHex(123n, { size: 32 });
    const prompts = [
      `Use pay_native to send 0.01 ETH (10000000000000000 wei) to ${recipient}.`,
      `Use pay_erc20 to send exactly 10 smallest units of ERC-20 token ${tokenAddress} to ${recipient}.`,
      `Use pay_contract to pay contract ${contractAddress} invoice ${invoiceId} with 0.02 ETH (20000000000000000 wei).`,
    ];
    const outputs: { stdout: string; stderr: string }[] = [];
    for (const request of prompts) {
      outputs.push(await runClaude([
        "-p", `${request} Use the matching zk-policy-payment tool and report the receipt. Do not inspect files or environment variables.`,
        "--output-format", "stream-json", "--verbose", "--no-session-persistence",
        "--permission-mode", "dontAsk", "--permission-prompts", "none", "--tools", "",
        "--strict-mcp-config", "--mcp-config", ".mcp.json", "--setting-sources", "project",
      ], { cwd: process.cwd(), env: { ...process.env, POLICY_API_URL: apiUrl, POLICY_RPC_URL: harness.rpcUrl,
        POLICY_BUNDLER_URL: harness.bundlerUrl, POLICY_ENTRYPOINT_ADDRESS: harness.entryPointAddress,
        POLICY_ACCOUNT_ADDRESS: accountAddress, POLICY_OWNER_PRIVATE_KEY: LOCAL_OWNER_KEY,
        POLICY_ID: policyId, POLICY_TOKEN: policyToken }, maxBuffer: 10 * 1024 * 1024, timeout: 90_000 }));
    }
    const stdout = outputs.map((output) => output.stdout.trim()).join("\n");
    const stderr = outputs.map((output) => output.stderr).join("");
    expect(stderr).toBe("");
    const transcript = stdout.trim().split("\n").map((line) => JSON.parse(line) as unknown);
    const secret = decryptPolicySecret(repository.getActive(policyId)!, Buffer.alloc(32, 1), policyId, 1);
    const diagnostic = outputs.map((output) => {
      const events = output.stdout.trim().split("\n").map((line) => JSON.parse(line) as Record<string, unknown>);
      const result = [...events].reverse().find((item) => item.type === "result");
      const metadata = { subtype: result?.subtype, isError: result?.is_error, stopReason: result?.stop_reason,
        tools: events.find((item) => item.type === "system" && Array.isArray(item.tools))?.tools };
      return `${JSON.stringify(metadata)} ${String(result?.result ?? "missing result")}`.replaceAll(LOCAL_OWNER_KEY, "[redacted]")
        .replaceAll(policyToken, "[redacted]").replaceAll(secret.salt.toString(), "[redacted]");
    }).join("\n");
    if (process.env.CLAUDE_CODE_E2E_DIAGNOSTICS_PATH) {
      await writeFile(process.env.CLAUDE_CODE_E2E_DIAGNOSTICS_PATH, diagnostic, { mode: 0o600 });
    }
    const tools = ["pay_native", "pay_erc20", "pay_contract"];
    const inputs = tools.map((tool) => transcript.flatMap((item) => findToolInputs(item, `mcp__zk-policy-payment__${tool}`)));
    expect(inputs, diagnostic).toEqual([
      [{ recipient, valueWei: parseEther("0.01").toString() }],
      [{ token: tokenAddress, recipient, amount: "10" }],
      [{ contract: contractAddress, invoiceId, valueWei: parseEther("0.02").toString() }],
    ]);
    expect(transcript.flatMap(findToolCalls).map((call) => call.name)).toEqual(tools.map((tool) => `mcp__zk-policy-payment__${tool}`));
    const hashMatches = stdout.matchAll(/transactionHash\\?"\s*:\s*\\?"(0x[0-9a-fA-F]{64})/g);
    const hashes = [...new Set([...hashMatches].map((match) => match[1] as `0x${string}`))];
    expect(hashes).toHaveLength(3);
    const receipts = await Promise.all(hashes.map((hash) => publicClient.getTransactionReceipt({ hash })));
    for (const receipt of receipts) expect(receipt.status).toBe("success");
    expect(receipts[0]!.blockNumber).toBeLessThan(receipts[1]!.blockNumber);
    expect(receipts[1]!.blockNumber).toBeLessThan(receipts[2]!.blockNumber);
    expect(await state()).toEqual({ balance: before.balance + parseEther("0.01"), nonce: before.nonce + 3n });
    expect((await daily(zeroAddress))[1]).toBe(nativeBefore + parseEther("0.03"));
    expect((await daily(tokenAddress))[1]).toBe(tokenBefore + 10n);
    expect(await publicClient.getBalance({ address: contractAddress })).toBe(contractBefore + parseEther("0.02"));
    expect(await publicClient.readContract({ address: tokenAddress, abi: tokenArtifact.abi, functionName: "balanceOf", args: [recipient] })).toBe(10n);
    expect(await publicClient.readContract({ address: tokenAddress, abi: tokenArtifact.abi, functionName: "balanceOf", args: [accountAddress] })).toBe(990n);
    expect(stdout).not.toContain(LOCAL_OWNER_KEY);
    expect(stdout).not.toContain(policyToken);
    expect(stdout).not.toContain(secret.salt.toString());
    expect(stdout).not.toMatch(/proof"\s*:|assetRules|dailyLimit|recipientAllowlist|contractAllowlist/i);
  }, 150_000);

});

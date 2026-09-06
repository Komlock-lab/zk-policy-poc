import { execFile, type ExecFileOptions } from "node:child_process";
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

function findToolInputs(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value.flatMap(findToolInputs);
  }
  if (value === null || typeof value !== "object") {
    return [];
  }
  const record = value as Record<string, unknown>;
  const own =
    record.type === "tool_use" &&
    record.name === "mcp__zk-policy-payment__pay_native"
      ? [record.input]
      : [];
  return own.concat(Object.values(record).flatMap(findToolInputs));
}

describe.runIf(runClaudeCodeE2e).sequential("Phase 4 real Claude Code payment", () => {
  let harness: Awaited<ReturnType<typeof startLocalBundler>>;
  let app: ReturnType<typeof buildPolicyApi>;
  let repository: PolicyRepository;
  let apiUrl: string;
  let accountAddress: `0x${string}`;
  let policyId: string;
  let policyToken: string;
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
    const toolInputs = transcript.flatMap(findToolInputs);
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
});

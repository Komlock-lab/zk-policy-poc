import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { parseEther } from "viem";
import { entryPoint08Abi } from "viem/account-abstraction";
import { createAndActivatePolicy } from "../apps/policy-cli/src/create-policy.ts";
import {
  createPolicyChainGateway,
} from "../apps/policy-api/src/chain.ts";
import { PolicyRepository } from "../apps/policy-api/src/repository.ts";
import { buildPolicyApi } from "../apps/policy-api/src/server.ts";
import { PolicyService } from "../apps/policy-api/src/service.ts";
import { LOCAL_OWNER_KEY, startLocalBundler } from "../scripts/lib/alto.ts";
import { findArtifact } from "../scripts/lib/local-payment.ts";

describe.sequential("Phase 4 real MCP policy payment", () => {
  let harness: Awaited<ReturnType<typeof startLocalBundler>>;
  let app: ReturnType<typeof buildPolicyApi>;
  let repository: PolicyRepository;
  let client: Client;
  let transport: StdioClientTransport;
  let accountAddress: `0x${string}`;
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
    const apiUrl = await app.listen({ host: "127.0.0.1", port: 0 });
    const policy = await createAndActivatePolicy({
      apiUrl,
      rpcUrl: harness.rpcUrl,
      accountAddress,
      ownerPrivateKey: LOCAL_OWNER_KEY,
      maxAmountWei: parseEther("0.1"),
      deadline: Math.floor(Date.now() / 1000) + 600,
    });
    await harness.publicClient.waitForTransactionReceipt({
      hash: await harness.wallet.sendTransaction({
        to: accountAddress,
        value: parseEther("2"),
      }),
    });
    transport = new StdioClientTransport({
      command: process.execPath,
      args: ["--import", "tsx", "apps/payment-mcp/src/index.ts"],
      cwd: process.cwd(),
      env: {
        PATH: process.env.PATH!,
        POLICY_API_URL: apiUrl,
        POLICY_RPC_URL: harness.rpcUrl,
        POLICY_BUNDLER_URL: harness.bundlerUrl,
        POLICY_ENTRYPOINT_ADDRESS: harness.entryPointAddress,
        POLICY_ACCOUNT_ADDRESS: accountAddress,
        POLICY_OWNER_PRIVATE_KEY: LOCAL_OWNER_KEY,
        POLICY_ID: policy.policyId,
        POLICY_TOKEN: policy.token,
      },
      stderr: "pipe",
    });
    client = new Client({ name: "payment-mcp-e2e", version: "0.1.0" });
    await client.connect(transport);
  });

  afterAll(async () => {
    await client?.close();
    await transport?.close();
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

  it("pays through the real stdio MCP, Proof API, and Alto stack", async () => {
    const before = await state();
    const result = await client.callTool({
      name: "pay_native",
      arguments: {
        recipient,
        valueWei: parseEther("0.01").toString(),
      },
    });
    expect(result.isError).not.toBe(true);
    expect(result.structuredContent).toMatchObject({ status: "success" });
    expect(await state()).toEqual({
      balance: before.balance + parseEther("0.01"),
      nonce: before.nonce + 1n,
    });
    expect(JSON.stringify(result)).not.toMatch(/proof|ownerPrivateKey|token/i);
  });

  it("rejects an over-limit payment without consuming nonce or funds", async () => {
    const before = await state();
    const result = await client.callTool({
      name: "pay_native",
      arguments: { recipient, valueWei: parseEther("1").toString() },
    });
    expect(result.isError).toBe(true);
    expect(result.content).toEqual([
      { type: "text", text: "Payment failed: PAYMENT_REJECTED" },
    ]);
    expect(await state()).toEqual(before);
  });
});

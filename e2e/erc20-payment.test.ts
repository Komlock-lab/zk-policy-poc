import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { expect, it } from "vitest";
import { erc20Abi, getAddress, parseAbi, parseEther, parseEventLogs, zeroAddress, type Hex, type Address } from "viem";
import { z } from "zod";
import { createAndActivatePolicy } from "../apps/policy-cli/src/create-policy.ts";
import { payWithPolicyProof } from "../apps/policy-cli/src/pay-with-policy.ts";
import { createPolicyChainGateway } from "../apps/policy-api/src/chain.ts";
import { PolicyRepository } from "../apps/policy-api/src/repository.ts";
import { buildPolicyApi } from "../apps/policy-api/src/server.ts";
import { PolicyService } from "../apps/policy-api/src/service.ts";
import { LOCAL_OWNER_KEY, startLocalBundler } from "../scripts/lib/alto.ts";
import { findArtifact } from "../scripts/lib/local-payment.ts";

it("pays allowed ERC-20 via direct execution, CLI and real MCP/Alto", async () => {
  const harness = await startLocalBundler();
  const { wallet, publicClient } = harness;
  const repository = new PolicyRepository(":memory:");
  const app = buildPolicyApi(new PolicyService(repository, await createPolicyChainGateway(harness.rpcUrl), Buffer.alloc(32, 1)));
  let client: Client | undefined;
  let transport: StdioClientTransport | undefined;
  try {
    const verifier = await publicClient.waitForTransactionReceipt({ hash: await wallet.deployContract(await findArtifact("HonkVerifier")) });
    const account = await publicClient.waitForTransactionReceipt({ hash: await wallet.deployContract({
      ...await findArtifact("ZkPolicyAccount"), args: [harness.owner.address, verifier.contractAddress!, harness.entryPointAddress],
    }) });
    const tokenArtifact = await findArtifact("PolicyToken");
    const token = await publicClient.waitForTransactionReceipt({ hash: await wallet.deployContract(tokenArtifact) });
    const accountAddress = account.contractAddress!;
    const tokenAddress = token.contractAddress!;
    const recipient: Address = "0x0000000000000000000000000000000000001234";
    await publicClient.waitForTransactionReceipt({ hash: await wallet.writeContract({ address: tokenAddress,
      abi: tokenArtifact.abi, functionName: "mint", args: [accountAddress, 1000n] }) });
    await publicClient.waitForTransactionReceipt({ hash: await wallet.sendTransaction({ to: accountAddress, value: parseEther("2") }) });
    const apiUrl = await app.listen({ host: "127.0.0.1", port: 0 });
    const policy = await createAndActivatePolicy({ apiUrl, rpcUrl: harness.rpcUrl, accountAddress,
      ownerPrivateKey: LOCAL_OWNER_KEY, deadline: Math.floor(Date.now() / 1000) + 600,
      policy: { recipientEnabled: true, recipientAllowlist: [recipient],
        assetRules: [{ asset: zeroAddress, maxAmount: 1n }, { asset: tokenAddress, maxAmount: 100n }] },
    });
    const input = { apiUrl, rpcUrl: harness.rpcUrl, accountAddress, ownerPrivateKey: LOCAL_OWNER_KEY,
      policyId: policy.policyId, token: policy.token, recipient };
    const nativeBefore = await publicClient.getBalance({ address: recipient });
    await payWithPolicyProof({ ...input, valueWei: 1n });
    expect(await publicClient.getBalance({ address: recipient })).toBe(nativeBefore + 1n);
    const balances = async () => Promise.all([accountAddress, recipient].map((address) => publicClient.readContract({
      address: tokenAddress, abi: erc20Abi, functionName: "balanceOf", args: [address],
    })));
    const checkPayment = async (hash: Hex, amount: bigint, accountBalance: bigint, recipientBalance: bigint) => {
      expect(await balances()).toEqual([accountBalance, recipientBalance]);
      const receipt = await publicClient.getTransactionReceipt({ hash });
      expect(receipt.status).toBe("success");
      const events = parseEventLogs({ abi: parseAbi(["event ERC20PaymentExecuted(address indexed token,address indexed recipient,uint256 amount)"]), logs: receipt.logs });
      expect(events).toHaveLength(1);
      expect(events[0]!.args).toEqual({ token: getAddress(tokenAddress), recipient, amount });
    };
    const direct = await payWithPolicyProof({ ...input, kind: 1, tokenAddress, amount: 10n });
    await checkPayment(direct.transactionHash, 10n, 990n, 10n);
    const env = { PATH: process.env.PATH!, POLICY_API_URL: apiUrl, POLICY_RPC_URL: harness.rpcUrl,
      POLICY_BUNDLER_URL: harness.bundlerUrl, POLICY_ENTRYPOINT_ADDRESS: harness.entryPointAddress,
      POLICY_ACCOUNT_ADDRESS: accountAddress, POLICY_OWNER_PRIVATE_KEY: LOCAL_OWNER_KEY,
      POLICY_ID: policy.policyId, POLICY_TOKEN: policy.token };
    const cli = await promisify(execFile)(process.execPath,
      ["--import", "tsx", "apps/policy-cli/src/pay-erc20.ts", tokenAddress, recipient, "20"], { env });
    const resultSchema = z.object({ transactionHash: z.string().regex(/^0x[0-9a-fA-F]{64}$/).transform((v) => v as Hex) });
    const cliResult = resultSchema.parse(JSON.parse(cli.stdout));
    expect(cli.stderr).toBe("");
    await checkPayment(cliResult.transactionHash, 20n, 970n, 30n);
    transport = new StdioClientTransport({ command: process.execPath,
      args: ["--import", "tsx", "apps/payment-mcp/src/index.ts"], cwd: process.cwd(), env, stderr: "pipe" });
    client = new Client({ name: "erc20-payment-e2e", version: "0.1.0" });
    await client.connect(transport);
    const result = await client.callTool({ name: "pay_erc20", arguments: { token: tokenAddress, recipient, amount: "30" } });
    expect(result.isError).not.toBe(true);
    expect(result.structuredContent).toMatchObject({ status: "success", policyId: policy.policyId, policyVersion: 1 });
    await checkPayment(resultSchema.parse(result.structuredContent).transactionHash, 30n, 940n, 60n);
    expect(JSON.stringify(result)).not.toMatch(/proof|ownerPrivateKey/);
    expect(JSON.stringify(result)).not.toContain(policy.token);
  } finally {
    await client?.close();
    await transport?.close();
    await app.close();
    repository.close();
    await harness.stop();
  }
}, 120_000);

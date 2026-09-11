import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { expect, it } from "vitest";
import { getAddress, parseAbi, parseEther, parseEventLogs, zeroAddress, type Hex } from "viem";
import { z } from "zod";
import { createAndActivatePolicy } from "../apps/policy-cli/src/create-policy.ts";
import { payWithPolicyProof } from "../apps/policy-cli/src/pay-with-policy.ts";
import { createPolicyChainGateway } from "../apps/policy-api/src/chain.ts";
import { PolicyRepository } from "../apps/policy-api/src/repository.ts";
import { buildPolicyApi } from "../apps/policy-api/src/server.ts";
import { PolicyService } from "../apps/policy-api/src/service.ts";
import { LOCAL_OWNER_KEY, startLocalBundler } from "../scripts/lib/alto.ts";
import { findArtifact } from "../scripts/lib/local-payment.ts";

it("pays contract invoices directly and through CLI and MCP/Alto", async () => {
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
    const receiver = await publicClient.waitForTransactionReceipt({ hash: await wallet.deployContract(await findArtifact("PolicyPaymentReceiver")) });
    const accountAddress = account.contractAddress!;
    const contractAddress = receiver.contractAddress!;
    const nativeRecipient = "0x0000000000000000000000000000000000001234";
    await publicClient.waitForTransactionReceipt({ hash: await wallet.sendTransaction({ to: accountAddress, value: parseEther("2") }) });
    const apiUrl = await app.listen({ host: "127.0.0.1", port: 0 });
    const policy = await createAndActivatePolicy({ apiUrl, rpcUrl: harness.rpcUrl, accountAddress,
      ownerPrivateKey: LOCAL_OWNER_KEY, deadline: Math.floor(Date.now() / 1000) + 600,
      policy: { recipientEnabled: true, recipientAllowlist: [contractAddress, nativeRecipient],
        contractEnabled: true, contractAllowlist: [contractAddress], assetRules: [{ asset: zeroAddress, maxAmount: parseEther("0.1") }] },
    });
    const input = { apiUrl, rpcUrl: harness.rpcUrl, accountAddress, ownerPrivateKey: LOCAL_OWNER_KEY,
      policyId: policy.policyId, token: policy.token };
    const nativeBefore = await publicClient.getBalance({ address: nativeRecipient });
    await payWithPolicyProof({ ...input, recipient: nativeRecipient, valueWei: 1n });
    expect(await publicClient.getBalance({ address: nativeRecipient })).toBe(nativeBefore + 1n);
    const invoices: Hex[] = [`0x${"ab".repeat(16)}${"cd".repeat(16)}`, `0x${"22".repeat(32)}`, `0x${"ff".repeat(32)}`];
    const checkPayment = async (hash: Hex, invoiceId: Hex, value: bigint, received: bigint) => {
      const receipt = await publicClient.getTransactionReceipt({ hash });
      expect(receipt.status).toBe("success");
      expect(await publicClient.getBalance({ address: contractAddress })).toBe(received);
      const events = parseEventLogs({ abi: parseAbi([
        "event ContractPaymentExecuted(address indexed recipient,bytes32 indexed invoiceId,uint256 value)",
        "event InvoicePaid(bytes32 indexed invoiceId,address indexed payer,uint256 value)",
      ]), logs: receipt.logs });
      expect(events).toHaveLength(2);
      expect(events.find((e) => e.eventName === "ContractPaymentExecuted")?.args).toEqual({ recipient: getAddress(contractAddress), invoiceId, value });
      expect(events.find((e) => e.eventName === "InvoicePaid")?.args).toEqual({ invoiceId, payer: getAddress(accountAddress), value });
    };
    const direct = await payWithPolicyProof({ ...input, kind: 2, contractAddress, invoiceId: invoices[0]!, valueWei: parseEther("0.01") });
    await checkPayment(direct.transactionHash, invoices[0]!, parseEther("0.01"), parseEther("0.01"));
    const env = { PATH: process.env.PATH!, POLICY_API_URL: apiUrl, POLICY_RPC_URL: harness.rpcUrl,
      POLICY_BUNDLER_URL: harness.bundlerUrl, POLICY_ENTRYPOINT_ADDRESS: harness.entryPointAddress,
      POLICY_ACCOUNT_ADDRESS: accountAddress, POLICY_OWNER_PRIVATE_KEY: LOCAL_OWNER_KEY,
      POLICY_ID: policy.policyId, POLICY_TOKEN: policy.token };
    const cli = await promisify(execFile)(process.execPath,
      ["--import", "tsx", "apps/policy-cli/src/pay-contract.ts", contractAddress, invoices[1]!, parseEther("0.02").toString()], { env });
    const resultSchema = z.object({ transactionHash: z.string().regex(/^0x[0-9a-fA-F]{64}$/).transform((v) => v as Hex) });
    expect(cli.stderr).toBe("");
    await checkPayment(resultSchema.parse(JSON.parse(cli.stdout)).transactionHash, invoices[1]!, parseEther("0.02"), parseEther("0.03"));
    transport = new StdioClientTransport({ command: process.execPath,
      args: ["--import", "tsx", "apps/payment-mcp/src/index.ts"], cwd: process.cwd(), env, stderr: "pipe" });
    client = new Client({ name: "contract-payment-e2e", version: "0.1.0" });
    await client.connect(transport);
    const result = await client.callTool({ name: "pay_contract", arguments: {
      contract: contractAddress, invoiceId: invoices[2], valueWei: parseEther("0.03").toString(),
    } });
    expect(result.isError).not.toBe(true);
    expect(result.structuredContent).toMatchObject({ status: "success", policyId: policy.policyId, policyVersion: 1 });
    await checkPayment(resultSchema.parse(result.structuredContent).transactionHash, invoices[2]!, parseEther("0.03"), parseEther("0.06"));
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

import { expect, it } from "vitest";
import { createTestClient, http, parseEther, toHex, zeroAddress, type Address } from "viem";
import { foundry } from "viem/chains";
import { createAndActivatePolicy } from "../apps/policy-cli/src/create-policy.ts";
import { preparePolicyPayment } from "../apps/policy-cli/src/pay-with-policy.ts";
import { payWithPolicyUserOperation } from "../apps/policy-cli/src/pay-with-userop.ts";
import { createPolicyChainGateway, zkPolicyAccountAbi } from "../apps/policy-api/src/chain.ts";
import { PolicyRepository } from "../apps/policy-api/src/repository.ts";
import { buildPolicyApi } from "../apps/policy-api/src/server.ts";
import { PolicyService } from "../apps/policy-api/src/service.ts";
import { LOCAL_OWNER_KEY, startLocalBundler } from "../scripts/lib/alto.ts";
import { findArtifact } from "../scripts/lib/local-payment.ts";

it("accounts sequential native, contract and token payments across UTC days", async () => {
  const harness = await startLocalBundler();
  const { publicClient, wallet } = harness;
  const repository = new PolicyRepository(":memory:");
  const app = buildPolicyApi(new PolicyService(repository, await createPolicyChainGateway(harness.rpcUrl), Buffer.alloc(32, 1)));
  try {
    const verifier = await publicClient.waitForTransactionReceipt({ hash: await wallet.deployContract(await findArtifact("HonkVerifier")) });
    const deployed = await publicClient.waitForTransactionReceipt({ hash: await wallet.deployContract({
      ...await findArtifact("ZkPolicyAccount"), args: [harness.owner.address, verifier.contractAddress!, harness.entryPointAddress],
    }) });
    const accountAddress = deployed.contractAddress!;
    const tokenArtifact = await findArtifact("PolicyToken");
    const tokenReceipt = await publicClient.waitForTransactionReceipt({ hash: await wallet.deployContract(tokenArtifact) });
    const tokenAddress = tokenReceipt.contractAddress!;
    const receiverReceipt = await publicClient.waitForTransactionReceipt({ hash: await wallet.deployContract(await findArtifact("PolicyPaymentReceiver")) });
    const contractAddress = receiverReceipt.contractAddress!;
    await publicClient.waitForTransactionReceipt({ hash: await wallet.writeContract({
      address: tokenAddress, abi: tokenArtifact.abi, functionName: "mint", args: [accountAddress, 1000n],
    }) });
    const recipient = "0x0000000000000000000000000000000000001234";
    await publicClient.waitForTransactionReceipt({ hash: await wallet.sendTransaction({ to: accountAddress, value: parseEther("2") }) });
    const apiUrl = await app.listen({ host: "127.0.0.1", port: 0 });
    const policy = await createAndActivatePolicy({ apiUrl, rpcUrl: harness.rpcUrl, accountAddress,
      ownerPrivateKey: LOCAL_OWNER_KEY, deadline: Math.floor(Date.now() / 1000) + 600,
      policy: { recipientEnabled: true, recipientAllowlist: [recipient, contractAddress], dailyEnabled: true,
        contractEnabled: true, contractAllowlist: [contractAddress],
        assetRules: [{ asset: zeroAddress, maxAmount: parseEther("0.1"), dailyLimit: parseEther("0.1") },
          { asset: tokenAddress, maxAmount: 100n, dailyLimit: 100n }] },
    });
    const input = { apiUrl, rpcUrl: harness.rpcUrl, bundlerUrl: harness.bundlerUrl, entryPointAddress: harness.entryPointAddress,
      accountAddress, ownerPrivateKey: LOCAL_OWNER_KEY, policyId: policy.policyId, token: policy.token };
    const daily = (asset: Address = zeroAddress) => publicClient.readContract({ address: accountAddress, abi: zkPolicyAccountAbi, functionName: "getDailySpend", args: [asset] });
    const dayId = (await publicClient.getBlock()).timestamp / 86400n;
    const accountBalanceBefore = await publicClient.getBalance({ address: accountAddress });
    const recipientBefore = await publicClient.getBalance({ address: recipient });
    await payWithPolicyUserOperation({ ...input, recipient, valueWei: parseEther("0.03") });
    expect(await daily()).toEqual([dayId, parseEther("0.03")]);
    const proofOnly = await preparePolicyPayment({ ...input, recipient, valueWei: parseEther("0.02") });
    expect(BigInt(proofOnly.proof.publicInputs[13]!)).toBe(dayId);
    expect(BigInt(proofOnly.proof.publicInputs[14]!)).toBe(parseEther("0.03"));
    expect(await daily()).toEqual([dayId, parseEther("0.03")]);
    await payWithPolicyUserOperation({ ...input, recipient, valueWei: parseEther("0.02") });
    expect(await daily()).toEqual([dayId, parseEther("0.05")]);
    expect(await publicClient.getBalance({ address: recipient })).toBe(recipientBefore + parseEther("0.05"));
    expect(accountBalanceBefore - await publicClient.getBalance({ address: accountAddress })).toBeGreaterThan(parseEther("0.05"));
    const contractBefore = await publicClient.getBalance({ address: contractAddress });
    await payWithPolicyUserOperation({ ...input, kind: 2, contractAddress, invoiceId: toHex(123n, { size: 32 }), valueWei: parseEther("0.01") });
    expect(await daily()).toEqual([dayId, parseEther("0.06")]);
    expect(await publicClient.getBalance({ address: contractAddress })).toBe(contractBefore + parseEther("0.01"));
    await payWithPolicyUserOperation({ ...input, kind: 1, tokenAddress, recipient, amount: 10n });
    expect(await daily(tokenAddress)).toEqual([dayId, 10n]);
    await payWithPolicyUserOperation({ ...input, kind: 1, tokenAddress, recipient, amount: 20n });
    expect(await daily(tokenAddress)).toEqual([dayId, 30n]);
    expect(await daily()).toEqual([dayId, parseEther("0.06")]);
    const tokenBalance = (address: Address) => publicClient.readContract({ address: tokenAddress, abi: tokenArtifact.abi, functionName: "balanceOf", args: [address] });
    expect(await tokenBalance(accountAddress)).toBe(970n);
    expect(await tokenBalance(recipient)).toBe(30n);
    const testClient = createTestClient({ chain: foundry, mode: "anvil", transport: http(harness.rpcUrl) });
    const nextDay = dayId + 1n;
    await testClient.setNextBlockTimestamp({ timestamp: nextDay * 86400n + 3600n });
    await testClient.mine({ blocks: 1 });
    expect(await daily()).toEqual([nextDay, 0n]);
    expect(await daily(tokenAddress)).toEqual([nextDay, 0n]);
    await payWithPolicyUserOperation({ ...input, recipient, valueWei: parseEther("0.04") });
    expect(await daily()).toEqual([nextDay, parseEther("0.04")]);
    expect(await publicClient.getBalance({ address: recipient })).toBe(recipientBefore + parseEther("0.09"));
    expect(await daily(tokenAddress)).toEqual([nextDay, 0n]);
    expect(await tokenBalance(accountAddress)).toBe(970n);
  } finally {
    await app.close();
    repository.close();
    await harness.stop();
  }
}, 120_000);

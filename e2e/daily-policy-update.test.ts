import { expect, it } from "vitest";
import { parseEther, zeroAddress, type Address } from "viem";
import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { z } from "zod";
import { createAndActivatePolicy } from "../apps/policy-cli/src/create-policy.ts";
import { preparePolicyPayment } from "../apps/policy-cli/src/pay-with-policy.ts";
import { payWithPolicyUserOperation } from "../apps/policy-cli/src/pay-with-userop.ts";
import { createPolicyChainGateway, zkPolicyAccountAbi } from "../apps/policy-api/src/chain.ts";
import { PolicyRepository } from "../apps/policy-api/src/repository.ts";
import { buildPolicyApi } from "../apps/policy-api/src/server.ts";
import { PolicyService } from "../apps/policy-api/src/service.ts";
import { LOCAL_OWNER_KEY, startLocalBundler } from "../scripts/lib/alto.ts";
import { findArtifact } from "../scripts/lib/local-payment.ts";

it("Owner updates daily budgets and re-registers native and token assets without resetting spend", async () => {
  const harness = await startLocalBundler();
  const { publicClient, wallet } = harness;
  const directory = await mkdtemp(join(tmpdir(), "daily-update-"));
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
    await publicClient.waitForTransactionReceipt({ hash: await wallet.writeContract({
      address: tokenAddress, abi: tokenArtifact.abi, functionName: "mint", args: [accountAddress, 1000n],
    }) });
    const recipient = "0x0000000000000000000000000000000000001234";
    await publicClient.waitForTransactionReceipt({ hash: await wallet.sendTransaction({ to: accountAddress, value: parseEther("2") }) });
    const apiUrl = await app.listen({ host: "127.0.0.1", port: 0 });
    const policy = await createAndActivatePolicy({ apiUrl, rpcUrl: harness.rpcUrl, accountAddress,
      ownerPrivateKey: LOCAL_OWNER_KEY, deadline: Math.floor(Date.now() / 1000) + 600,
      policy: { recipientEnabled: true, recipientAllowlist: [recipient], dailyEnabled: true,
        assetRules: [{ asset: zeroAddress, maxAmount: parseEther("0.1"), dailyLimit: parseEther("0.1") },
          { asset: tokenAddress, maxAmount: 100n, dailyLimit: 100n }] },
    });
    const input = { apiUrl, rpcUrl: harness.rpcUrl, bundlerUrl: harness.bundlerUrl, entryPointAddress: harness.entryPointAddress,
      accountAddress, ownerPrivateKey: LOCAL_OWNER_KEY, policyId: policy.policyId, token: policy.token };
    const daily = (asset: Address = zeroAddress) => publicClient.readContract({ address: accountAddress, abi: zkPolicyAccountAbi, functionName: "getDailySpend", args: [asset] });
    const dayId = (await publicClient.getBlock()).timestamp / 86400n;
    const recipientBefore = await publicClient.getBalance({ address: recipient });
    await payWithPolicyUserOperation({ ...input, recipient, valueWei: parseEther("0.05") });
    await payWithPolicyUserOperation({ ...input, kind: 1, tokenAddress, recipient, amount: 10n });
    expect(await daily()).toEqual([dayId, parseEther("0.05")]);
    expect(await daily(tokenAddress)).toEqual([dayId, 10n]);
    const nativeRule = { asset: zeroAddress, maxAmount: parseEther("0.1").toString(), dailyLimit: parseEther("0.2").toString() };
    const tokenRule = { asset: tokenAddress, maxAmount: "100", dailyLimit: "200" };
    const policyPath = join(directory, "policy.json");
    const update = async (assetRules: { asset: Address; maxAmount: string; dailyLimit: string }[], version: number) => {
      const previous = repository.getActive(policy.policyId)!;
      await writeFile(policyPath, JSON.stringify({ recipientEnabled: true, recipientAllowlist: [recipient], dailyEnabled: true, assetRules }), { mode: 0o600 });
      const result = await promisify(execFile)(process.execPath,
        ["--import", "tsx", "apps/policy-cli/src/update-policy.ts", "--policy-file", policyPath], {
          env: { ...process.env, POLICY_API_URL: apiUrl, POLICY_RPC_URL: harness.rpcUrl,
            POLICY_ACCOUNT_ADDRESS: accountAddress, POLICY_OWNER_PRIVATE_KEY: LOCAL_OWNER_KEY,
            POLICY_ID: policy.policyId, POLICY_TOKEN: policy.token },
        });
      const updated = z.object({ policyId: z.string().uuid(), policyVersion: z.number().int() }).parse(JSON.parse(result.stdout));
      expect(updated).toEqual({ policyId: policy.policyId, policyVersion: version });
      const active = repository.getActive(policy.policyId)!;
      expect(active.commitment).not.toBe(previous.commitment);
      expect(repository.getVersion(policy.policyId, version - 1)?.status).toBe("superseded");
      expect(active.commitment).toBe(await publicClient.readContract({ address: accountAddress, abi: zkPolicyAccountAbi, functionName: "policyCommitment" }));
      expect(result.stdout).not.toContain(policy.token);
    };
    await update([nativeRule, tokenRule], 2);
    expect(await daily()).toEqual([dayId, parseEther("0.05")]);
    const updatedProof = await preparePolicyPayment({ ...input, recipient, valueWei: parseEther("0.02") });
    expect(updatedProof.proof.policyVersion).toBe(2);
    expect(BigInt(updatedProof.proof.publicInputs[14]!)).toBe(parseEther("0.05"));
    const afterUpdate = await payWithPolicyUserOperation({ ...input, recipient, valueWei: parseEther("0.02") });
    expect(afterUpdate.policyVersion).toBe(2);
    expect(await daily()).toEqual([dayId, parseEther("0.07")]);
    await update([tokenRule], 3);
    expect(await daily()).toEqual([dayId, parseEther("0.07")]);
    await update([nativeRule, tokenRule], 4);
    const restoredNative = await payWithPolicyUserOperation({ ...input, recipient, valueWei: parseEther("0.01") });
    expect(restoredNative.policyVersion).toBe(4);
    expect(await daily()).toEqual([dayId, parseEther("0.08")]);
    await update([nativeRule], 5);
    expect(await daily(tokenAddress)).toEqual([dayId, 10n]);
    await update([nativeRule, tokenRule], 6);
    const restoredToken = await payWithPolicyUserOperation({ ...input, kind: 1, tokenAddress, recipient, amount: 20n });
    expect(restoredToken.policyVersion).toBe(6);
    expect(await daily(tokenAddress)).toEqual([dayId, 30n]);
    expect(await daily()).toEqual([dayId, parseEther("0.08")]);
    expect(await publicClient.getBalance({ address: recipient })).toBe(recipientBefore + parseEther("0.08"));
    const tokenBalance = (address: Address) => publicClient.readContract({ address: tokenAddress, abi: tokenArtifact.abi, functionName: "balanceOf", args: [address] });
    expect(await tokenBalance(accountAddress)).toBe(970n);
    expect(await tokenBalance(recipient)).toBe(30n);
  } finally {
    await app.close();
    repository.close();
    await harness.stop();
    await rm(directory, { recursive: true, force: true });
  }
}, 120_000);

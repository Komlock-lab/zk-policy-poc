import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { expect, it } from "vitest";
import { createPublicClient, createWalletClient, http, parseEther, zeroAddress } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { foundry } from "viem/chains";
import { z } from "zod";
import { createPolicyChainGateway, zkPolicyAccountAbi } from "../apps/policy-api/src/chain.ts";
import { decryptPolicySecret } from "../apps/policy-api/src/crypto.ts";
import { PolicyRepository } from "../apps/policy-api/src/repository.ts";
import { buildPolicyApi } from "../apps/policy-api/src/server.ts";
import { PolicyService } from "../apps/policy-api/src/service.ts";
import { payWithPolicyProof } from "../apps/policy-cli/src/pay-with-policy.ts";
import { startAnvil } from "../scripts/lib/anvil.ts";
import { findArtifact } from "../scripts/lib/local-payment.ts";

it("Owner CLI adds recipient B to A and pays B with the new active policy", async () => {
  const anvil = await startAnvil();
  const directory = await mkdtemp(join(tmpdir(), "recipient-policy-"));
  const ownerKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
  const owner = privateKeyToAccount(ownerKey);
  const publicClient = createPublicClient({ chain: foundry, transport: http(anvil.rpcUrl) });
  const wallet = createWalletClient({ account: owner, chain: foundry, transport: http(anvil.rpcUrl) });
  const repository = new PolicyRepository(":memory:");
  const encryptionKey = Buffer.alloc(32, 1);
  const app = buildPolicyApi(new PolicyService(repository, await createPolicyChainGateway(anvil.rpcUrl), encryptionKey));
  try {
    const entryPoint = await publicClient.waitForTransactionReceipt({ hash: await wallet.deployContract(await findArtifact("EntryPoint")) });
    const verifier = await publicClient.waitForTransactionReceipt({ hash: await wallet.deployContract(await findArtifact("HonkVerifier")) });
    const deployed = await publicClient.waitForTransactionReceipt({ hash: await wallet.deployContract({
      ...await findArtifact("ZkPolicyAccount"), args: [owner.address, verifier.contractAddress!, entryPoint.contractAddress!],
    }) });
    const accountAddress = deployed.contractAddress!;
    const apiUrl = await app.listen({ host: "127.0.0.1", port: 0 });
    const recipientA = "0x0000000000000000000000000000000000001111";
    const recipientB = "0x0000000000000000000000000000000000002222";
    const policyPath = join(directory, "policy.json");
    const policy = { maxValiditySeconds: "300", recipientEnabled: true, recipientAllowlist: [recipientA],
      assetRules: [{ asset: zeroAddress, maxAmount: parseEther("0.1").toString() }] };
    await writeFile(policyPath, JSON.stringify(policy), { mode: 0o600 });
    const env = { ...process.env, POLICY_API_URL: apiUrl, POLICY_RPC_URL: anvil.rpcUrl,
      POLICY_ACCOUNT_ADDRESS: accountAddress, POLICY_OWNER_PRIVATE_KEY: ownerKey };
    const createdCli = await promisify(execFile)(process.execPath,
      ["--import", "tsx", "apps/policy-cli/src/index.ts", "--policy-file", policyPath], { env });
    const created = z.object({ policyId: z.string().uuid(), policyVersion: z.literal(1), token: z.string() }).parse(JSON.parse(createdCli.stdout));
    const firstCommitment = repository.getActive(created.policyId)!.commitment;
    await publicClient.waitForTransactionReceipt({ hash: await wallet.sendTransaction({ to: accountAddress, value: parseEther("1") }) });
    const paymentInput = { apiUrl, rpcUrl: anvil.rpcUrl, accountAddress, ownerPrivateKey: ownerKey,
      policyId: created.policyId, token: created.token, valueWei: parseEther("0.01") } as const;
    await payWithPolicyProof({ ...paymentInput, recipient: recipientA });

    await writeFile(policyPath, JSON.stringify({ ...policy, recipientAllowlist: [recipientB, recipientA] }));
    const updatedCli = await promisify(execFile)(process.execPath,
      ["--import", "tsx", "apps/policy-cli/src/update-policy.ts", "--policy-file", policyPath],
      { env: { ...env, POLICY_ID: created.policyId, POLICY_TOKEN: created.token } });
    const updated = z.object({ policyId: z.string().uuid(), policyVersion: z.literal(2) }).parse(JSON.parse(updatedCli.stdout));
    expect(updated.policyId).toBe(created.policyId);
    const active = repository.getActive(created.policyId)!;
    expect(active.commitment).not.toBe(firstCommitment);
    expect(active.commitment).toBe(await publicClient.readContract({ address: accountAddress, abi: zkPolicyAccountAbi, functionName: "policyCommitment" }));
    expect(decryptPolicySecret(active, encryptionKey, created.policyId, 2).recipientAllowlist).toEqual([recipientA, recipientB]);
    const before = await publicClient.getBalance({ address: recipientB });
    const payment = await payWithPolicyProof({ ...paymentInput, recipient: recipientB });
    expect(payment.policyVersion).toBe(2);
    expect(await publicClient.getBalance({ address: recipientB })).toBe(before + parseEther("0.01"));
    expect(updatedCli.stdout).not.toContain(recipientA);
    expect(updatedCli.stdout).not.toContain(created.token);
  } finally {
    await app.close();
    repository.close();
    await anvil.stop();
    await rm(directory, { recursive: true, force: true });
  }
}, 120_000);

import { readdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  type Abi,
  type Address,
  type Hex,
  createPublicClient,
  createWalletClient,
  http,
  parseEther,
  toHex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { foundry } from "viem/chains";
import { z } from "zod";
import {
  createAndActivatePolicy,
  updateAndActivatePolicy,
} from "../apps/policy-cli/src/create-policy.ts";
import {
  payWithPolicyProof,
  validatePolicyPaymentProof,
} from "../apps/policy-cli/src/pay-with-policy.ts";
import { rotatePolicyToken } from "../apps/policy-cli/src/rotate-policy-token.ts";
import { createPolicyChainGateway, zkPolicyAccountAbi } from "../apps/policy-api/src/chain.ts";
import { PolicyRepository } from "../apps/policy-api/src/repository.ts";
import { buildPolicyApi } from "../apps/policy-api/src/server.ts";
import { PolicyService } from "../apps/policy-api/src/service.ts";
import { startAnvil, type AnvilInstance } from "../scripts/lib/anvil.ts";

const OWNER_PRIVATE_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" as Hex;
const RECIPIENT_PRIVATE_KEY =
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d" as Hex;
const artifactSchema = z.object({
  abi: z.array(z.unknown()),
  bytecode: z.object({ object: z.string().regex(/^0x[0-9a-fA-F]*$/) }),
});

async function artifact(contractName: string): Promise<{ abi: Abi; bytecode: Hex }> {
  for (const entry of await readdir(resolve(process.cwd(), "contracts/out"), { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const path = join(process.cwd(), "contracts/out", entry.name, `${contractName}.json`);
    try {
      const value = artifactSchema.parse(JSON.parse(await readFile(path, "utf8")));
      return { abi: value.abi as Abi, bytecode: value.bytecode.object as Hex };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
  throw new Error(`artifact not found: ${contractName}`);
}

describe("Phase 2 API-backed policy payment", () => {
  let anvil: AnvilInstance | undefined;

  afterEach(async () => anvil?.stop());

  it("pays with an updated policy and rejects over-limit, stale-proof, and mismatched-account flows", async () => {
    anvil = await startAnvil();
    const owner = privateKeyToAccount(OWNER_PRIVATE_KEY);
    const recipient = privateKeyToAccount(RECIPIENT_PRIVATE_KEY);
    const transport = http(anvil.rpcUrl);
    const publicClient = createPublicClient({ chain: foundry, transport });
    const ownerWallet = createWalletClient({ account: owner, chain: foundry, transport });
    const verifierArtifact = await artifact("HonkVerifier");
    const accountArtifact = await artifact("ZkPolicyAccount");
    const verifierHash = await ownerWallet.deployContract(verifierArtifact);
    const verifierReceipt = await publicClient.waitForTransactionReceipt({ hash: verifierHash });
    const accountHash = await ownerWallet.deployContract({
      ...accountArtifact,
      args: [owner.address, verifierReceipt.contractAddress!],
    });
    const accountReceipt = await publicClient.waitForTransactionReceipt({ hash: accountHash });
    const accountAddress = accountReceipt.contractAddress as Address;

    const repository = new PolicyRepository(":memory:");
    const chain = await createPolicyChainGateway(anvil.rpcUrl);
    const app = buildPolicyApi(new PolicyService(repository, chain, Buffer.alloc(32, 1)));
    const apiUrl = await app.listen({ host: "127.0.0.1", port: 0 });
    try {
      const initial = await createAndActivatePolicy({
        apiUrl,
        rpcUrl: anvil.rpcUrl,
        accountAddress,
        ownerPrivateKey: OWNER_PRIVATE_KEY,
        maxAmountWei: parseEther("0.05"),
        deadline: Math.floor(Date.now() / 1_000) + 600,
      });
      const updated = await updateAndActivatePolicy({
        apiUrl,
        rpcUrl: anvil.rpcUrl,
        accountAddress,
        ownerPrivateKey: OWNER_PRIVATE_KEY,
        policyId: initial.policyId,
        token: initial.token,
        maxAmountWei: parseEther("0.1"),
        deadline: Math.floor(Date.now() / 1_000) + 600,
      });
      expect(updated.policyVersion).toBe(2);
      const rotated = await rotatePolicyToken({
        apiUrl,
        accountAddress,
        ownerPrivateKey: OWNER_PRIVATE_KEY,
        expectedPolicyId: initial.policyId,
        deadline: Math.floor(Date.now() / 1_000) + 600,
      });

      const fundingHash = await ownerWallet.sendTransaction({
        to: accountAddress,
        value: parseEther("2"),
      });
      await publicClient.waitForTransactionReceipt({ hash: fundingHash });

      const paymentValue = parseEther("0.01");
      const successBalanceBefore = await publicClient.getBalance({ address: recipient.address });
      const payment = await payWithPolicyProof({
        apiUrl,
        rpcUrl: anvil.rpcUrl,
        accountAddress,
        ownerPrivateKey: OWNER_PRIVATE_KEY,
        policyId: initial.policyId,
        token: rotated.token,
        recipient: recipient.address,
        valueWei: paymentValue,
      });
      expect(payment).toMatchObject({ policyId: initial.policyId, policyVersion: 2 });
      expect(await publicClient.getBalance({ address: recipient.address })).toBe(
        successBalanceBefore + paymentValue,
      );

      const overLimitBalance = await publicClient.getBalance({ address: recipient.address });
      const nonceBeforeOverLimit = await publicClient.getTransactionCount({ address: owner.address });
      await expect(
        payWithPolicyProof({
          apiUrl,
          rpcUrl: anvil.rpcUrl,
          accountAddress,
          ownerPrivateKey: OWNER_PRIVATE_KEY,
          policyId: initial.policyId,
          token: rotated.token,
          recipient: recipient.address,
          valueWei: parseEther("1"),
        }),
      ).rejects.toThrow("policy API proof request failed with status 422");
      expect(await publicClient.getBalance({ address: recipient.address })).toBe(overLimitBalance);
      expect(await publicClient.getTransactionCount({ address: owner.address })).toBe(
        nonceBeforeOverLimit,
      );

      const oldCommitment = await publicClient.readContract({
        address: accountAddress,
        abi: zkPolicyAccountAbi,
        functionName: "policyCommitment",
      });
      const oldProofResponse = await fetch(`${apiUrl}/v1/policies/${initial.policyId}/proofs`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${rotated.token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ valueWei: paymentValue.toString() }),
      });
      expect(oldProofResponse.status).toBe(200);
      const oldProof = validatePolicyPaymentProof(await oldProofResponse.json(), {
        policyId: initial.policyId,
        valueWei: paymentValue,
        policyCommitment: oldCommitment,
      });
      const secondUpdate = await updateAndActivatePolicy({
        apiUrl,
        rpcUrl: anvil.rpcUrl,
        accountAddress,
        ownerPrivateKey: OWNER_PRIVATE_KEY,
        policyId: initial.policyId,
        token: rotated.token,
        maxAmountWei: parseEther("0.2"),
        deadline: Math.floor(Date.now() / 1_000) + 600,
      });
      expect(secondUpdate.policyVersion).toBe(3);

      const staleProofBalance = await publicClient.getBalance({ address: recipient.address });
      const staleProofHash = await ownerWallet.writeContract({
        address: accountAddress,
        abi: zkPolicyAccountAbi,
        functionName: "execute",
        args: [recipient.address, paymentValue, oldProof.proof],
        gas: 10_000_000n,
      });
      const staleProofReceipt = await publicClient.waitForTransactionReceipt({
        hash: staleProofHash,
      });
      expect(staleProofReceipt.status).toBe("reverted");
      expect(await publicClient.getBalance({ address: recipient.address })).toBe(staleProofBalance);

      const mismatchHash = await ownerWallet.writeContract({
        address: accountAddress,
        abi: zkPolicyAccountAbi,
        functionName: "updatePolicyCommitment",
        args: [toHex(1n, { size: 32 })],
      });
      await publicClient.waitForTransactionReceipt({ hash: mismatchHash });
      const mismatchBalance = await publicClient.getBalance({ address: recipient.address });
      const nonceBeforeMismatch = await publicClient.getTransactionCount({ address: owner.address });
      await expect(
        payWithPolicyProof({
          apiUrl,
          rpcUrl: anvil.rpcUrl,
          accountAddress,
          ownerPrivateKey: OWNER_PRIVATE_KEY,
          policyId: initial.policyId,
          token: rotated.token,
          recipient: recipient.address,
          valueWei: paymentValue,
        }),
      ).rejects.toThrow("policy API proof request failed with status 409");
      expect(await publicClient.getBalance({ address: recipient.address })).toBe(mismatchBalance);
      expect(await publicClient.getTransactionCount({ address: owner.address })).toBe(
        nonceBeforeMismatch,
      );
    } finally {
      await app.close();
      repository.close();
    }
  }, 240_000);
});

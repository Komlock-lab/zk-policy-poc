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
import { createPolicyChainGateway, zkPolicyAccountAbi } from "../apps/policy-api/src/chain.ts";
import { policyDomain, policyUpdateTypes } from "../apps/policy-api/src/eip712.ts";
import { PolicyRepository } from "../apps/policy-api/src/repository.ts";
import { buildPolicyApi } from "../apps/policy-api/src/server.ts";
import { PolicyService } from "../apps/policy-api/src/service.ts";
import { computePolicyCommitment, generateSalt } from "../packages/policy/src/index.ts";
import { startAnvil, type AnvilInstance } from "../scripts/lib/anvil.ts";

const OWNER_PRIVATE_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" as Hex;
const ATTACKER_PRIVATE_KEY =
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d" as Hex;
const artifactSchema = z.object({
  abi: z.array(z.unknown()),
  bytecode: z.object({ object: z.string().regex(/^0x[0-9a-fA-F]*$/) }),
});
const contextSchema = z.object({ policyId: z.string().uuid(), nonce: z.string() });
const pendingSchema = z.object({
  policyId: z.string().uuid(),
  policyVersion: z.number().int().positive(),
  status: z.literal("pending"),
  calldata: z.string().regex(/^0x[0-9a-fA-F]+$/).transform((value) => value as Hex),
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

describe("policy update", () => {
  let anvil: AnvilInstance | undefined;

  afterEach(async () => anvil?.stop());

  it("updates, replaces pending versions, and rejects unauthorized or unconfirmed transitions", async () => {
    anvil = await startAnvil();
    const owner = privateKeyToAccount(OWNER_PRIVATE_KEY);
    const attacker = privateKeyToAccount(ATTACKER_PRIVATE_KEY);
    const transport = http(anvil.rpcUrl);
    const publicClient = createPublicClient({ chain: foundry, transport });
    const ownerWallet = createWalletClient({ account: owner, chain: foundry, transport });
    const attackerWallet = createWalletClient({ account: attacker, chain: foundry, transport });
    const entryPointArtifact = await artifact("EntryPoint");
    const verifierArtifact = await artifact("HonkVerifier");
    const accountArtifact = await artifact("ZkPolicyAccount");
    const entryPointHash = await ownerWallet.deployContract(entryPointArtifact);
    const entryPointReceipt = await publicClient.waitForTransactionReceipt({ hash: entryPointHash });
    const verifierHash = await ownerWallet.deployContract(verifierArtifact);
    const verifierReceipt = await publicClient.waitForTransactionReceipt({ hash: verifierHash });
    const accountHash = await ownerWallet.deployContract({
      ...accountArtifact,
      args: [owner.address, verifierReceipt.contractAddress!, entryPointReceipt.contractAddress!],
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
        maxAmountWei: parseEther("0.1"),
        deadline: Math.floor(Date.now() / 1_000) + 600,
      });
      const updated = await updateAndActivatePolicy({
        apiUrl,
        rpcUrl: anvil.rpcUrl,
        accountAddress,
        ownerPrivateKey: OWNER_PRIVATE_KEY,
        policyId: initial.policyId,
        token: initial.token,
        maxAmountWei: parseEther("0.2"),
        deadline: Math.floor(Date.now() / 1_000) + 600,
      });
      expect(updated.policyVersion).toBe(2);
      expect(repository.getVersion(initial.policyId, 1)?.status).toBe("superseded");
      expect(repository.getVersion(initial.policyId, 2)?.status).toBe("active");
      expect(repository.getActive(initial.policyId)?.commitment).toBe(
        await publicClient.readContract({
          address: accountAddress,
          abi: zkPolicyAccountAbi,
          functionName: "policyCommitment",
        }),
      );

      const unauthorizedCommitment = toHex(1n, { size: 32 });
      await expect(
        attackerWallet.writeContract({
          address: accountAddress,
          abi: zkPolicyAccountAbi,
          functionName: "updatePolicyCommitment",
          args: [unauthorizedCommitment],
        }),
      ).rejects.toThrow();

      const registerPending = async (maxAmountWei: bigint) => {
        const contextResponse = await fetch(`${apiUrl}/v1/accounts/${accountAddress}/policy-context`);
        expect(contextResponse.status).toBe(200);
        const context = contextSchema.parse(await contextResponse.json());
        const salt = generateSalt();
        const commitment = toHex(await computePolicyCommitment(maxAmountWei, salt), { size: 32 });
        const deadline = Math.floor(Date.now() / 1_000) + 600;
        const signature = await owner.signTypedData({
          domain: policyDomain(accountAddress),
          types: policyUpdateTypes,
          primaryType: "PolicyUpdate",
          message: {
            policyId: context.policyId,
            account: accountAddress,
            policyCommitment: commitment,
            nonce: BigInt(context.nonce),
            deadline: BigInt(deadline),
          },
        });
        const payload = {
          account: accountAddress,
          maxAmountWei: maxAmountWei.toString(),
          salt: salt.toString(),
          policyCommitment: commitment,
          nonce: context.nonce,
          deadline,
          signature,
        };
        const response = await fetch(`${apiUrl}/v1/policies/${context.policyId}`, {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
        expect(response.status).toBe(200);
        return { context, payload, pending: pendingSchema.parse(await response.json()) };
      };

      const version3 = await registerPending(parseEther("0.3"));
      const replay = await fetch(`${apiUrl}/v1/policies/${version3.context.policyId}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(version3.payload),
      });
      expect(replay.status).toBe(409);
      expect(repository.getPending(initial.policyId)?.version).toBe(3);

      const version4 = await registerPending(parseEther("0.4"));
      expect(version4.pending.policyVersion).toBe(4);
      expect(repository.getVersion(initial.policyId, 2)?.status).toBe("active");
      expect(repository.getVersion(initial.policyId, 3)?.status).toBe("superseded");
      expect(repository.getVersion(initial.policyId, 4)?.status).toBe("pending");

      const missing = await fetch(`${apiUrl}/v1/policies/${initial.policyId}/activate`, {
        method: "POST",
        headers: { authorization: `Bearer ${initial.token}`, "content-type": "application/json" },
        body: JSON.stringify({ txHash: `0x${"ff".repeat(32)}` }),
      });
      expect(missing.status).toBe(409);
      expect(repository.getPending(initial.policyId)?.version).toBe(4);

      const wrongTargetHash = await ownerWallet.sendTransaction({
        to: attacker.address,
        data: version4.pending.calldata,
      });
      await publicClient.waitForTransactionReceipt({ hash: wrongTargetHash });
      const mismatch = await fetch(`${apiUrl}/v1/policies/${initial.policyId}/activate`, {
        method: "POST",
        headers: { authorization: `Bearer ${initial.token}`, "content-type": "application/json" },
        body: JSON.stringify({ txHash: wrongTargetHash }),
      });
      expect(mismatch.status).toBe(409);
      expect(repository.getVersion(initial.policyId, 2)?.status).toBe("active");
      expect(repository.getPending(initial.policyId)?.version).toBe(4);

      const updateHash = await ownerWallet.sendTransaction({ to: accountAddress, data: version4.pending.calldata });
      await publicClient.waitForTransactionReceipt({ hash: updateHash });
      const activation = await fetch(`${apiUrl}/v1/policies/${initial.policyId}/activate`, {
        method: "POST",
        headers: { authorization: `Bearer ${initial.token}`, "content-type": "application/json" },
        body: JSON.stringify({ txHash: updateHash }),
      });
      expect(activation.status).toBe(200);
      expect(repository.getVersion(initial.policyId, 2)?.status).toBe("superseded");
      expect(repository.getVersion(initial.policyId, 4)?.status).toBe("active");
    } finally {
      await app.close();
      repository.close();
    }
  });
});

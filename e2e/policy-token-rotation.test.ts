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
import { createAndActivatePolicy } from "../apps/policy-cli/src/create-policy.ts";
import { rotatePolicyToken } from "../apps/policy-cli/src/rotate-policy-token.ts";
import { createPolicyChainGateway } from "../apps/policy-api/src/chain.ts";
import {
  policyAccessTokenRotationTypes,
  policyDomain,
  policyUpdateTypes,
} from "../apps/policy-api/src/eip712.ts";
import { hashPolicyToken } from "../apps/policy-api/src/crypto.ts";
import { PolicyRepository } from "../apps/policy-api/src/repository.ts";
import { buildPolicyApi } from "../apps/policy-api/src/server.ts";
import { PolicyService } from "../apps/policy-api/src/service.ts";
import { computePolicyCommitment } from "../packages/policy/src/index.ts";
import { startAnvil, type AnvilInstance } from "../scripts/lib/anvil.ts";

const OWNER_PRIVATE_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" as Hex;
const ATTACKER_PRIVATE_KEY =
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d" as Hex;
const artifactSchema = z.object({
  abi: z.array(z.unknown()),
  bytecode: z.object({ object: z.string().regex(/^0x[0-9a-fA-F]*$/) }),
});
const rotationResponseSchema = z.object({
  policyId: z.string().uuid(),
  token: z.string().regex(/^zkp_[A-Za-z0-9_-]{43}$/),
});
const contextResponseSchema = z.object({
  policyId: z.string().uuid(),
  nonce: z.string().regex(/^(0|[1-9][0-9]*)$/),
});
const registrationResponseSchema = z.object({
  policyId: z.string().uuid(),
  policyVersion: z.literal(1),
  status: z.literal("pending"),
  token: z.string().regex(/^zkp_[A-Za-z0-9_-]{43}$/),
  calldata: z.string().regex(/^0x[0-9a-fA-F]+$/).transform((value) => value as Hex),
});
const proofResponseSchema = z.object({
  policyId: z.string().uuid(),
  policyVersion: z.number().int().positive(),
  proof: z.string().regex(/^0x[0-9a-fA-F]+$/),
  publicInputs: z.tuple([
    z.string().regex(/^0x[0-9a-fA-F]{64}$/),
    z.string().regex(/^0x[0-9a-fA-F]{64}$/),
  ]),
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

describe("policy token rotation", () => {
  let anvil: AnvilInstance | undefined;

  afterEach(async () => anvil?.stop());

  it("atomically switches access to a newly issued token", async () => {
    anvil = await startAnvil();
    const owner = privateKeyToAccount(OWNER_PRIVATE_KEY);
    const attacker = privateKeyToAccount(ATTACKER_PRIVATE_KEY);
    const transport = http(anvil.rpcUrl);
    const publicClient = createPublicClient({ chain: foundry, transport });
    const walletClient = createWalletClient({ account: owner, chain: foundry, transport });
    const verifierArtifact = await artifact("HonkVerifier");
    const accountArtifact = await artifact("ZkPolicyAccount");
    const verifierHash = await walletClient.deployContract(verifierArtifact);
    const verifierReceipt = await publicClient.waitForTransactionReceipt({ hash: verifierHash });
    expect(verifierReceipt.contractAddress).not.toBeNull();
    const accountHash = await walletClient.deployContract({
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
        maxAmountWei: parseEther("0.1"),
        deadline: Math.floor(Date.now() / 1_000) + 600,
      });
      const deadline = Math.floor(Date.now() / 1_000) + 600;
      const rotationMessage = {
        policyId: initial.policyId,
        account: accountAddress,
        nonce: 1n,
        deadline: BigInt(deadline),
      };
      const attackerSignature = await attacker.signTypedData({
        domain: policyDomain(accountAddress),
        types: policyAccessTokenRotationTypes,
        primaryType: "PolicyAccessTokenRotation",
        message: rotationMessage,
      });
      const unauthorized = await fetch(`${apiUrl}/v1/policies/${initial.policyId}/token`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          account: accountAddress,
          nonce: "1",
          deadline,
          signature: attackerSignature,
        }),
      });
      expect(unauthorized.status).toBe(401);
      expect(repository.getPolicy(initial.policyId)).toMatchObject({
        nonce: 1n,
        tokenHash: hashPolicyToken(initial.token),
      });

      const ownerSignature = await owner.signTypedData({
        domain: policyDomain(accountAddress),
        types: policyAccessTokenRotationTypes,
        primaryType: "PolicyAccessTokenRotation",
        message: rotationMessage,
      });
      const rotationPayload = {
        account: accountAddress,
        nonce: "1",
        deadline,
        signature: ownerSignature,
      };
      const firstRotationResponse = await fetch(`${apiUrl}/v1/policies/${initial.policyId}/token`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(rotationPayload),
      });
      expect(firstRotationResponse.status).toBe(200);
      const firstRotation = rotationResponseSchema.parse(await firstRotationResponse.json());
      const afterFirstRotation = repository.getPolicy(initial.policyId)!;
      expect(afterFirstRotation).toMatchObject({
        nonce: 2n,
        tokenHash: hashPolicyToken(firstRotation.token),
      });

      const replay = await fetch(`${apiUrl}/v1/policies/${initial.policyId}/token`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(rotationPayload),
      });
      expect(replay.status).toBe(409);
      expect(repository.getPolicy(initial.policyId)).toEqual(afterFirstRotation);

      const cliRotation = await rotatePolicyToken({
        apiUrl,
        accountAddress,
        ownerPrivateKey: OWNER_PRIVATE_KEY,
        deadline: Math.floor(Date.now() / 1_000) + 600,
      });
      expect(repository.getPolicy(initial.policyId)).toMatchObject({
        nonce: 3n,
        tokenHash: hashPolicyToken(cliRotation.token),
      });

      for (const oldToken of [initial.token, firstRotation.token]) {
        const rejected = await fetch(`${apiUrl}/v1/policies/${initial.policyId}/proofs`, {
          method: "POST",
          headers: { authorization: `Bearer ${oldToken}`, "content-type": "application/json" },
          body: JSON.stringify({ valueWei: parseEther("0.01").toString() }),
        });
        expect(rejected.status).toBe(401);
        expect(await rejected.json()).toEqual({ error: "INVALID_POLICY_TOKEN" });
      }

      const proofResponse = await fetch(`${apiUrl}/v1/policies/${initial.policyId}/proofs`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${cliRotation.token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ valueWei: parseEther("0.01").toString() }),
      });
      expect(proofResponse.status).toBe(200);
      const proof = proofResponseSchema.parse(await proofResponse.json());
      expect(proof).toMatchObject({ policyId: initial.policyId, policyVersion: 1 });
    } finally {
      await app.close();
      repository.close();
    }
  }, 120_000);

  it("recovers a lost initial token from account context while the policy is pending", async () => {
    anvil = await startAnvil();
    const owner = privateKeyToAccount(OWNER_PRIVATE_KEY);
    const transport = http(anvil.rpcUrl);
    const publicClient = createPublicClient({ chain: foundry, transport });
    const walletClient = createWalletClient({ account: owner, chain: foundry, transport });
    const verifierArtifact = await artifact("HonkVerifier");
    const accountArtifact = await artifact("ZkPolicyAccount");
    const verifierHash = await walletClient.deployContract(verifierArtifact);
    const verifierReceipt = await publicClient.waitForTransactionReceipt({ hash: verifierHash });
    const accountHash = await walletClient.deployContract({
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
      const contextResponse = await fetch(`${apiUrl}/v1/accounts/${accountAddress}/policy-context`);
      const context = contextResponseSchema.parse(await contextResponse.json());
      const maxAmount = parseEther("0.1");
      const salt = 123n;
      const commitment = toHex(await computePolicyCommitment(maxAmount, salt), { size: 32 });
      const deadline = Math.floor(Date.now() / 1_000) + 600;
      const signature = await owner.signTypedData({
        domain: policyDomain(accountAddress),
        types: policyUpdateTypes,
        primaryType: "PolicyUpdate",
        message: {
          policyId: context.policyId,
          account: accountAddress,
          policyCommitment: commitment,
          nonce: 0n,
          deadline: BigInt(deadline),
        },
      });
      const registrationResponse = await fetch(`${apiUrl}/v1/policies/${context.policyId}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          account: accountAddress,
          maxAmountWei: maxAmount.toString(),
          salt: salt.toString(),
          policyCommitment: commitment,
          nonce: "0",
          deadline,
          signature,
        }),
      });
      expect(registrationResponse.status).toBe(200);
      const registration = registrationResponseSchema.parse(await registrationResponse.json());
      expect(repository.getPending(context.policyId)?.version).toBe(1);

      const recovery = await rotatePolicyToken({
        apiUrl,
        accountAddress,
        ownerPrivateKey: OWNER_PRIVATE_KEY,
        deadline: Math.floor(Date.now() / 1_000) + 600,
      });
      expect(recovery.policyId).toBe(context.policyId);
      expect(recovery.token).not.toBe(registration.token);
      expect(repository.getPolicy(context.policyId)).toMatchObject({
        nonce: 2n,
        tokenHash: hashPolicyToken(recovery.token),
      });

      const txHash = await walletClient.sendTransaction({ to: accountAddress, data: registration.calldata });
      await publicClient.waitForTransactionReceipt({ hash: txHash });
      const activation = await fetch(`${apiUrl}/v1/policies/${context.policyId}/activate`, {
        method: "POST",
        headers: { authorization: `Bearer ${recovery.token}`, "content-type": "application/json" },
        body: JSON.stringify({ txHash }),
      });
      expect(activation.status).toBe(200);
      expect(repository.getActive(context.policyId)?.version).toBe(1);
    } finally {
      await app.close();
      repository.close();
    }
  });
});

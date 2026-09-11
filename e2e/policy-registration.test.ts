import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { decryptPolicySecret } from "../apps/policy-api/src/crypto.ts";
import { normalizePolicy } from "../packages/policy/src/index.ts";
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
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { foundry } from "viem/chains";
import { z } from "zod";
import { createPolicyChainGateway, zkPolicyAccountAbi } from "../apps/policy-api/src/chain.ts";
import { PolicyRepository } from "../apps/policy-api/src/repository.ts";
import { buildPolicyApi } from "../apps/policy-api/src/server.ts";
import { PolicyService } from "../apps/policy-api/src/service.ts";
import { startAnvil, type AnvilInstance } from "../scripts/lib/anvil.ts";

const OWNER_PRIVATE_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" as Hex;
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

describe("initial policy registration", () => {
  let anvil: AnvilInstance | undefined;

  afterEach(async () => anvil?.stop());

  it.each(["interactive", "arguments"])("registers an encrypted policy and activates its on-chain commitment via %s", async (mode) => {
    anvil = await startAnvil();
    const owner = privateKeyToAccount(OWNER_PRIVATE_KEY);
    const transport = http(anvil.rpcUrl);
    const publicClient = createPublicClient({ chain: foundry, transport });
    const walletClient = createWalletClient({ account: owner, chain: foundry, transport });
    const entryPointArtifact = await artifact("EntryPoint");
    const verifierArtifact = await artifact("HonkVerifier");
    const accountArtifact = await artifact("ZkPolicyAccount");
    const entryPointHash = await walletClient.deployContract(entryPointArtifact);
    const entryPointReceipt = await publicClient.waitForTransactionReceipt({ hash: entryPointHash });
    const verifierHash = await walletClient.deployContract(verifierArtifact);
    const verifierReceipt = await publicClient.waitForTransactionReceipt({ hash: verifierHash });
    expect(verifierReceipt.contractAddress).not.toBeNull();
    const accountHash = await walletClient.deployContract({
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
      const execution = promisify(execFile)(process.execPath,
        ["--import", "tsx", "apps/policy-cli/src/index.ts", ...(mode === "arguments" ? [parseEther("0.1").toString(), "300"] : [])],
        { env: { ...process.env, POLICY_API_URL: apiUrl, POLICY_RPC_URL: anvil.rpcUrl,
          POLICY_ACCOUNT_ADDRESS: accountAddress, POLICY_OWNER_PRIVATE_KEY: OWNER_PRIVATE_KEY } });
      if (mode === "interactive") execution.child.stdin!.end("0.1\n");
      const { stdout } = await execution;
      const result = z.object({ policyId: z.string().uuid(), policyVersion: z.literal(1), commitment: z.string(), txHash: z.string().regex(/^0x[0-9a-fA-F]{64}$/) }).strict().parse(JSON.parse(stdout));
      expect(stdout).not.toContain(OWNER_PRIVATE_KEY);
      expect(stdout).not.toContain("zkp_");
      const active = repository.getActive(result.policyId)!;
      const secret = normalizePolicy(decryptPolicySecret(active, Buffer.alloc(32, 1), result.policyId, 1));
      expect(secret.maxValiditySeconds).toBe(300n);
      expect(secret.assetRules[0]!.maxAmount).toBe(parseEther("0.1"));
      expect(active.ciphertext.toString("utf8")).not.toContain("maxValiditySeconds");
      const [configured, commitment] = await Promise.all([
        publicClient.readContract({ address: accountAddress, abi: zkPolicyAccountAbi, functionName: "policyConfigured" }),
        publicClient.readContract({ address: accountAddress, abi: zkPolicyAccountAbi, functionName: "policyCommitment" }),
      ]);
      expect(configured).toBe(true);
      expect(repository.getActive(result.policyId)?.commitment).toBe(commitment);
      expect(result.commitment).toBe(commitment);
      expect((await publicClient.getTransactionReceipt({ hash: result.txHash as Hex })).status).toBe("success");
    } finally {
      await app.close();
      repository.close();
    }
  });
});

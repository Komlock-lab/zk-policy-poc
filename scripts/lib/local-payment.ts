import { readdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import {
  type Abi,
  type Address,
  type Hex,
  createPublicClient,
  createWalletClient,
  http,
  parseEther, toHex, zeroAddress,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { foundry } from "viem/chains";
import { z } from "zod";

import {
  computePolicyCommitment,
  fieldElementSchema,
  parseCircuitAmount,
} from "../../packages/policy/src/index.ts";
import { generateSpendLimitProof } from "../../packages/prover/src/index.ts";

const OWNER_PRIVATE_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const RECIPIENT_PRIVATE_KEY =
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";

const artifactSchema = z.object({
  abi: z.array(z.unknown()),
  bytecode: z.object({ object: z.string().regex(/^0x[0-9a-fA-F]*$/) }),
});

export interface LocalPaymentInput {
  rpcUrl: string;
  value: bigint;
  maxAmount: bigint;
  salt: bigint;
}

export interface LocalPaymentResult {
  accountAddress: Address;
  entryPointAddress: Address;
  recipientAddress: Address;
  recipientBalanceBefore: bigint;
  recipientBalanceAfter: bigint;
  transactionHash: Hex;
  verifierAddress: Address;
}

export function localRecipientAddress(): Address {
  return privateKeyToAccount(RECIPIENT_PRIVATE_KEY).address;
}

export function assertLocalAnvilRpc(rpcUrl: string): void {
  const url = new URL(rpcUrl);
  if (url.protocol !== "http:" || url.hostname !== "127.0.0.1") {
    throw new Error("only a local Anvil RPC URL is allowed");
  }
}

export async function findArtifact(contractName: string): Promise<{ abi: Abi; bytecode: Hex }> {
  const outDirectory = resolve(process.cwd(), "contracts/out");
  const directories = await readdir(outDirectory, { withFileTypes: true });

  for (const directory of directories) {
    if (!directory.isDirectory()) continue;
    const path = join(outDirectory, directory.name, `${contractName}.json`);
    try {
      const artifact = artifactSchema.parse(JSON.parse(await readFile(path, "utf8")));
      return { abi: artifact.abi as Abi, bytecode: artifact.bytecode.object as Hex };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") continue;
      throw error;
    }
  }

  throw new Error(`contract artifact not found: ${contractName}`);
}

export async function runLocalPayment(input: LocalPaymentInput): Promise<LocalPaymentResult> {
  assertLocalAnvilRpc(input.rpcUrl);
  const value = parseCircuitAmount(input.value);
  const maxAmount = parseCircuitAmount(input.maxAmount);
  const salt = fieldElementSchema.parse(input.salt);
  const owner = privateKeyToAccount(OWNER_PRIVATE_KEY);
  const recipientAddress = localRecipientAddress();
  const transport = http(input.rpcUrl);
  const publicClient = createPublicClient({ chain: foundry, transport });
  const walletClient = createWalletClient({ account: owner, chain: foundry, transport });

  if ((await publicClient.getChainId()) !== 31_337) {
    throw new Error("local chain id must be 31337");
  }

  const policyCommitment = await computePolicyCommitment(maxAmount, salt);

  const entryPointArtifact = await findArtifact("EntryPoint");
  const verifierArtifact = await findArtifact("HonkVerifier");
  const accountArtifact = await findArtifact("ZkPolicyAccount");

  const entryPointDeploymentHash = await walletClient.deployContract(entryPointArtifact);
  const entryPointReceipt = await publicClient.waitForTransactionReceipt({
    hash: entryPointDeploymentHash,
  });
  if (entryPointReceipt.contractAddress == null) {
    throw new Error("EntryPoint deployment did not return a contract address");
  }

  const verifierDeploymentHash = await walletClient.deployContract({
    abi: verifierArtifact.abi,
    bytecode: verifierArtifact.bytecode,
  });
  const verifierReceipt = await publicClient.waitForTransactionReceipt({
    hash: verifierDeploymentHash,
  });
  if (verifierReceipt.contractAddress == null) {
    throw new Error("verifier deployment did not return a contract address");
  }

  const accountDeploymentHash = await walletClient.deployContract({
    abi: accountArtifact.abi,
    bytecode: accountArtifact.bytecode,
    args: [owner.address, verifierReceipt.contractAddress, entryPointReceipt.contractAddress],
  });
  const accountReceipt = await publicClient.waitForTransactionReceipt({
    hash: accountDeploymentHash,
  });
  if (accountReceipt.contractAddress == null) {
    throw new Error("account deployment did not return a contract address");
  }

  const policyUpdateHash = await walletClient.writeContract({
    abi: accountArtifact.abi,
    address: accountReceipt.contractAddress,
    functionName: "updatePolicyCommitment",
    args: [toHex(policyCommitment, { size: 32 })],
  });
  await publicClient.waitForTransactionReceipt({ hash: policyUpdateHash });

  const fundingHash = await walletClient.sendTransaction({
    to: accountReceipt.contractAddress,
    value: parseEther("1"),
  });
  await publicClient.waitForTransactionReceipt({ hash: fundingHash });

  const block = await publicClient.getBlock();
  const issuedAt = block.timestamp;
  const validUntil = issuedAt + 300n;
  const proof = await generateSpendLimitProof({ value, maxAmount, salt, policyCommitment, context: {
    kind: 0, chainId: 31337n, account: accountReceipt.contractAddress, recipient: recipientAddress, asset: zeroAddress,
    target: recipientAddress, invoiceId: toHex(0n, { size: 32 }), issuedAt, validUntil, dayId: issuedAt / 86400n, spentBefore: 0n,
  } });
  const recipientBalanceBefore = await publicClient.getBalance({ address: recipientAddress });
  const transactionHash = await walletClient.writeContract({
    abi: accountArtifact.abi,
    address: accountReceipt.contractAddress,
    functionName: "execute",
    args: [recipientAddress, value, issuedAt, validUntil, proof.proof],
  });
  const paymentReceipt = await publicClient.waitForTransactionReceipt({ hash: transactionHash });
  if (paymentReceipt.status !== "success") {
    throw new Error("local payment reverted");
  }
  const recipientBalanceAfter = await publicClient.getBalance({ address: recipientAddress });

  if (recipientBalanceAfter - recipientBalanceBefore !== value) {
    throw new Error("recipient balance delta does not match the payment value");
  }

  return {
    accountAddress: accountReceipt.contractAddress,
    entryPointAddress: entryPointReceipt.contractAddress,
    recipientAddress,
    recipientBalanceBefore,
    recipientBalanceAfter,
    transactionHash,
    verifierAddress: verifierReceipt.contractAddress,
  };
}

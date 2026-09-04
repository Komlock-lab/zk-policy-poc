import {
  type Address,
  type Hex,
  createPublicClient,
  createWalletClient,
  getAddress,
  http,
  isAddressEqual,
  toHex,
  zeroAddress,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { foundry } from "viem/chains";
import { z } from "zod";
import { parseCircuitAmount } from "../../../packages/policy/src/index.ts";
import { zkPolicyAccountAbi } from "../../policy-api/src/chain.ts";

const policyIdSchema = z.string().uuid();
const tokenSchema = z.string().regex(/^zkp_[A-Za-z0-9_-]{43}$/);
const addressSchema = z
  .string()
  .regex(/^0x[0-9a-fA-F]{40}$/)
  .transform((value) => getAddress(value))
  .refine((value) => value !== zeroAddress, "address must not be zero");
const privateKeySchema = z
  .string()
  .regex(/^0x[0-9a-fA-F]{64}$/)
  .transform((value) => value as Hex);
const proofResponseSchema = z
  .object({
    policyId: policyIdSchema,
    policyVersion: z.number().int().positive(),
    proof: z
      .string()
      .regex(/^0x(?:[0-9a-fA-F]{2})+$/)
      .transform((value) => value as Hex),
    publicInputs: z.tuple([
      z.string().regex(/^0x[0-9a-fA-F]{64}$/).transform((value) => value as Hex),
      z.string().regex(/^0x[0-9a-fA-F]{64}$/).transform((value) => value as Hex),
    ]),
  })
  .strict();

export interface PolicyPaymentProof {
  policyId: string;
  policyVersion: number;
  proof: Hex;
  publicInputs: readonly [Hex, Hex];
}

export function assertLocalPaymentUrl(value: string, label: string): void {
  const url = new URL(value);
  if (url.protocol !== "http:" || url.hostname !== "127.0.0.1") {
    throw new Error(`${label} must use local HTTP address 127.0.0.1`);
  }
}

export function validatePolicyPaymentProof(
  value: unknown,
  expected: { policyId: string; valueWei: bigint; policyCommitment: Hex },
): PolicyPaymentProof {
  const proof = proofResponseSchema.parse(value);
  const expectedValue = toHex(expected.valueWei, { size: 32 });
  if (proof.policyId !== expected.policyId) {
    throw new Error("policy API returned a proof for an unexpected policy");
  }
  if (proof.publicInputs[0].toLowerCase() !== expectedValue.toLowerCase()) {
    throw new Error("policy proof value does not match the requested payment");
  }
  if (proof.publicInputs[1].toLowerCase() !== expected.policyCommitment.toLowerCase()) {
    throw new Error("policy proof commitment does not match the account");
  }
  return proof;
}

async function proofResponse(response: Response): Promise<unknown> {
  const body = (await response.json()) as unknown;
  if (!response.ok) {
    throw new Error(`policy API proof request failed with status ${response.status}`);
  }
  return body;
}

export async function payWithPolicyProof(input: {
  apiUrl: string;
  rpcUrl: string;
  accountAddress: Address;
  ownerPrivateKey: Hex;
  policyId: string;
  token: string;
  recipient: Address;
  valueWei: bigint;
}): Promise<{ policyId: string; policyVersion: number; transactionHash: Hex }> {
  assertLocalPaymentUrl(input.apiUrl, "apiUrl");
  assertLocalPaymentUrl(input.rpcUrl, "rpcUrl");
  const policyId = policyIdSchema.parse(input.policyId);
  const token = tokenSchema.parse(input.token);
  const accountAddress = addressSchema.parse(input.accountAddress);
  const recipient = addressSchema.parse(input.recipient);
  const ownerPrivateKey = privateKeySchema.parse(input.ownerPrivateKey);
  const valueWei = parseCircuitAmount(input.valueWei);
  const owner = privateKeyToAccount(ownerPrivateKey);
  const transport = http(input.rpcUrl);
  const publicClient = createPublicClient({ chain: foundry, transport });
  const walletClient = createWalletClient({ account: owner, chain: foundry, transport });

  if ((await publicClient.getChainId()) !== 31_337) {
    throw new Error("local chain id must be 31337");
  }

  const response = await fetch(`${input.apiUrl}/v1/policies/${policyId}/proofs`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ valueWei: valueWei.toString() }),
  });
  const responseBody = await proofResponse(response);

  const [accountOwner, configured, policyCommitment] = await Promise.all([
    publicClient.readContract({
      address: accountAddress,
      abi: zkPolicyAccountAbi,
      functionName: "owner",
    }),
    publicClient.readContract({
      address: accountAddress,
      abi: zkPolicyAccountAbi,
      functionName: "policyConfigured",
    }),
    publicClient.readContract({
      address: accountAddress,
      abi: zkPolicyAccountAbi,
      functionName: "policyCommitment",
    }),
  ]);
  if (!isAddressEqual(accountOwner, owner.address)) {
    throw new Error("payment signer is not the account owner");
  }
  if (!configured) throw new Error("account policy is not configured");

  const proof = validatePolicyPaymentProof(responseBody, {
    policyId,
    valueWei,
    policyCommitment,
  });
  const transactionHash = await walletClient.writeContract({
    address: accountAddress,
    abi: zkPolicyAccountAbi,
    functionName: "execute",
    args: [recipient, valueWei, proof.proof],
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash: transactionHash });
  if (receipt.status !== "success") throw new Error("policy payment transaction reverted");

  return { policyId, policyVersion: proof.policyVersion, transactionHash };
}

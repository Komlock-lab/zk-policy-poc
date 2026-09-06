import {
  type Address,
  type Hex,
  createPublicClient,
  createWalletClient,
  encodeFunctionData,
  getAddress,
  http,
  toHex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { foundry } from "viem/chains";
import { z } from "zod";
import { computePolicyCommitment, generateSalt, parseCircuitAmount, normalizePolicy, serializePolicy, type PolicyInput } from "../../../packages/policy/src/index.ts";
import { policyDomain, policyUpdateTypes } from "../../policy-api/src/eip712.ts";
import { zkPolicyAccountAbi } from "../../policy-api/src/chain.ts";

const policyIdSchema = z.string().uuid();
const contextResponseSchema = z.object({
  policyId: policyIdSchema,
  nonce: z.string().regex(/^(0|[1-9][0-9]*)$/),
});
const registrationResponseSchema = z.object({
  policyId: policyIdSchema,
  policyVersion: z.number().int().positive(),
  status: z.literal("pending"),
  token: z.string().regex(/^zkp_[A-Za-z0-9_-]{43}$/),
  calldata: z.string().regex(/^0x[0-9a-fA-F]+$/).transform((value) => value as Hex),
});
const updateResponseSchema = registrationResponseSchema.omit({ token: true });
const activationResponseSchema = z.object({
  policyVersion: z.number().int().positive(),
  status: z.literal("active"),
});

export function verifyPendingRegistration(
  registration: z.infer<typeof updateResponseSchema>,
  expected: { policyId: string; policyVersion?: number; commitment: Hex },
): Hex {
  if (
    registration.policyId !== expected.policyId ||
    (expected.policyVersion !== undefined && registration.policyVersion !== expected.policyVersion)
  ) {
    throw new Error("policy API returned unexpected policy identity or version");
  }
  const expectedCalldata = encodeFunctionData({
    abi: zkPolicyAccountAbi,
    functionName: "updatePolicyCommitment",
    args: [expected.commitment],
  });
  if (registration.calldata.toLowerCase() !== expectedCalldata.toLowerCase()) {
    throw new Error("policy API returned calldata that does not match the signed commitment");
  }
  return expectedCalldata;
}

export async function waitForPolicyUpdateReceipt(input: {
  policyVersion: number;
  txHash: Hex;
  wait: () => Promise<{ status: "success" | "reverted" }>;
}): Promise<void> {
  let receipt: { status: "success" | "reverted" };
  try {
    receipt = await input.wait();
  } catch (cause) {
    throw new Error(
      `policy version ${input.policyVersion} remains pending; transaction ${input.txHash} status is unknown`,
      { cause },
    );
  }
  if (receipt.status !== "success") {
    throw new Error(
      `policy version ${input.policyVersion} remains pending; transaction ${input.txHash} reverted`,
    );
  }
}

function assertLocalUrl(value: string, label: string): void {
  const url = new URL(value);
  if (url.protocol !== "http:" || url.hostname !== "127.0.0.1") {
    throw new Error(`${label} must use local HTTP address 127.0.0.1`);
  }
}

async function json<T>(response: Response, schema: z.ZodType<T>): Promise<T> {
  const body = (await response.json()) as unknown;
  if (!response.ok) throw new Error(`policy API request failed with status ${response.status}`);
  return schema.parse(body);
}

export async function createAndActivatePolicy(input: {
  apiUrl: string;
  rpcUrl: string;
  accountAddress: Address;
  ownerPrivateKey: Hex;
  maxAmountWei: bigint;
  maxValiditySeconds?: bigint;
  policy?: Omit<PolicyInput, "salt">;
  deadline: number;
}): Promise<{ policyId: string; policyVersion: number; token: string; txHash: Hex }> {
  assertLocalUrl(input.apiUrl, "apiUrl");
  assertLocalUrl(input.rpcUrl, "rpcUrl");
  const owner = privateKeyToAccount(input.ownerPrivateKey);
  const accountAddress = getAddress(input.accountAddress);
  const maxAmount = parseCircuitAmount(input.maxAmountWei);
  const transport = http(input.rpcUrl);
  const publicClient = createPublicClient({ chain: foundry, transport });
  const walletClient = createWalletClient({ account: owner, chain: foundry, transport });
  if ((await publicClient.getChainId()) !== 31_337) throw new Error("local chain id must be 31337");

  const context = await json(
    await fetch(`${input.apiUrl}/v1/accounts/${accountAddress}/policy-context`),
    contextResponseSchema,
  );
  const salt = generateSalt();
  const policy = normalizePolicy(input.policy ? { ...input.policy, salt } : { maxAmountWei: maxAmount, salt, maxValiditySeconds: input.maxValiditySeconds });
  const commitment = toHex(await computePolicyCommitment(policy), { size: 32 });
  const message = {
    policyId: context.policyId,
    account: accountAddress,
    policyCommitment: commitment,
    nonce: BigInt(context.nonce),
    deadline: BigInt(input.deadline),
  };
  const signature = await owner.signTypedData({
    domain: policyDomain(accountAddress),
    types: policyUpdateTypes,
    primaryType: "PolicyUpdate",
    message,
  });
  const registration = await json(
    await fetch(`${input.apiUrl}/v1/policies/${context.policyId}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        account: accountAddress,
        policy: serializePolicy(policy),
        salt: salt.toString(),
        policyCommitment: commitment,
        nonce: context.nonce,
        deadline: input.deadline,
        signature,
      }),
    }),
    registrationResponseSchema,
  );
  const expectedCalldata = verifyPendingRegistration(registration, {
    policyId: context.policyId,
    policyVersion: 1,
    commitment,
  });
  const txHash = await walletClient.sendTransaction({ to: accountAddress, data: expectedCalldata });
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  if (receipt.status !== "success") throw new Error("policy update transaction reverted");
  const activation = await json(
    await fetch(`${input.apiUrl}/v1/policies/${context.policyId}/activate`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${registration.token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ txHash }),
    }),
    activationResponseSchema,
  );
  if (activation.policyVersion !== registration.policyVersion) {
    throw new Error("policy API activated an unexpected policy version");
  }
  return {
    policyId: registration.policyId,
    policyVersion: registration.policyVersion,
    token: registration.token,
    txHash,
  };
}

export async function updateAndActivatePolicy(input: {
  apiUrl: string;
  rpcUrl: string;
  accountAddress: Address;
  ownerPrivateKey: Hex;
  policyId: string;
  token: string;
  maxAmountWei: bigint;
  maxValiditySeconds?: bigint;
  policy?: Omit<PolicyInput, "salt">;
  deadline: number;
}): Promise<{ policyId: string; policyVersion: number; txHash: Hex }> {
  assertLocalUrl(input.apiUrl, "apiUrl");
  assertLocalUrl(input.rpcUrl, "rpcUrl");
  const policyId = policyIdSchema.parse(input.policyId);
  const token = z.string().regex(/^zkp_[A-Za-z0-9_-]{43}$/).parse(input.token);
  const owner = privateKeyToAccount(input.ownerPrivateKey);
  const accountAddress = getAddress(input.accountAddress);
  const maxAmount = parseCircuitAmount(input.maxAmountWei);
  const transport = http(input.rpcUrl);
  const publicClient = createPublicClient({ chain: foundry, transport });
  const walletClient = createWalletClient({ account: owner, chain: foundry, transport });
  if ((await publicClient.getChainId()) !== 31_337) throw new Error("local chain id must be 31337");

  const context = await json(
    await fetch(`${input.apiUrl}/v1/accounts/${accountAddress}/policy-context`),
    contextResponseSchema,
  );
  if (context.policyId !== policyId) throw new Error("policy context does not match the requested policy");
  const salt = generateSalt();
  const policy = normalizePolicy(input.policy ? { ...input.policy, salt } : { maxAmountWei: maxAmount, salt, maxValiditySeconds: input.maxValiditySeconds });
  const commitment = toHex(await computePolicyCommitment(policy), { size: 32 });
  const signature = await owner.signTypedData({
    domain: policyDomain(accountAddress),
    types: policyUpdateTypes,
    primaryType: "PolicyUpdate",
    message: {
      policyId,
      account: accountAddress,
      policyCommitment: commitment,
      nonce: BigInt(context.nonce),
      deadline: BigInt(input.deadline),
    },
  });
  const registration = await json(
    await fetch(`${input.apiUrl}/v1/policies/${policyId}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        account: accountAddress,
        policy: serializePolicy(policy),
        salt: salt.toString(),
        policyCommitment: commitment,
        nonce: context.nonce,
        deadline: input.deadline,
        signature,
      }),
    }),
    updateResponseSchema,
  );
  const expectedCalldata = verifyPendingRegistration(registration, {
    policyId,
    commitment,
  });

  let txHash: Hex;
  try {
    txHash = await walletClient.sendTransaction({ to: accountAddress, data: expectedCalldata });
  } catch (cause) {
    throw new Error(`policy version ${registration.policyVersion} remains pending; transaction was not submitted`, {
      cause,
    });
  }
  await waitForPolicyUpdateReceipt({
    policyVersion: registration.policyVersion,
    txHash,
    wait: () => publicClient.waitForTransactionReceipt({ hash: txHash }),
  });
  try {
    const activation = await json(
      await fetch(`${input.apiUrl}/v1/policies/${policyId}/activate`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ txHash }),
      }),
      activationResponseSchema,
    );
    if (activation.policyVersion !== registration.policyVersion) {
      throw new Error("policy API activated an unexpected policy version");
    }
  } catch (cause) {
    throw new Error(`policy version ${registration.policyVersion} remains pending after transaction ${txHash}`, {
      cause,
    });
  }
  return { policyId, policyVersion: registration.policyVersion, txHash };
}

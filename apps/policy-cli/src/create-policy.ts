import {
  type Address,
  type Hex,
  createPublicClient,
  createWalletClient,
  getAddress,
  http,
  toHex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { foundry } from "viem/chains";
import { z } from "zod";
import { computePolicyCommitment, generateSalt, parseCircuitAmount } from "../../../packages/policy/src/index.ts";
import { policyDomain, policyUpdateTypes } from "../../policy-api/src/eip712.ts";

const policyIdSchema = z.string().uuid();
const contextResponseSchema = z.object({
  policyId: policyIdSchema,
  nonce: z.string().regex(/^(0|[1-9][0-9]*)$/),
});
const registrationResponseSchema = z.object({
  policyId: policyIdSchema,
  policyVersion: z.number().int().positive(),
  token: z.string().regex(/^zkp_[A-Za-z0-9_-]{43}$/),
  calldata: z.string().regex(/^0x[0-9a-fA-F]+$/).transform((value) => value as Hex),
});
const activationResponseSchema = z.object({
  policyVersion: z.number().int().positive(),
  status: z.literal("active"),
});

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
  const commitment = toHex(await computePolicyCommitment(maxAmount, salt), { size: 32 });
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
        maxAmountWei: maxAmount.toString(),
        salt: salt.toString(),
        policyCommitment: commitment,
        nonce: context.nonce,
        deadline: input.deadline,
        signature,
      }),
    }),
    registrationResponseSchema,
  );
  const txHash = await walletClient.sendTransaction({ to: accountAddress, data: registration.calldata });
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  if (receipt.status !== "success") throw new Error("policy update transaction reverted");
  await json(
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
  return {
    policyId: registration.policyId,
    policyVersion: registration.policyVersion,
    token: registration.token,
    txHash,
  };
}

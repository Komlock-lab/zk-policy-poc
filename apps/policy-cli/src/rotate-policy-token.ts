import { type Address, type Hex, getAddress } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { z } from "zod";
import {
  policyAccessTokenRotationTypes,
  policyDomain,
} from "../../policy-api/src/eip712.ts";

const policyIdSchema = z.string().uuid();
const contextResponseSchema = z.object({
  policyId: policyIdSchema,
  nonce: z.string().regex(/^(0|[1-9][0-9]*)$/).refine((value) => BigInt(value) < 1n << 256n),
});
const rotationResponseSchema = z.object({
  policyId: policyIdSchema,
  token: z.string().regex(/^zkp_[A-Za-z0-9_-]{43}$/),
});

function assertLocalUrl(value: string): void {
  const url = new URL(value);
  if (url.protocol !== "http:" || url.hostname !== "127.0.0.1") {
    throw new Error("apiUrl must use local HTTP address 127.0.0.1");
  }
}

async function json<T>(response: Response, schema: z.ZodType<T>): Promise<T> {
  const body = (await response.json()) as unknown;
  if (!response.ok) throw new Error(`policy API request failed with status ${response.status}`);
  return schema.parse(body);
}

export async function rotatePolicyToken(input: {
  apiUrl: string;
  accountAddress: Address;
  ownerPrivateKey: Hex;
  expectedPolicyId?: string;
  deadline: number;
}): Promise<{ policyId: string; token: string }> {
  assertLocalUrl(input.apiUrl);
  const expectedPolicyId = input.expectedPolicyId === undefined
    ? undefined
    : policyIdSchema.parse(input.expectedPolicyId);
  const accountAddress = getAddress(input.accountAddress);
  const owner = privateKeyToAccount(input.ownerPrivateKey);
  const deadline = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).parse(input.deadline);

  const context = await json(
    await fetch(`${input.apiUrl}/v1/accounts/${accountAddress}/policy-context`),
    contextResponseSchema,
  );
  if (expectedPolicyId !== undefined && context.policyId !== expectedPolicyId) {
    throw new Error("policy context does not match the requested policy");
  }
  const policyId = context.policyId;
  const signature = await owner.signTypedData({
    domain: policyDomain(accountAddress),
    types: policyAccessTokenRotationTypes,
    primaryType: "PolicyAccessTokenRotation",
    message: {
      policyId,
      account: accountAddress,
      nonce: BigInt(context.nonce),
      deadline: BigInt(deadline),
    },
  });
  const rotation = await json(
    await fetch(`${input.apiUrl}/v1/policies/${policyId}/token`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        account: accountAddress,
        nonce: context.nonce,
        deadline,
        signature,
      }),
    }),
    rotationResponseSchema,
  );
  if (rotation.policyId !== policyId) {
    throw new Error("policy API rotated an unexpected policy");
  }
  return rotation;
}

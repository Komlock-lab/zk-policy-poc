import { type Address, type Hex, getAddress, recoverTypedDataAddress } from "viem";

export const policyUpdateTypes = {
  PolicyUpdate: [
    { name: "policyId", type: "string" },
    { name: "account", type: "address" },
    { name: "policyCommitment", type: "bytes32" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint64" },
  ],
} as const;

export const policyAccessTokenRotationTypes = {
  PolicyAccessTokenRotation: [
    { name: "policyId", type: "string" },
    { name: "account", type: "address" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint64" },
  ],
} as const;

export interface PolicyUpdateMessage {
  policyId: string;
  account: Address;
  policyCommitment: Hex;
  nonce: bigint;
  deadline: bigint;
}

export interface PolicyAccessTokenRotationMessage {
  policyId: string;
  account: Address;
  nonce: bigint;
  deadline: bigint;
}

export const policyDomain = (account: Address) => ({
  name: "ZkPolicy",
  version: "1",
  chainId: 31_337,
  verifyingContract: account,
}) as const;

export async function recoverPolicyUpdateSigner(
  message: PolicyUpdateMessage,
  signature: Hex,
): Promise<Address> {
  return getAddress(
    await recoverTypedDataAddress({
      domain: policyDomain(message.account),
      types: policyUpdateTypes,
      primaryType: "PolicyUpdate",
      message,
      signature,
    }),
  );
}

export async function recoverPolicyAccessTokenRotationSigner(
  message: PolicyAccessTokenRotationMessage,
  signature: Hex,
): Promise<Address> {
  return getAddress(
    await recoverTypedDataAddress({
      domain: policyDomain(message.account),
      types: policyAccessTokenRotationTypes,
      primaryType: "PolicyAccessTokenRotation",
      message,
      signature,
    }),
  );
}

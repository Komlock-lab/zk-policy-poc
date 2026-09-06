import {
  type Address,
  type Hex,
  createPublicClient,
  getAddress,
  http,
} from "viem";
import { foundry } from "viem/chains";

export const zkPolicyAccountAbi = [
  {
    type: "function",
    name: "owner",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address" }],
  },
  {
    type: "function",
    name: "policyConfigured",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "policyCommitment",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "bytes32" }],
  },
  {
    type: "function",
    name: "updatePolicyCommitment",
    stateMutability: "nonpayable",
    inputs: [{ name: "newCommitment", type: "bytes32" }],
    outputs: [],
  },
  {
    type: "function", name: "getDailySpend", stateMutability: "view",
    inputs: [{ name: "asset", type: "address" }],
    outputs: [{ name: "dayId", type: "uint64" }, { name: "spentBefore", type: "uint128" }],
  },
  {
    type: "function",
    name: "execute",
    stateMutability: "nonpayable",
    inputs: [
      { name: "recipient", type: "address" },
      { name: "value", type: "uint256" },
      { name: "issuedAt", type: "uint64" },
      { name: "validUntil", type: "uint64" },
      { name: "proof", type: "bytes" },
    ],
    outputs: [],
  },
] as const;

export interface PolicyTransaction {
  from: Address;
  to: Address | null;
  input: Hex;
  status: "success" | "reverted";
}

export interface PolicyChainGateway {
  getPaymentState(account: Address, asset: Address): Promise<{ dayId: bigint; spentBefore: bigint; blockNumber: bigint }>;
  getOwner(account: Address): Promise<Address>;
  getPolicyState(account: Address): Promise<{ configured: boolean; commitment: Hex }>;
  getTransaction(hash: Hex): Promise<PolicyTransaction>;
}

export async function createPolicyChainGateway(rpcUrl: string): Promise<PolicyChainGateway> {
  const client = createPublicClient({ chain: foundry, transport: http(rpcUrl) });
  if ((await client.getChainId()) !== 31_337) throw new Error("local chain id must be 31337");
  return {
    getPaymentState: async (account, asset) => {
      const block = await client.getBlock();
      const [dayId, spentBefore] = await client.readContract({ address: account, abi: zkPolicyAccountAbi, functionName: "getDailySpend", args: [asset], blockNumber: block.number });
      return { dayId, spentBefore, blockNumber: block.number };
    },
    getOwner: async (account) =>
      getAddress(await client.readContract({ address: account, abi: zkPolicyAccountAbi, functionName: "owner" })),
    getPolicyState: async (account) => {
      const [configured, commitment] = await Promise.all([
        client.readContract({ address: account, abi: zkPolicyAccountAbi, functionName: "policyConfigured" }),
        client.readContract({ address: account, abi: zkPolicyAccountAbi, functionName: "policyCommitment" }),
      ]);
      return { configured, commitment };
    },
    getTransaction: async (hash) => {
      const [transaction, receipt] = await Promise.all([
        client.getTransaction({ hash }),
        client.getTransactionReceipt({ hash }),
      ]);
      return {
        from: transaction.from,
        to: transaction.to,
        input: transaction.input,
        status: receipt.status,
      };
    },
  };
}

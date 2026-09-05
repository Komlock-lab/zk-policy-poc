import {
  encodeFunctionData,
  http,
  isAddressEqual,
  parseAbi,
  type Address,
} from "viem";
import {
  createBundlerClient,
  entryPoint08Abi,
  getUserOperationHash,
  toSmartAccount,
} from "viem/account-abstraction";
import { foundry } from "viem/chains";
import {
  assertLocalPaymentUrl,
  paymentAddressSchema,
  preparePolicyPayment,
  type PolicyPaymentInput,
} from "./pay-with-policy.ts";

export const userOpAccountAbi = parseAbi([
  "function entryPoint() view returns (address)",
  "function executeUserOp(address recipient,uint256 value,bytes proof)",
]);

export interface UserOpPaymentInput extends PolicyPaymentInput {
  bundlerUrl: string;
  entryPointAddress: Address;
}

export async function preparePolicyUserOperation(input: UserOpPaymentInput) {
  assertLocalPaymentUrl(input.apiUrl, "apiUrl");
  assertLocalPaymentUrl(input.rpcUrl, "rpcUrl");
  assertLocalPaymentUrl(input.bundlerUrl, "bundlerUrl");
  const entryPointAddress = paymentAddressSchema.parse(input.entryPointAddress);
  const payment = await preparePolicyPayment(input);
  const { publicClient, owner, accountAddress, recipient, valueWei, proof } =
    payment;
  const bundler = createBundlerClient({
    client: publicClient,
    chain: foundry,
    transport: http(input.bundlerUrl, { fetchOptions: { redirect: "error" } }),
  });
  const [actualEntryPoint, supported, chainId] = await Promise.all([
    publicClient.readContract({
      address: accountAddress,
      abi: userOpAccountAbi,
      functionName: "entryPoint",
    }),
    bundler.getSupportedEntryPoints(),
    bundler.getChainId(),
  ]);
  if (chainId !== 31337) throw new Error("bundler chain id must be 31337");
  if (
    !isAddressEqual(actualEntryPoint, entryPointAddress) ||
    !supported.some((address) => isAddressEqual(address, entryPointAddress))
  ) {
    throw new Error("account and bundler EntryPoint must match");
  }
  const account = await toSmartAccount({
    client: publicClient,
    entryPoint: {
      abi: entryPoint08Abi,
      address: entryPointAddress,
      version: "0.8",
    },
    getAddress: async () => accountAddress,
    getFactoryArgs: async () => ({
      factory: undefined,
      factoryData: undefined,
    }),
    getNonce: async () =>
      publicClient.readContract({
        address: entryPointAddress,
        abi: entryPoint08Abi,
        functionName: "getNonce",
        args: [accountAddress, 0n],
      }),
    encodeCalls: async () => {
      throw new Error("only explicit policy payment calldata is supported");
    },
    getStubSignature: async () => owner.sign({ hash: `0x${"ff".repeat(32)}` }),
    signMessage: async () => {
      throw new Error("message signing is not supported");
    },
    signTypedData: async () => {
      throw new Error("typed data signing is not supported");
    },
    signUserOperation: async (userOperation) =>
      owner.sign({
        hash: getUserOperationHash({
          userOperation: { ...userOperation, sender: accountAddress },
          chainId: 31337,
          entryPointAddress,
          entryPointVersion: "0.8",
        }),
      }),
  });
  const callData = encodeFunctionData({
    abi: userOpAccountAbi,
    functionName: "executeUserOp",
    args: [recipient, valueWei, proof.proof],
  });
  const userOperation = await bundler.prepareUserOperation({
    account,
    callData,
  });
  return { ...payment, account, bundler, userOperation };
}

export async function payWithPolicyUserOperation(input: UserOpPaymentInput) {
  const { account, bundler, userOperation, proof } =
    await preparePolicyUserOperation(input);
  const signature = await account.signUserOperation(userOperation);
  const userOperationHash = await bundler.sendUserOperation({
    ...userOperation,
    signature,
    account,
  });
  const receipt = await bundler.waitForUserOperationReceipt({
    hash: userOperationHash,
    pollingInterval: 1_000,
    retryCount: 60,
    timeout: 0,
  });
  if (!receipt.success || receipt.receipt.status !== "success")
    throw new Error("policy UserOperation execution failed");
  return {
    policyId: proof.policyId,
    policyVersion: proof.policyVersion,
    userOperationHash,
    transactionHash: receipt.receipt.transactionHash,
  };
}

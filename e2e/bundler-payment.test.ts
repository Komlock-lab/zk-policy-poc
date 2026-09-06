import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  createTestClient,
  encodeFunctionData,
  http,
  parseEther,
  toHex,
} from "viem";
import { foundry } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import {
  entryPoint08Abi,
  getUserOperationHash,
} from "viem/account-abstraction";
import { startLocalBundler, LOCAL_OWNER_KEY } from "../scripts/lib/alto.ts";
import { findArtifact } from "../scripts/lib/local-payment.ts";
import { createAndActivatePolicy } from "../apps/policy-cli/src/create-policy.ts";
import {
  preparePolicyUserOperation,
  payWithPolicyUserOperation,
  userOpAccountAbi,
  type UserOpPaymentInput,
} from "../apps/policy-cli/src/pay-with-userop.ts";
import {
  createPolicyChainGateway,
  zkPolicyAccountAbi,
} from "../apps/policy-api/src/chain.ts";
import { PolicyRepository } from "../apps/policy-api/src/repository.ts";
import { buildPolicyApi } from "../apps/policy-api/src/server.ts";
import { PolicyService } from "../apps/policy-api/src/service.ts";

describe.sequential("Phase 3 real Alto policy payment", () => {
  let harness: Awaited<ReturnType<typeof startLocalBundler>>;
  let app: ReturnType<typeof buildPolicyApi>;
  let repository: PolicyRepository;
  let input: UserOpPaymentInput;
  beforeAll(async () => {
    harness = await startLocalBundler();
    const {
      wallet,
      publicClient,
      owner,
      entryPointAddress,
      rpcUrl,
      bundlerUrl,
    } = harness;
    const verifier = await publicClient.waitForTransactionReceipt({
      hash: await wallet.deployContract(await findArtifact("HonkVerifier")),
    });
    const account = await publicClient.waitForTransactionReceipt({
      hash: await wallet.deployContract({
        ...(await findArtifact("ZkPolicyAccount")),
        args: [owner.address, verifier.contractAddress!, entryPointAddress],
      }),
    });
    const accountAddress = account.contractAddress!;
    repository = new PolicyRepository(":memory:");
    app = buildPolicyApi(
      new PolicyService(
        repository,
        await createPolicyChainGateway(rpcUrl),
        Buffer.alloc(32, 1),
      ),
    );
    const apiUrl = await app.listen({ host: "127.0.0.1", port: 0 });
    const policy = await createAndActivatePolicy({
      apiUrl,
      rpcUrl,
      accountAddress,
      ownerPrivateKey: LOCAL_OWNER_KEY,
      maxAmountWei: parseEther("0.1"),
      allowedTarget: "0x0000000000000000000000000000000000001234",
      deadline: Math.floor(Date.now() / 1000) + 600,
    });
    await publicClient.waitForTransactionReceipt({
      hash: await wallet.sendTransaction({
        to: accountAddress,
        value: parseEther("2"),
      }),
    });
    input = {
      apiUrl,
      rpcUrl,
      bundlerUrl,
      entryPointAddress,
      accountAddress,
      ownerPrivateKey: LOCAL_OWNER_KEY,
      policyId: policy.policyId,
      token: policy.token,
      recipient: "0x0000000000000000000000000000000000001234",
      valueWei: parseEther("0.01"),
    };
  });
  afterAll(async () => {
    await app?.close();
    repository?.close();
    await harness?.stop();
  });
  const state = async () => ({
    balance: await harness.publicClient.getBalance({
      address: input.recipient,
    }),
    nonce: await harness.publicClient.readContract({
      address: input.entryPointAddress,
      abi: entryPoint08Abi,
      functionName: "getNonce",
      args: [input.accountAddress, 0n],
    }),
  });
  it("AC-1 CLI pays 0.01 ETH with successful receipt without spending the Owner EOA nonce", async () => {
    const before = await state();
    const ownerNonce = await harness.publicClient.getTransactionCount({
      address: harness.owner.address,
    });
    const { stdout, stderr } = await promisify(execFile)(
      process.execPath,
      [
        "--import",
        "tsx",
        "apps/policy-cli/src/pay-userop.ts",
        input.recipient,
        input.valueWei.toString(),
      ],
      {
        env: {
          PATH: process.env.PATH,
          POLICY_API_URL: input.apiUrl,
          POLICY_RPC_URL: input.rpcUrl,
          POLICY_BUNDLER_URL: input.bundlerUrl,
          POLICY_ENTRYPOINT_ADDRESS: input.entryPointAddress,
          POLICY_ACCOUNT_ADDRESS: input.accountAddress,
          POLICY_OWNER_PRIVATE_KEY: input.ownerPrivateKey,
          POLICY_ID: input.policyId,
          POLICY_TOKEN: input.token,
        },
      },
    );
    const result = JSON.parse(stdout) as {
      policyId: string;
      userOperationHash: string;
      transactionHash: `0x${string}`;
    };
    expect(stderr).toBe("");
    expect(result.policyId).toBe(input.policyId);
    expect(result.userOperationHash).toMatch(/^0x[0-9a-f]{64}$/);
    expect(
      (
        await harness.publicClient.getTransactionReceipt({
          hash: result.transactionHash,
        })
      ).status,
    ).toBe("success");
    expect(await state()).toEqual({
      balance: before.balance + input.valueWei,
      nonce: before.nonce + 1n,
    });
    expect(
      await harness.publicClient.getTransactionCount({
        address: harness.owner.address,
      }),
    ).toBe(ownerNonce);
  });
  it("AC-2 rejects 1 ETH at the Proof API without consuming nonce or sending funds", async () => {
    const before = await state();
    await expect(
      payWithPolicyUserOperation({ ...input, valueWei: parseEther("1") }),
    ).rejects.toThrow("status 422");
    expect(await state()).toEqual(before);
  });
  it("AC-3 real Bundler rejects a non-Owner signature", async () => {
    const prepared = await preparePolicyUserOperation(input);
    const before = await state();
    const outsider = privateKeyToAccount(`0x${"01".repeat(32)}`);
    const signature = await outsider.sign({
      hash: getUserOperationHash({
        userOperation: prepared.userOperation,
        chainId: 31337,
        entryPointAddress: input.entryPointAddress,
        entryPointVersion: "0.8",
      }),
    });
    await expect(
      prepared.bundler.sendUserOperation({
        ...prepared.userOperation,
        signature,
        entryPointAddress: input.entryPointAddress,
      }),
    ).rejects.toThrow(/signature|AA24/i);
    expect(await state()).toEqual(before);
  });
  it("AC-4 real Bundler gas estimation rejects a tampered payment amount", async () => {
    const prepared = await preparePolicyUserOperation(input);
    const before = await state();
    const callData = encodeFunctionData({
      abi: userOpAccountAbi,
      functionName: "executeUserOp",
      args: [input.recipient, parseEther("0.02"), prepared.proof.proof],
    });
    await expect(
      prepared.bundler.estimateUserOperationGas({
        ...prepared.userOperation,
        callData,
        entryPointAddress: input.entryPointAddress,
      }),
    ).rejects.toThrow();
    expect(await state()).toEqual(before);
  });
  it("AC-5 refuses mismatched EntryPoint before submission", async () => {
    const before = await state();
    await expect(
      payWithPolicyUserOperation({
        ...input,
        entryPointAddress: "0x0000000000000000000000000000000000004321",
      }),
    ).rejects.toThrow("EntryPoint must match");
    expect(await state()).toEqual(before);
  });
  it("rejects a proof against a tampered current commitment during real simulation", async () => {
    const prepared = await preparePolicyUserOperation(input);
    const before = await state();
    const testClient = createTestClient({
      chain: foundry,
      mode: "anvil",
      transport: http(input.rpcUrl),
    });
    const snapshot = await testClient.snapshot();
    try {
      await harness.publicClient.waitForTransactionReceipt({
        hash: await harness.wallet.writeContract({
          address: input.accountAddress,
          abi: zkPolicyAccountAbi,
          functionName: "updatePolicyCommitment",
          args: [toHex(1n, { size: 32 })],
        }),
      });
      await expect(
        prepared.bundler.estimateUserOperationGas({
          ...prepared.userOperation,
          entryPointAddress: input.entryPointAddress,
        }),
      ).rejects.toThrow();
      expect(await state()).toEqual(before);
    } finally {
      await testClient.revert({ id: snapshot });
    }
  });
  it("retains safe-mode opcode enforcement after the simulation compatibility patch", async () => {
    const prepared = await preparePolicyUserOperation(input);
    const before = await state();
    const testClient = createTestClient({
      chain: foundry,
      mode: "anvil",
      transport: http(input.rpcUrl),
    });
    const snapshot = await testClient.snapshot();
    try {
      await harness.publicClient.waitForTransactionReceipt({
        hash: await harness.wallet.writeContract({
          address: input.entryPointAddress,
          abi: entryPoint08Abi,
          functionName: "depositTo",
          args: [input.accountAddress],
          value: parseEther("1"),
        }),
      });
      // A fixture validator that reads forbidden TIMESTAMP and returns valid signature data.
      await testClient.setCode({
        address: input.accountAddress,
        bytecode: "0x4250600060005260206000f3",
      });
      const signature = await prepared.account.signUserOperation(
        prepared.userOperation,
      );
      await expect(
        prepared.bundler.sendUserOperation({
          ...prepared.userOperation,
          signature,
          entryPointAddress: input.entryPointAddress,
        }),
      ).rejects.toThrow(/TIMESTAMP|banned opcode/i);
      expect(await state()).toEqual(before);
    } finally {
      await testClient.revert({ id: snapshot });
    }
  });
  it.each(["rpcUrl", "bundlerUrl", "apiUrl"] as const)(
    "AC-6 refuses non-loopback %s before connection",
    async (key) => {
      await expect(
        payWithPolicyUserOperation({ ...input, [key]: "https://example.com" }),
      ).rejects.toThrow("127.0.0.1");
    },
  );
});

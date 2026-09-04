import { describe, expect, it } from "vitest";
import { encodeFunctionData, toHex } from "viem";
import { zkPolicyAccountAbi } from "../../policy-api/src/chain.ts";
import { verifyPendingRegistration, waitForPolicyUpdateReceipt } from "./create-policy.ts";

const policyId = "00000000-0000-4000-8000-000000000001";
const commitment = toHex(123n, { size: 32 });
const calldata = encodeFunctionData({
  abi: zkPolicyAccountAbi,
  functionName: "updatePolicyCommitment",
  args: [commitment],
});

describe("policy CLI response verification", () => {
  it("uses locally reconstructed calldata for the expected pending version", () => {
    expect(
      verifyPendingRegistration(
        { policyId, policyVersion: 2, status: "pending", calldata },
        { policyId, policyVersion: 2, commitment },
      ),
    ).toBe(calldata);
  });

  it("rejects altered identity, version, or calldata", () => {
    const expected = { policyId, policyVersion: 2, commitment };
    expect(() =>
      verifyPendingRegistration(
        { policyId: "00000000-0000-4000-8000-000000000002", policyVersion: 2, status: "pending", calldata },
        expected,
      ),
    ).toThrow("identity or version");
    expect(() =>
      verifyPendingRegistration({ policyId, policyVersion: 3, status: "pending", calldata }, expected),
    ).toThrow("identity or version");
    expect(() =>
      verifyPendingRegistration({ policyId, policyVersion: 2, status: "pending", calldata: "0x1234" }, expected),
    ).toThrow("does not match");
  });

  it("preserves pending version and known tx hash when receipt status is unknown", async () => {
    const txHash = toHex(456n, { size: 32 });
    const rpcError = new Error("receipt timeout");

    await expect(
      waitForPolicyUpdateReceipt({
        policyVersion: 2,
        txHash,
        wait: async () => {
          throw rpcError;
        },
      }),
    ).rejects.toMatchObject({
      message: `policy version 2 remains pending; transaction ${txHash} status is unknown`,
      cause: rpcError,
    });
  });

  it("reports a confirmed revert while keeping the policy pending", async () => {
    const txHash = toHex(789n, { size: 32 });

    await expect(
      waitForPolicyUpdateReceipt({
        policyVersion: 2,
        txHash,
        wait: async () => ({ status: "reverted" }),
      }),
    ).rejects.toThrow(`policy version 2 remains pending; transaction ${txHash} reverted`);
  });
});

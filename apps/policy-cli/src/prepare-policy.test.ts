import { expect, it, vi, afterEach } from "vitest";
import { encodeFunctionData, toHex } from "viem";
import { zkPolicyAccountAbi } from "../../policy-api/src/chain.ts";
import { LOCAL_OWNER_KEY } from "../../../scripts/lib/alto.ts";

const mocks = vi.hoisted(() => ({ send: vi.fn(async () => "0x" + "34".repeat(32)), compute: vi.fn(async () => 123n) }));
vi.mock("viem", async (original) => ({
  ...await original<typeof import("viem")>(),
  createPublicClient: () => ({ getChainId: async () => 31337, waitForTransactionReceipt: async () => ({ status: "success" }) }),
  createWalletClient: () => ({ sendTransaction: mocks.send }),
}));
vi.mock("../../../packages/policy/src/index.ts", async (original) => ({
  ...await original<typeof import("../../../packages/policy/src/index.ts")>(), computePolicyCommitment: mocks.compute,
}));
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });
it("defers nonce, signature registration and transaction until confirmation and reuses the commitment", async () => {
  const commitment = toHex(123n, { size: 32 });
  const policyId = "00000000-0000-4000-8000-000000000001";
  const calldata = encodeFunctionData({ abi: zkPolicyAccountAbi, functionName: "updatePolicyCommitment", args: [commitment] });
  const fetchMock = vi.fn().mockResolvedValueOnce(Response.json({ policyId, nonce: "0" }))
    .mockResolvedValueOnce(Response.json({ policyId, policyVersion: 1, status: "pending", token: "zkp_" + "a".repeat(43), calldata }))
    .mockResolvedValueOnce(Response.json({ policyVersion: 1, status: "active" }));
  vi.stubGlobal("fetch", fetchMock);
  const { preparePolicyRegistration } = await import("./create-policy.ts");
  const draft = await preparePolicyRegistration({ apiUrl: "http://127.0.0.1:3000", rpcUrl: "http://127.0.0.1:8545",
    accountAddress: "0x" + "11".repeat(20) as `0x${string}`, ownerPrivateKey: LOCAL_OWNER_KEY, maxAmountWei: 100n });
  expect(draft.commitment).toBe(commitment);
  expect(fetchMock).not.toHaveBeenCalled();
  expect(mocks.send).not.toHaveBeenCalled();
  const result = await draft.activate(2000000000);
  expect(result.commitment).toBe(commitment);
  expect(mocks.compute).toHaveBeenCalledOnce();
  expect(mocks.send).toHaveBeenCalledWith(expect.objectContaining({ data: calldata }));
  const registration = JSON.parse(fetchMock.mock.calls[1]![1].body);
  expect(registration.policyCommitment).toBe(commitment);
  expect(registration.deadline).toBe(2000000000);
});

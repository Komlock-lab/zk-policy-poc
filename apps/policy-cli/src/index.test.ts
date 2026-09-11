import { afterEach, expect, it, vi } from "vitest";

vi.mock("./policy-input.ts", () => ({ readCreatePolicyArguments: vi.fn(async () => ({ maxAmountWei: 100000000000000000n, maxValiditySeconds: 300n })) }));
vi.mock("./create-policy.ts", () => ({ createAndActivatePolicy: vi.fn(async () => ({ policyId: "test-policy", policyVersion: 1, commitment: "0x1234", txHash: "0x5678", token: "secret-token" })) }));

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

it("prints only public completion fields after registration", async () => {
  vi.stubEnv("POLICY_API_URL", "http://127.0.0.1:3000");
  vi.stubEnv("POLICY_RPC_URL", "http://127.0.0.1:8545");
  vi.stubEnv("POLICY_ACCOUNT_ADDRESS", "0x" + "11".repeat(20));
  vi.stubEnv("POLICY_OWNER_PRIVATE_KEY", "0x" + "22".repeat(32));
  const write = vi.spyOn(process.stdout, "write").mockReturnValue(true);
  await import("./index.ts");
  expect(write).toHaveBeenCalledExactlyOnceWith(JSON.stringify({ policyId: "test-policy", policyVersion: 1, commitment: "0x1234", txHash: "0x5678" }) + "\n");
  const { createAndActivatePolicy } = await import("./create-policy.ts");
  expect(createAndActivatePolicy).toHaveBeenCalledWith(expect.objectContaining({ maxAmountWei: 100000000000000000n, maxValiditySeconds: 300n, apiUrl: "http://127.0.0.1:3000", rpcUrl: "http://127.0.0.1:8545" }));
});

import { execFile } from "node:child_process";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  payWithPolicyUserOperation,
  type UserOpPaymentInput,
} from "./pay-with-userop.ts";
import { runUserOpPaymentCli } from "./pay-userop.ts";

const input: UserOpPaymentInput = {
  apiUrl: "http://127.0.0.1:3000",
  rpcUrl: "http://127.0.0.1:8545",
  bundlerUrl: "http://127.0.0.1:4337",
  accountAddress: "0x0000000000000000000000000000000000000001",
  entryPointAddress: "0x0000000000000000000000000000000000000002",
  ownerPrivateKey: `0x${"01".repeat(32)}`,
  policyId: "00000000-0000-4000-8000-000000000001",
  token: `zkp_${"a".repeat(43)}`,
  recipient: "0x0000000000000000000000000000000000000003",
  valueWei: 1n,
};
describe("UserOperation input and CLI boundaries", () => {
  afterEach(() => vi.unstubAllGlobals());
  it.each(["apiUrl", "rpcUrl", "bundlerUrl"] as const)(
    "rejects remote %s before any network request",
    async (key) => {
      const fetch = vi.fn();
      vi.stubGlobal("fetch", fetch);
      await expect(
        payWithPolicyUserOperation({ ...input, [key]: "https://example.com" }),
      ).rejects.toThrow("127.0.0.1");
      expect(fetch).not.toHaveBeenCalled();
    },
  );
  it("rejects zero EntryPoint and invalid payment before connecting", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    await expect(
      payWithPolicyUserOperation({
        ...input,
        entryPointAddress: `0x${"00".repeat(20)}`,
      }),
    ).rejects.toThrow("zero");
    await expect(
      payWithPolicyUserOperation({ ...input, valueWei: -1n }),
    ).rejects.toThrow();
    await expect(runUserOpPaymentCli({}, [])).rejects.toThrow();
    expect(fetch).not.toHaveBeenCalled();
  });
  it("CLI exits nonzero and does not print supplied secrets on invalid input", async () => {
    const result = await new Promise<{
      error: Error | null;
      stdout: string;
      stderr: string;
    }>((resolve) => {
      execFile(
        process.execPath,
        ["--import", "tsx", "apps/policy-cli/src/pay-userop.ts"],
        {
          env: {
            ...process.env,
            POLICY_TOKEN: "private-token-marker",
            POLICY_OWNER_PRIVATE_KEY: "private-key-marker",
          },
        },
        (error, stdout, stderr) => resolve({ error, stdout, stderr }),
      );
    });
    expect(result.error).not.toBeNull();
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("UserOperation payment failed");
    expect(result.stderr).not.toMatch(
      /private-token-marker|private-key-marker/,
    );
  });
});

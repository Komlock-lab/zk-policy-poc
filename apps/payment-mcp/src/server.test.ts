import { describe, expect, it, vi } from "vitest";
import type { PaymentMcpConfig } from "./config.ts";
import { executePaymentTool, paymentIntentSchema } from "./server.ts";

const config: PaymentMcpConfig = {
  apiUrl: "http://127.0.0.1:3000",
  rpcUrl: "http://127.0.0.1:8545",
  bundlerUrl: "http://127.0.0.1:4337",
  entryPointAddress: "0x0000000000000000000000000000000000000001",
  accountAddress: "0x0000000000000000000000000000000000000002",
  ownerPrivateKey: `0x${"ab".repeat(32)}`,
  policyId: "00000000-0000-4000-8000-000000000001",
  token: `zkp_${"c".repeat(43)}`,
};

describe("payment MCP tool", () => {
  it("passes the exact structured intent to the UserOperation client", async () => {
    const execute = vi.fn().mockResolvedValue({
      policyId: config.policyId,
      policyVersion: 2,
      userOperationHash: `0x${"11".repeat(32)}`,
      transactionHash: `0x${"22".repeat(32)}`,
    });
    const result = await executePaymentTool(
      {
        recipient: "0x0000000000000000000000000000000000000003",
        valueWei: "10000000000000000",
        validUntil: "400",
      },
      config,
      execute,
    );
    expect(execute).toHaveBeenCalledWith({
      ...config,
      recipient: "0x0000000000000000000000000000000000000003",
      valueWei: 10_000_000_000_000_000n,
      validUntil: 400n,
    });
    expect(result).toEqual({
      policyId: config.policyId,
      policyVersion: 2,
      userOperationHash: `0x${"11".repeat(32)}`,
      transactionHash: `0x${"22".repeat(32)}`,
      status: "success",
    });
    expect(JSON.stringify(result)).not.toMatch(/proof|ownerPrivateKey|token/);
  });

  it.each([
    { recipient: zeroAddress(), valueWei: "1" },
    { recipient: "invalid", valueWei: "1" },
    { recipient: "0x0000000000000000000000000000000000000003", valueWei: "01" },
    { recipient: "0x0000000000000000000000000000000000000003", valueWei: "-1" },
  ])("rejects an invalid intent before execution", async (input) => {
    const execute = vi.fn();
    await expect(executePaymentTool(input, config, execute)).rejects.toThrow();
    expect(execute).not.toHaveBeenCalled();
  });
});

function zeroAddress() {
  return "0x0000000000000000000000000000000000000000";
}

describe("public tool schema", () => {
  it("contains the native intent and optional expiry", () => {
    const parsed = paymentIntentSchema.parse({
      recipient: "0x0000000000000000000000000000000000000003",
      valueWei: "1",
    });
    expect(Object.keys(parsed)).toEqual(["recipient", "valueWei"]);
    expect(() =>
      paymentIntentSchema.parse({
        ...parsed,
        ownerPrivateKey: config.ownerPrivateKey,
      }),
    ).toThrow();
  });
});

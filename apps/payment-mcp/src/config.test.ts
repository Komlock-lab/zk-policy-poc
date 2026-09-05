import { describe, expect, it } from "vitest";
import {
  formatPaymentMcpConfigError,
  loadPaymentMcpConfig,
} from "./config.ts";

const valid = {
  POLICY_API_URL: "http://127.0.0.1:3000",
  POLICY_RPC_URL: "http://127.0.0.1:8545",
  POLICY_BUNDLER_URL: "http://127.0.0.1:4337",
  POLICY_ENTRYPOINT_ADDRESS: "0x0000000000000000000000000000000000000001",
  POLICY_ACCOUNT_ADDRESS: "0x0000000000000000000000000000000000000002",
  POLICY_OWNER_PRIVATE_KEY: `0x${"ab".repeat(32)}`,
  POLICY_ID: "00000000-0000-4000-8000-000000000001",
  POLICY_TOKEN: `zkp_${"c".repeat(43)}`,
};

describe("payment MCP configuration", () => {
  it("accepts local-only configuration", () => {
    expect(loadPaymentMcpConfig(valid)).toMatchObject({
      apiUrl: valid.POLICY_API_URL,
      policyId: valid.POLICY_ID,
    });
  });

  it.each(["POLICY_API_URL", "POLICY_RPC_URL", "POLICY_BUNDLER_URL"])(
    "rejects remote %s before server startup",
    (name) => {
      expect(() =>
        loadPaymentMcpConfig({ ...valid, [name]: "https://example.com" }),
      ).toThrow("127.0.0.1");
    },
  );

  it("does not include secret values in a sanitized startup failure", () => {
    let error: unknown;
    try {
      loadPaymentMcpConfig({
        ...valid,
        POLICY_OWNER_PRIVATE_KEY: "owner-secret-canary",
        POLICY_TOKEN: "token-secret-canary",
      });
    } catch (caught) {
      error = caught;
    }
    const publicMessage = formatPaymentMcpConfigError(error);
    expect(publicMessage).toContain("POLICY_OWNER_PRIVATE_KEY");
    expect(publicMessage).toContain("POLICY_TOKEN");
    expect(publicMessage).not.toContain(valid.POLICY_OWNER_PRIVATE_KEY);
    expect(publicMessage).not.toContain(valid.POLICY_TOKEN);
    expect(publicMessage).not.toContain("secret-canary");
  });
});

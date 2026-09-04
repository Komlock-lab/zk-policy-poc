import { describe, expect, it } from "vitest";
import { parsePolicyApiConfig } from "./config.ts";

const base = {
  POLICY_API_DB_PATH: ":memory:",
  POLICY_API_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString("base64"),
  POLICY_API_RPC_URL: "http://127.0.0.1:8545",
};

describe("parsePolicyApiConfig", () => {
  it("accepts local configuration", () => {
    expect(parsePolicyApiConfig(base)).toMatchObject({ host: "127.0.0.1", port: 3_000 });
  });

  it("rejects remote RPC URLs", () => {
    expect(() => parsePolicyApiConfig({ ...base, POLICY_API_RPC_URL: "https://example.com" })).toThrow(
      "127.0.0.1",
    );
  });

  it("rejects invalid keys", () => {
    expect(() => parsePolicyApiConfig({ ...base, POLICY_API_ENCRYPTION_KEY: "bad" })).toThrow(
      "32-byte",
    );
  });
});

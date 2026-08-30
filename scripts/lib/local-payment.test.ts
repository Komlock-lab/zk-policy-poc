import { describe, expect, it } from "vitest";

import { assertLocalAnvilRpc } from "./local-payment.ts";

describe("assertLocalAnvilRpc", () => {
  it("accepts HTTP loopback URLs", () => {
    expect(() => assertLocalAnvilRpc("http://127.0.0.1:8545")).not.toThrow();
  });

  it("rejects non-local and non-HTTP URLs", () => {
    expect(() => assertLocalAnvilRpc("https://rpc.example.com")).toThrow(
      "only a local Anvil RPC URL is allowed",
    );
    expect(() => assertLocalAnvilRpc("https://localhost:8545")).toThrow(
      "only a local Anvil RPC URL is allowed",
    );
    expect(() => assertLocalAnvilRpc("http://localhost:8545")).toThrow(
      "only a local Anvil RPC URL is allowed",
    );
  });
});

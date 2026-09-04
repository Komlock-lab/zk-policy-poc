import { describe, expect, it } from "vitest";
import type { Address, Hex } from "viem";
import { PolicyRepository } from "./repository.ts";
import { buildPolicyApi } from "./server.ts";
import { PolicyService } from "./service.ts";

const account = "0x0000000000000000000000000000000000001234" as Address;

describe("policy API routes", () => {
  it("returns a context and rejects malformed requests at the boundary", async () => {
    const repository = new PolicyRepository(":memory:");
    const service = new PolicyService(
      repository,
      {
        getOwner: async () => account,
        getPolicyState: async () => ({ configured: false, commitment: "0x00" as Hex }),
        getTransaction: async () => {
          throw new Error("not found");
        },
      },
      Buffer.alloc(32, 1),
    );
    const app = buildPolicyApi(service);
    const context = await app.inject({ method: "GET", url: `/v1/accounts/${account}/policy-context` });
    expect(context.statusCode).toBe(200);
    expect(context.json()).toMatchObject({ nonce: "0" });
    const invalid = await app.inject({ method: "PUT", url: "/v1/policies/not-a-uuid", payload: {} });
    expect(invalid.statusCode).toBe(400);
    expect(invalid.json()).toEqual({ error: "INVALID_REQUEST" });
    const nonceOverflow = await app.inject({
      method: "PUT",
      url: "/v1/policies/00000000-0000-4000-8000-000000000001",
      payload: {
        account,
        maxAmountWei: "1",
        salt: "1",
        policyCommitment: `0x${"00".repeat(32)}`,
        nonce: (1n << 256n).toString(),
        deadline: 2_000_000_000,
        signature: `0x${"00".repeat(65)}`,
      },
    });
    expect(nonceOverflow.statusCode).toBe(400);
    expect(nonceOverflow.json()).toEqual({ error: "INVALID_REQUEST" });
    await app.close();
    repository.close();
  });
});

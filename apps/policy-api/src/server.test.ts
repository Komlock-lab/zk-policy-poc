import { describe, expect, it, vi } from "vitest";
import { toHex, type Address, type Hex } from "viem";
import { U128_MAX } from "../../../packages/policy/src/index.ts";
import { PolicyRepository } from "./repository.ts";
import { buildPolicyApi } from "./server.ts";
import { PolicyApiError, PolicyService } from "./service.ts";

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

  it("strictly parses proof requests and uses one response for malformed authorization", async () => {
    const repository = new PolicyRepository(":memory:");
    const service = new PolicyService(
      repository,
      {
        getOwner: async () => account,
        getPolicyState: async () => ({ configured: false, commitment: toHex(0n, { size: 32 }) }),
        getTransaction: async () => {
          throw new Error("not found");
        },
      },
      Buffer.alloc(32, 1),
    );
    const createProof = vi.spyOn(service, "createProof").mockResolvedValue({
      policyId: "00000000-0000-4000-8000-000000000001",
      policyVersion: 1,
      proof: "0x1234",
      publicInputs: [toHex(10n, { size: 32 }), toHex(20n, { size: 32 })],
    });
    const app = buildPolicyApi(service);
    const url = "/v1/policies/00000000-0000-4000-8000-000000000001/proofs";

    for (const authorization of [undefined, "bearer token", `Bearer zkp_${"a".repeat(42)}`]) {
      const response = await app.inject({
        method: "POST",
        url,
        headers: authorization ? { authorization } : {},
        payload: { valueWei: "10" },
      });
      expect(response.statusCode).toBe(401);
      expect(response.json()).toEqual({ error: "INVALID_POLICY_TOKEN" });
    }
    expect(createProof).not.toHaveBeenCalled();

    for (const payload of [
      { valueWei: "01" },
      { valueWei: "-1" },
      { valueWei: (U128_MAX + 1n).toString() },
      { valueWei: "10", extra: true },
    ]) {
      const response = await app.inject({
        method: "POST",
        url,
        headers: { authorization: `Bearer zkp_${"a".repeat(43)}` },
        payload,
      });
      expect(response.statusCode).toBe(400);
      expect(response.json()).toEqual({ error: "INVALID_REQUEST" });
    }

    const valid = await app.inject({
      method: "POST",
      url,
      headers: { authorization: `Bearer zkp_${"a".repeat(43)}` },
      payload: { valueWei: "10" },
    });
    expect(valid.statusCode).toBe(200);
    expect(createProof).toHaveBeenCalledWith({
      policyId: "00000000-0000-4000-8000-000000000001",
      valueWei: "10",
      token: `zkp_${"a".repeat(43)}`,
    });

    createProof.mockRejectedValueOnce(
      new PolicyApiError(500, "PROOF_GENERATION_FAILED", {
        cause: new Error("maxAmountWei=secret; salt=secret"),
      }),
    );
    const failed = await app.inject({
      method: "POST",
      url,
      headers: { authorization: `Bearer zkp_${"a".repeat(43)}` },
      payload: { valueWei: "10" },
    });
    expect(failed.statusCode).toBe(500);
    expect(failed.json()).toEqual({ error: "PROOF_GENERATION_FAILED" });
    expect(failed.body).not.toContain("maxAmountWei");
    expect(failed.body).not.toContain("salt");
    await app.close();
    repository.close();
  });
});

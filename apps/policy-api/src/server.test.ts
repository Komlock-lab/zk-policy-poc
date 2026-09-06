import { describe, expect, it, vi } from "vitest";
import { getAddress, toHex, type Address, type Hex } from "viem";
import { U128_MAX } from "../../../packages/policy/src/index.ts";
import { PolicyRepository } from "./repository.ts";
import { buildPolicyApi } from "./server.ts";
import { PolicyApiError, PolicyService } from "./service.ts";

const account = "0x0000000000000000000000000000000000001234" as Address;
const allowedTarget = "0x70997970c51812dc3a010c7d01b50e0d17dc79c8" as Address;

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
    const invalidChecksum = await app.inject({
      method: "GET",
      url: "/v1/accounts/0x52908400098527886E0F7030069857D2E4169Ee7/policy-context",
    });
    expect(invalidChecksum.statusCode).toBe(400);
    expect(invalidChecksum.json()).toEqual({ error: "INVALID_REQUEST" });
    const uppercaseAddress = await app.inject({
      method: "GET",
      url: "/v1/accounts/0xDE709F2102306220921060314715629080E2FB77/policy-context",
    });
    expect(uppercaseAddress.statusCode).toBe(200);
    const nonceOverflow = await app.inject({
      method: "PUT",
      url: "/v1/policies/00000000-0000-4000-8000-000000000001",
      payload: {
        account,
        maxAmountWei: "1",
        allowedTarget,
        salt: "1",
        policyCommitment: `0x${"00".repeat(32)}`,
        nonce: (1n << 256n).toString(),
        deadline: 2_000_000_000,
        signature: `0x${"00".repeat(65)}`,
      },
    });
    expect(nonceOverflow.statusCode).toBe(400);
    expect(nonceOverflow.json()).toEqual({ error: "INVALID_REQUEST" });
    const nonceExhausted = await app.inject({
      method: "PUT",
      url: "/v1/policies/00000000-0000-4000-8000-000000000001",
      payload: {
        account,
        maxAmountWei: "1",
        allowedTarget,
        salt: "1",
        policyCommitment: `0x${"00".repeat(32)}`,
        nonce: ((1n << 256n) - 1n).toString(),
        deadline: 2_000_000_000,
        signature: `0x${"00".repeat(65)}`,
      },
    });
    expect(nonceExhausted.statusCode).toBe(400);
    expect(nonceExhausted.json()).toEqual({ error: "INVALID_REQUEST" });
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
      publicInputs: [toHex(10n, { size: 32 }), toHex(BigInt(allowedTarget), { size: 32 }), toHex(20n, { size: 32 })],
    });
    const app = buildPolicyApi(service);
    const url = "/v1/policies/00000000-0000-4000-8000-000000000001/proofs";

    for (const authorization of [undefined, "bearer token", `Bearer zkp_${"a".repeat(42)}`]) {
      const response = await app.inject({
        method: "POST",
        url,
        headers: authorization ? { authorization } : {},
        payload: { valueWei: "10", target: allowedTarget },
      });
      expect(response.statusCode).toBe(401);
      expect(response.json()).toEqual({ error: "INVALID_POLICY_TOKEN" });
    }
    expect(createProof).not.toHaveBeenCalled();

    for (const payload of [
      { valueWei: "not-a-number", target: allowedTarget },
      { valueWei: "01", target: allowedTarget },
      { valueWei: "-1", target: allowedTarget },
      { valueWei: (U128_MAX + 1n).toString(), target: allowedTarget },
      { valueWei: "10", target: "not-an-address" },
      { valueWei: "10", target: allowedTarget, extra: true },
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
      payload: { valueWei: "10", target: allowedTarget },
    });
    expect(valid.statusCode).toBe(200);
    expect(createProof).toHaveBeenCalledWith({
      policyId: "00000000-0000-4000-8000-000000000001",
      valueWei: "10",
      target: getAddress(allowedTarget),
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
      payload: { valueWei: "10", target: allowedTarget },
    });
    expect(failed.statusCode).toBe(500);
    expect(failed.json()).toEqual({ error: "PROOF_GENERATION_FAILED" });
    expect(failed.body).not.toContain("maxAmountWei");
    expect(failed.body).not.toContain("salt");
    await app.close();
    repository.close();
  });

  it("strictly parses token rotation requests", async () => {
    const repository = new PolicyRepository(":memory:");
    const service = new PolicyService(
      repository,
      {
        getOwner: async () => account,
        getPolicyState: async () => ({ configured: true, commitment: toHex(1n, { size: 32 }) }),
        getTransaction: async () => {
          throw new Error("not found");
        },
      },
      Buffer.alloc(32, 1),
    );
    const rotatePolicyToken = vi.spyOn(service, "rotatePolicyToken").mockResolvedValue({
      policyId: "00000000-0000-4000-8000-000000000001",
      token: `zkp_${"b".repeat(43)}`,
    });
    const app = buildPolicyApi(service);
    const url = "/v1/policies/00000000-0000-4000-8000-000000000001/token";
    const validPayload = {
      account,
      nonce: "1",
      deadline: 2_000_000_000,
      signature: `0x${"11".repeat(65)}`,
    };

    for (const payload of [
      { ...validPayload, nonce: "not-a-number" },
      { ...validPayload, nonce: "01" },
      { ...validPayload, nonce: ((1n << 256n) - 1n).toString() },
      { ...validPayload, nonce: (1n << 256n).toString() },
      { ...validPayload, deadline: -1 },
      { ...validPayload, extra: true },
    ]) {
      const response = await app.inject({ method: "POST", url, payload });
      expect(response.statusCode).toBe(400);
      expect(response.json()).toEqual({ error: "INVALID_REQUEST" });
    }
    expect(rotatePolicyToken).not.toHaveBeenCalled();

    const response = await app.inject({ method: "POST", url, payload: validPayload });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      policyId: "00000000-0000-4000-8000-000000000001",
      token: `zkp_${"b".repeat(43)}`,
    });
    expect(rotatePolicyToken).toHaveBeenCalledWith({
      policyId: "00000000-0000-4000-8000-000000000001",
      ...validPayload,
    });
    await app.close();
    repository.close();
  });
});

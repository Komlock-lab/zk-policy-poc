import { afterEach, describe, expect, it, vi } from "vitest";
import { type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { recoverPolicyAccessTokenRotationSigner } from "../../policy-api/src/eip712.ts";
import { rotatePolicyToken } from "./rotate-policy-token.ts";

const ownerPrivateKey =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" as Hex;
const owner = privateKeyToAccount(ownerPrivateKey);
const account = "0x0000000000000000000000000000000000001234" as Address;
const policyId = "00000000-0000-4000-8000-000000000001";
const token = `zkp_${"a".repeat(43)}`;

afterEach(() => vi.unstubAllGlobals());

describe("rotatePolicyToken CLI client", () => {
  it("gets the nonce, signs the exact rotation type, and returns the validated new token", async () => {
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
        requests.push({ url: String(url), init });
        if (requests.length === 1) {
          return Response.json({ policyId, nonce: "7" });
        }
        return Response.json({ policyId, token });
      }),
    );

    await expect(
      rotatePolicyToken({
        apiUrl: "http://127.0.0.1:3000",
        accountAddress: account,
        ownerPrivateKey,
        expectedPolicyId: policyId,
        deadline: 2_000,
      }),
    ).resolves.toEqual({ policyId, token });

    expect(requests).toHaveLength(2);
    expect(requests[0]?.url).toBe(`http://127.0.0.1:3000/v1/accounts/${account}/policy-context`);
    expect(requests[1]?.url).toBe(`http://127.0.0.1:3000/v1/policies/${policyId}/token`);
    expect(requests[1]?.init).toMatchObject({
      method: "POST",
      headers: { "content-type": "application/json" },
    });
    const body = JSON.parse(String(requests[1]?.init?.body)) as {
      account: Address;
      nonce: string;
      deadline: number;
      signature: Hex;
    };
    expect(body).toMatchObject({ account, nonce: "7", deadline: 2_000 });
    await expect(
      recoverPolicyAccessTokenRotationSigner(
        { policyId, account, nonce: 7n, deadline: 2_000n },
        body.signature,
      ),
    ).resolves.toBe(owner.address);
  });

  it("rejects mismatched context before signing a rotation request", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({ policyId: "00000000-0000-4000-8000-000000000002", nonce: "7" }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      rotatePolicyToken({
        apiUrl: "http://127.0.0.1:3000",
        accountAddress: account,
        ownerPrivateKey,
        expectedPolicyId: policyId,
        deadline: 2_000,
      }),
    ).rejects.toThrow("policy context does not match");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("rejects malformed API responses at the boundary", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ policyId, nonce: "7" }))
      .mockResolvedValueOnce(Response.json({ policyId, token: "plaintext-token" }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      rotatePolicyToken({
        apiUrl: "http://127.0.0.1:3000",
        accountAddress: account,
        ownerPrivateKey,
        expectedPolicyId: policyId,
        deadline: 2_000,
      }),
    ).rejects.toThrow();
  });
});

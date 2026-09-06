import { fixturePaymentContext } from "../../../scripts/lib/payment-fixture.ts";
import { paymentPublicInputs } from "../../../packages/policy/src/index.ts";
import { describe, expect, it } from "vitest";
import { type Address, type Hex, toHex, zeroAddress } from "viem";
import {
  assertLocalPaymentUrl,
  payWithPolicyProof,
  validatePolicyPaymentProof,
} from "./pay-with-policy.ts";

const policyId = "00000000-0000-4000-8000-000000000001";
const otherPolicyId = "00000000-0000-4000-8000-000000000002";
const valueWei = 10n;
const commitment = toHex(20n, { size: 32 });
const ownerPrivateKey =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" as Hex;
const validResponse = {
  policyId,
  policyVersion: 2,
  proof: "0x1234",
  publicInputs: paymentPublicInputs({ ...fixturePaymentContext(), amount: valueWei, policyCommitment: BigInt(commitment) }),
};

describe("API-backed payment client", () => {
  it("accepts only loopback HTTP endpoints", () => {
    expect(() => assertLocalPaymentUrl("http://127.0.0.1:3000", "apiUrl")).not.toThrow();
    expect(() => assertLocalPaymentUrl("https://127.0.0.1:3000", "apiUrl")).toThrow(
      "apiUrl must use local HTTP address 127.0.0.1",
    );
    expect(() => assertLocalPaymentUrl("http://localhost:3000", "apiUrl")).toThrow(
      "apiUrl must use local HTTP address 127.0.0.1",
    );
    expect(() => assertLocalPaymentUrl("http://rpc.example.com", "rpcUrl")).toThrow(
      "rpcUrl must use local HTTP address 127.0.0.1",
    );
  });

  it("rejects a zero recipient before making network requests", async () => {
    await expect(
      payWithPolicyProof({
        apiUrl: "http://127.0.0.1:3000",
        rpcUrl: "http://127.0.0.1:8545",
        accountAddress: "0x0000000000000000000000000000000000001234",
        ownerPrivateKey,
        policyId,
        token: `zkp_${"a".repeat(43)}`,
        recipient: zeroAddress as Address,
        valueWei,
      }),
    ).rejects.toThrow("address must not be zero");
  });

  it("validates the complete proof response at the API boundary", () => {
    expect(
      validatePolicyPaymentProof(validResponse, {
        policyId,
        valueWei,
        context: fixturePaymentContext(), policyCommitment: commitment,
      }),
    ).toEqual(validResponse);
    expect(() =>
      validatePolicyPaymentProof(
        { ...validResponse, extra: true },
        { policyId, valueWei, context: fixturePaymentContext(), policyCommitment: commitment },
      ),
    ).toThrow();
    expect(() =>
      validatePolicyPaymentProof(
        { ...validResponse, proof: "0x1" },
        { policyId, valueWei, context: fixturePaymentContext(), policyCommitment: commitment },
      ),
    ).toThrow();
  });

  it("rejects proof identity and public inputs that differ from the intended transaction", () => {
    expect(() =>
      validatePolicyPaymentProof(validResponse, {
        policyId: otherPolicyId,
        valueWei,
        context: fixturePaymentContext(), policyCommitment: commitment,
      }),
    ).toThrow("unexpected policy");
    expect(() =>
      validatePolicyPaymentProof(validResponse, {
        policyId,
        valueWei: valueWei + 1n,
        context: fixturePaymentContext(), policyCommitment: commitment,
      }),
    ).toThrow("does not match the requested payment");
    expect(() =>
      validatePolicyPaymentProof(validResponse, {
        policyId,
        valueWei,
        context: fixturePaymentContext(), policyCommitment: toHex(21n, { size: 32 }),
      }),
    ).toThrow("does not match the account");
  });
});

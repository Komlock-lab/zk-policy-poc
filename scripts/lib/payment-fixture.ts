import { toHex, zeroAddress } from "viem";
import { type PaymentIntent, type PaymentContext } from "../../packages/policy/src/index.ts";

export function fixturePaymentIntent(amount = 10n): PaymentIntent {
  const recipient = "0x0000000000000000000000000000000000001234";
  return { kind: 0, recipient, asset: zeroAddress, amount, target: recipient, invoiceId: toHex(0n, { size: 32 }), issuedAt: 100n, validUntil: 400n };
}
export function fixturePaymentContext(): Omit<PaymentContext, "amount" | "policyCommitment"> {
  return { ...fixturePaymentIntent(), chainId: 31337n, account: "0x0000000000000000000000000000000000001234", dayId: 0n, spentBefore: 0n };
}
export function fixturePaymentRequest(amount = 10n) {
  return JSON.parse(JSON.stringify(fixturePaymentIntent(amount), (_key, value: unknown) => typeof value === "bigint" ? value.toString() : value));
}

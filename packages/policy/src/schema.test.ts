import { expect, it } from "vitest";
import { zeroAddress } from "viem";
import { normalizePolicy, policyFields, computePolicyCommitment, paymentPublicInputs } from "./index.ts";

it("normalizes native limits to the 65-field v2 commitment", async () => {
  const policy = normalizePolicy({ maxAmountWei: 100n, salt: 123456789n });
  const fields = policyFields(policy);
  expect(fields).toHaveLength(65);
  expect(fields[20]).toBe(1n);
  expect(fields[22]).toBe(100n);
  expect(fields[64]).toBe(123456789n);
  expect(await computePolicyCommitment(policy)).toBe(8681856271876768858477722514944831047648970978592868574920873064906263226319n);
  expect(await computePolicyCommitment(100n, 123456789n)).toBe(8681856271876768858477722514944831047648970978592868574920873064906263226319n);
});
it("serializes the ADR's 15 public inputs in order", () => {
  const recipient = "0x0000000000000000000000000000000000000002";
  expect(paymentPublicInputs({ kind: 0, chainId: 31337n, account: recipient, policyCommitment: 3n, recipient, asset: zeroAddress,
    amount: 10n, target: recipient, invoiceId: `0x${"00".repeat(32)}`, issuedAt: 100n, validUntil: 400n, dayId: 0n, spentBefore: 0n }).map(BigInt))
    .toEqual([2n,31337n,2n,3n,0n,2n,0n,10n,2n,0n,0n,100n,400n,0n,0n]);
});

it("binds ERC-20 target and asset with the token's exact amount", () => {
  const recipient = "0x0000000000000000000000000000000000002222";
  const token = "0x0000000000000000000000000000000000001111";
  const inputs = paymentPublicInputs({ kind: 1, chainId: 31337n, account: recipient, policyCommitment: 3n,
    recipient, asset: token, amount: 123n, target: token, invoiceId: `0x${"00".repeat(32)}`,
    issuedAt: 100n, validUntil: 400n, dayId: 0n, spentBefore: 0n }).map(BigInt);
  expect(inputs.slice(4, 9)).toEqual([1n, BigInt(recipient), BigInt(token), 123n, BigInt(token)]);
});

it("splits all 32 invoice bytes into the ordered u128 public inputs", () => {
  const recipient = "0x0000000000000000000000000000000000002222";
  const invoiceId = `0x${"ab".repeat(16)}${"cd".repeat(16)}` as const;
  const inputs = paymentPublicInputs({ kind: 2, chainId: 31337n, account: recipient, policyCommitment: 3n,
    recipient, asset: zeroAddress, amount: 123n, target: recipient, invoiceId,
    issuedAt: 100n, validUntil: 400n, dayId: 0n, spentBefore: 0n }).map(BigInt);
  expect(inputs.slice(4, 11)).toEqual([2n, BigInt(recipient), 0n, 123n, BigInt(recipient),
    BigInt(`0x${"ab".repeat(16)}`), BigInt(`0x${"cd".repeat(16)}`)]);
});

it("commits enabled daily budgets independently for each asset", () => {
  const token = "0x0000000000000000000000000000000000001111";
  const policy = normalizePolicy({ dailyEnabled: true, salt: 1n,
    assetRules: [{ asset: token, maxAmount: 10n, dailyLimit: 30n }, { asset: zeroAddress, maxAmount: 1n, dailyLimit: 3n }] });
  const fields = policyFields(policy);
  expect(fields.slice(20, 27)).toEqual([2n, 0n, 1n, 3n, BigInt(token), 10n, 30n]);
  expect(fields[63]).toBe(1n);
});

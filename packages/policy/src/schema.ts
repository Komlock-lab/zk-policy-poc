import { getAddress, toHex, zeroAddress, type Hex } from "viem";
import { z } from "zod";

import { U128_MAX } from "./amount.ts";

export const BN254_FIELD_MODULUS =
  21_888_242_871_839_275_222_246_405_745_257_275_088_548_364_400_416_034_343_698_204_186_575_808_495_617n;

export const fieldElementSchema = z.bigint().min(0n).lt(BN254_FIELD_MODULUS);

const uint = (max: bigint) => z.union([z.bigint(), z.string().regex(/^(0|[1-9][0-9]*)$/)]).transform(BigInt).pipe(z.bigint().min(0n).max(max));
export const u64Schema = uint((1n << 64n) - 1n);
export const amountSchema = uint(U128_MAX);
export const addressSchema = z.string().regex(/^0x[0-9a-fA-F]{40}$/).transform((v) => getAddress(v));
const saltSchema = uint((1n << 254n) - 1n).pipe(fieldElementSchema);
export const policySchema = z.object({
  schemaVersion: z.literal(2).default(2),
  maxValiditySeconds: u64Schema.default(300n),
  recipientEnabled: z.boolean().default(false),
  recipientAllowlist: z.array(addressSchema).max(16).default([]),
  assetRules: z.array(z.object({ asset: addressSchema, maxAmount: amountSchema, dailyLimit: amountSchema.default(0n) }).strict()).min(1).max(8),
  contractEnabled: z.boolean().default(false),
  contractAllowlist: z.array(addressSchema).max(16).default([]),
  dailyEnabled: z.boolean().default(false),
  salt: saltSchema,
}).strict();
export type Policy = z.output<typeof policySchema>;
export type PolicyInput = z.input<typeof policySchema>;

export function normalizePolicy(input: unknown): Policy {
  const legacy = z.object({ maxAmountWei: amountSchema, salt: saltSchema, maxValiditySeconds: u64Schema.default(300n) }).strict();
  const parsedLegacy = legacy.safeParse(input);
  const policy = policySchema.parse(parsedLegacy.success ? {
    assetRules: [{ asset: zeroAddress, maxAmount: parsedLegacy.data.maxAmountWei }],
    salt: parsedLegacy.data.salt, maxValiditySeconds: parsedLegacy.data.maxValiditySeconds,
  } : input);
  const sorted = <T>(values: T[], address: (value: T) => string): T[] => {
    const result = [...values].sort((a, b) => BigInt(address(a)) < BigInt(address(b)) ? -1 : 1);
    if (new Set(result.map((v) => address(v).toLowerCase())).size !== result.length) throw new Error("duplicate policy address");
    return result;
  };
  return {
    ...policy,
    recipientAllowlist: policy.recipientEnabled ? sorted(policy.recipientAllowlist, (v) => v) : [],
    contractAllowlist: policy.contractEnabled ? sorted(policy.contractAllowlist, (v) => v) : [],
    assetRules: sorted(policy.assetRules, (v) => v.asset).map((rule) => ({ ...rule, dailyLimit: policy.dailyEnabled ? rule.dailyLimit : 0n })),
  };
}

export function policyFields(input: Policy): bigint[] {
  const p = normalizePolicy(input);
  const padded = (values: bigint[], size: number) => [...values, ...Array<bigint>(size - values.length).fill(0n)];
  return [2n, p.maxValiditySeconds, BigInt(p.recipientEnabled), BigInt(p.recipientAllowlist.length),
    ...padded(p.recipientAllowlist.map(BigInt), 16), BigInt(p.assetRules.length),
    ...padded(p.assetRules.flatMap((r) => [BigInt(r.asset), r.maxAmount, r.dailyLimit]), 24),
    BigInt(p.contractEnabled), BigInt(p.contractAllowlist.length), ...padded(p.contractAllowlist.map(BigInt), 16),
    BigInt(p.dailyEnabled), p.salt];
}

export const paymentIntentSchema = z.object({
  kind: z.literal(0), recipient: addressSchema.refine((v) => v !== zeroAddress),
  asset: z.literal(zeroAddress), amount: amountSchema, target: addressSchema,
  invoiceId: z.string().regex(/^0x[0-9a-fA-F]{64}$/).transform((v) => v as Hex),
  issuedAt: u64Schema, validUntil: u64Schema,
}).strict().refine((v) => v.target === v.recipient && BigInt(v.invoiceId) === 0n && v.validUntil >= v.issuedAt, "invalid native payment context");
export type PaymentIntent = z.output<typeof paymentIntentSchema>;
export interface PaymentContext extends PaymentIntent { chainId: bigint; account: string; policyCommitment: bigint; dayId: bigint; spentBefore: bigint }
export const publicInputsSchema = z.array(z.string().regex(/^0x[0-9a-fA-F]{64}$/).transform((v) => v as Hex)).length(15);
export function paymentPublicInputs(context: PaymentContext): Hex[] {
  const c = paymentIntentSchema.parse(contextIntent(context));
  const invoice = BigInt(c.invoiceId);
  return [2n, u64Schema.parse(context.chainId), BigInt(addressSchema.parse(context.account)), fieldElementSchema.parse(context.policyCommitment),
    BigInt(c.kind), BigInt(c.recipient), BigInt(c.asset), c.amount, BigInt(c.target), invoice >> 128n, invoice & U128_MAX,
    c.issuedAt, c.validUntil, u64Schema.parse(context.dayId), amountSchema.parse(context.spentBefore)].map((v) => toHex(v, { size: 32 }));
}
function contextIntent({ kind, recipient, asset, amount, target, invoiceId, issuedAt, validUntil }: PaymentIntent): PaymentIntent {
  return { kind, recipient, asset, amount, target, invoiceId, issuedAt, validUntil };
}
export function serializePolicy(policy: Policy): unknown {
  return JSON.parse(JSON.stringify(policy, (_key, value: unknown) => typeof value === "bigint" ? value.toString() : value));
}

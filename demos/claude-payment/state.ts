import { getAddress, parseEther, type Hex, zeroAddress } from "viem";
import { z } from "zod";
import { policySchema, amountSchema } from "../../packages/policy/src/index.ts";

const address = z.string().regex(/^0x[0-9a-fA-F]{40}$/).transform((value) => getAddress(value));
const localUrl = z.string().url().refine((value) => {
  const url = new URL(value);
  return url.protocol === "http:" && url.hostname === "127.0.0.1" && !url.username && !url.password;
});
export const connectionSchema = z.object({ apiUrl: localUrl, controlToken: z.string().regex(/^[0-9a-f]{64}$/) }).strict();
export const demoConfigSchema = z.object({ apiUrl: localUrl, rpcUrl: localUrl, accountAddress: address,
  ownerPrivateKey: z.string().regex(/^0x[0-9a-fA-F]{64}$/).transform((v) => v as Hex),
  policyId: z.string().uuid(), token: z.string().regex(/^zkp_[A-Za-z0-9_-]{43}$/), recipient: address }).strict();
export const demoSessionSchema = demoConfigSchema.extend({ maxAmountWei: z.string().refine((value) => amountSchema.safeParse(value).success) });
export type DemoConfig = z.infer<typeof demoSessionSchema>;
export const demoPolicyRequest = z.object({ maxAmountWei: amountSchema }).strict();
export function configureDemoPolicy(template: unknown, maxAmountWei: bigint) {
  const policy = policySchema.omit({ salt: true }).parse(template);
  if (maxAmountWei < parseEther("0.1")) throw new Error("デモの送金額0.1 ETH以上の上限を入力してください");
  const native = policy.assetRules.find((rule) => rule.asset === zeroAddress);
  if (!native || !policy.dailyEnabled || native.dailyLimit < parseEther("0.2") || policy.maxValiditySeconds < 300n) {
    throw new Error("デモ用ポリシーのnative ETH・日次上限・有効期間を確認してください");
  }
  native.maxAmount = amountSchema.parse(maxAmountWei);
  return policy;
}

import { readFile } from "node:fs/promises";
import { expect, it } from "vitest";
import { parseEther, zeroAddress } from "viem";
import { configureDemoPolicy, connectionSchema, demoConfigSchema } from "./state.ts";

const template = JSON.parse(await readFile(new URL("./policy.json", import.meta.url), "utf8"));
it("replaces only the native limit and preserves the demo policy conditions", () => {
  const policy = configureDemoPolicy(template, parseEther("0.3"));
  expect(policy.assetRules.find((rule) => rule.asset === zeroAddress)?.maxAmount).toBe(parseEther("0.3"));
  expect(policy.assetRules[0]?.dailyLimit).toBe(parseEther("1"));
  expect(policy.recipientAllowlist).toEqual(template.recipientAllowlist);
  expect(policy.maxValiditySeconds).toBe(300n);
  expect(policy.dailyEnabled).toBe(true);
  expect(template.assetRules[0].maxAmount).toBe(parseEther("0.1").toString());
});
it("rejects limits that cannot fund the fixed demo before registration", () => {
  expect(() => configureDemoPolicy(template, parseEther("0.09"))).toThrow("0.1 ETH");
});
it("requires daily accounting and sufficient validity for both scenarios", () => {
  expect(() => configureDemoPolicy({ ...template, dailyEnabled: false }, parseEther("0.1"))).toThrow();
  expect(() => configureDemoPolicy({ ...template, maxValiditySeconds: "1" }, parseEther("0.1"))).toThrow();
});
it.each(["https://127.0.0.1:3000", "http://example.com", "http://secret@127.0.0.1:3000"])("rejects non-local or credential-bearing control URLs %s", (apiUrl) => {
  expect(connectionSchema.safeParse({ apiUrl, controlToken: "ab".repeat(32) }).success).toBe(false);
});
it("validates session credentials without accepting extra fields", () => {
  expect(demoConfigSchema.safeParse({}).success).toBe(false);
  expect(connectionSchema.safeParse({ apiUrl: "http://127.0.0.1:3000", controlToken: "ab".repeat(32), ownerPrivateKey: "secret" }).success).toBe(false);
});

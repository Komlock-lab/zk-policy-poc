import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { zeroAddress } from "viem";
import { readOwnerPolicyArguments } from "./policy-input.ts";

it("keeps native numeric CLI defaults and explicit validity", async () => {
  expect(await readOwnerPolicyArguments(["100"])).toEqual({ maxAmountWei: 100n, maxValiditySeconds: 300n });
  expect(await readOwnerPolicyArguments(["100", "120"])).toEqual({ maxAmountWei: 100n, maxValiditySeconds: 120n });
});
it("reads Owner policy JSON with recipient membership enabled", async () => {
  const directory = await mkdtemp(join(tmpdir(), "owner-policy-"));
  try {
    const path = join(directory, "policy.json");
    const recipient = "0x0000000000000000000000000000000000000001";
    await writeFile(path, JSON.stringify({ recipientEnabled: true, recipientAllowlist: [recipient],
      assetRules: [{ asset: zeroAddress, maxAmount: "100" }] }), { mode: 0o600 });
    expect(await readOwnerPolicyArguments(["--policy-file", path])).toMatchObject({ policy: {
      schemaVersion: 2, recipientEnabled: true, recipientAllowlist: [recipient], maxValiditySeconds: 300n,
      assetRules: [{ asset: zeroAddress, maxAmount: 100n, dailyLimit: 0n }],
    } });
  } finally { await rm(directory, { recursive: true, force: true }); }
});

it("reads updated per-asset daily budgets from Owner JSON", async () => {
  const directory = await mkdtemp(join(tmpdir(), "owner-daily-policy-"));
  try {
    const path = join(directory, "policy.json");
    const token = "0x0000000000000000000000000000000000001111";
    await writeFile(path, JSON.stringify({ dailyEnabled: true, assetRules: [
      { asset: token, maxAmount: "100", dailyLimit: "500" },
      { asset: zeroAddress, maxAmount: "100", dailyLimit: "200" },
    ] }), { mode: 0o600 });
    expect(await readOwnerPolicyArguments(["--policy-file", path])).toMatchObject({ policy: {
      dailyEnabled: true, assetRules: [
        { asset: token, maxAmount: 100n, dailyLimit: 500n },
        { asset: zeroAddress, maxAmount: 100n, dailyLimit: 200n },
      ],
    } });
  } finally { await rm(directory, { recursive: true, force: true }); }
});

import { readFile } from "node:fs/promises";
import { createInterface } from "node:readline/promises";
import { parseEther } from "viem";
import { z } from "zod";
import { amountSchema, policySchema, u64Schema } from "../../../packages/policy/src/index.ts";

export async function readOwnerPolicyArguments(args: string[]) {
  if (args[0] === "--policy-file") {
    const [, path] = z.tuple([z.literal("--policy-file"), z.string().min(1)]).parse(args);
    try {
      const policy = policySchema.omit({ salt: true }).parse(JSON.parse(await readFile(path, "utf8")));
      return { policy };
    } catch {
      throw new Error("Unable to read a valid policy JSON file");
    }
  }
  const [maxAmountWei, maxValiditySeconds] = z.tuple([amountSchema, u64Schema.optional()]).parse(args);
  return { maxAmountWei, maxValiditySeconds: maxValiditySeconds ?? 300n };
}

export async function readCreatePolicyArguments(args: string[]) {
  if (args.length > 0) return readOwnerPolicyArguments(args);

  const readline = createInterface({ input: process.stdin, output: process.stderr });
  try {
    const answer = await readline.question("上限金額（ETH）を入力してください: ");
    const amount = z.string().trim().regex(/^[0-9]+(?:\.[0-9]{1,18})?$/).safeParse(answer);
    if (!amount.success) {
      throw new Error("上限金額は小数点以下18桁以内の非負のETH金額で入力してください");
    }
    const maxAmountWei = amountSchema.safeParse(parseEther(amount.data));
    if (!maxAmountWei.success) throw new Error("上限金額がポリシーの許容範囲を超えています");
    return { maxAmountWei: maxAmountWei.data, maxValiditySeconds: 300n };
  } finally {
    readline.close();
  }
}

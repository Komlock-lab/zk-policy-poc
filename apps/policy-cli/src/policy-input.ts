import { readFile } from "node:fs/promises";
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

import { afterEach, expect, it, vi } from "vitest";
import { parseEther } from "viem";
import { readCreatePolicyArguments } from "./policy-input.ts";

const { question, close, createInterface } = vi.hoisted(() => {
  const question = vi.fn();
  const close = vi.fn();
  return { question, close, createInterface: vi.fn(() => ({ question, close })) };
});
vi.mock("node:readline/promises", () => ({ createInterface }));
afterEach(() => vi.clearAllMocks());

it.each(["0.1", " 0.1 ", "0", "0.000000000000000001"])("converts interactive ETH input %s to wei", async (answer) => {
  question.mockResolvedValue(answer);
  expect(await readCreatePolicyArguments([])).toEqual({ maxAmountWei: parseEther(answer.trim()), maxValiditySeconds: 300n });
  expect(question).toHaveBeenCalledWith("上限金額（ETH）を入力してください: ");
  expect(close).toHaveBeenCalledOnce();
});

it.each(["", " ", "-1", "1e3", "abc", "0.0000000000000000001", "340282366920938463464"])("rejects invalid or out-of-range input %s", async (answer) => {
  question.mockResolvedValue(answer);
  await expect(readCreatePolicyArguments([])).rejects.toThrow("上限金額");
  expect(close).toHaveBeenCalledOnce();
});

it("closes the prompt when input is interrupted", async () => {
  question.mockRejectedValue(new Error("input closed"));
  await expect(readCreatePolicyArguments([])).rejects.toThrow("input closed");
  expect(close).toHaveBeenCalledOnce();
});

it("preserves explicit wei and validity arguments without prompting", async () => {
  expect(await readCreatePolicyArguments(["100", "120"])).toEqual({ maxAmountWei: 100n, maxValiditySeconds: 120n });
  expect(createInterface).not.toHaveBeenCalled();
});

it("validates policy-file arguments without prompting", async () => {
  await expect(readCreatePolicyArguments(["--policy-file"])).rejects.toThrow();
  expect(createInterface).not.toHaveBeenCalled();
});

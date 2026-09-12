import { describe, expect, it } from "vitest";
import { formatDemoGuide } from "./output.ts";

const input = {
  maxAmountWei: 300000000000000000n,
  rpcUrl: "http://127.0.0.1:8545",
  accountAddress: "0x1111111111111111111111111111111111111111",
  recipient: "0x2222222222222222222222222222222222222222",
  resultsPath: "/tmp/demo/demo-results.jsonl",
  normalPrompt: "正常系の依頼\n",
  abnormalPrompt: "異常系の依頼\n",
};

describe("formatDemoGuide", () => {
  it("guides receipt checks before shutdown using this run's RPC and recipient", () => {
    const output = formatDemoGuide(input);
    const steps = ["01  正常系", "02  異常系", "03  レシート", "04  デモを終了"];
    const positions = steps.map(step => output.indexOf(step));
    expect(positions.every(position => position >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
    expect(output).toContain(`cast receipt <正常系のtransactionHash> --rpc-url ${input.rpcUrl}`);
    expect(output).toContain(`cast receipt <異常系のtransactionHash> --rpc-url ${input.rpcUrl}`);
    expect(output).toContain(`cast balance ${input.recipient} --ether --rpc-url ${input.rpcUrl}`);
    expect(output).toContain("status: 1 (success)");
    expect(output).toContain("status: 0 (failed)");
    expect(output).toContain(input.resultsPath);
    expect(output).toContain("送金上限額   0.3 ETH / 回");
    expect(output).toContain("デモ送金額   0.1 ETH");
    expect(output).toContain("正常系の依頼\n\n");
    expect(output).not.toContain("\x1b[");
  });

  it("adds optional terminal color without changing guide content", () => {
    const colored = formatDemoGuide(input, true);
    expect(colored).toContain("\x1b[1;36m");
    expect(colored.replace(/\x1b\[[0-9;]*m/g, "")).toBe(formatDemoGuide(input));
  });
});

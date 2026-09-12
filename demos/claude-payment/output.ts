import { formatEther } from "viem";

export interface DemoGuideInput {
  rpcUrl: string;
  accountAddress: string;
  recipient: string;
  maxAmountWei: bigint;
  resultsPath: string;
  normalPrompt: string;
  abnormalPrompt: string;
}

export function formatDemoGuide(input: DemoGuideInput, color = false): string {
  const rule = "─".repeat(64);
  const title = (text: string) => color ? `\x1b[1;36m${text}\x1b[0m` : text;
  const muted = (text: string) => color ? `\x1b[2m${text}\x1b[0m` : text;
  const step = (number: string, text: string, where: string) =>
    title(`  ${number}  ${text}`) + muted(`  /  ${where}`);

  return [
    "",
    muted(rule),
    muted("  起動ログここまで"),
    "",
    title("  ZK POLICY  /  PAYMENT DEMO"),
    "  上限内の送金は成功。金額の改ざんはオンチェーンで拒否。",
    muted(rule),
    "",
    `  RPC          ${input.rpcUrl}`,
    `  Account      ${input.accountAddress}`,
    `  Recipient    ${input.recipient}`,
    "  デモ送金額   0.1 ETH",
    `  送金上限額   ${formatEther(input.maxAmountWei)} ETH / 回`,
    "",
    step("01", "正常系 — 0.1 ETHを送金", "Claude Code"),
    "",
    `  ${input.normalPrompt.trim()}`,
    "",
    muted("  確認する結果：success / 受取先残高 +0.1 ETH"),
    "",
    step("02", "異常系 — 実行金額を0.2 ETHに改ざん", "Claude Code"),
    "",
    `  ${input.abnormalPrompt.trim()}`,
    "",
    muted("  確認する結果：reverted / 受取先残高の変化なし"),
    "",
    step("03", "レシートと残高をRPCで確認", "別のターミナル"),
    "",
    "  Claude Codeは開いたまま、次のコマンドを実行します。",
    "  <正常系のtransactionHash>・<異常系のtransactionHash>は",
    "  各ステップでClaudeが返したハッシュに置き換えてください。",
    "",
    `  cast receipt <正常系のtransactionHash> --rpc-url ${input.rpcUrl}`,
    muted("  → status: 1 (success)"),
    "",
    `  cast receipt <異常系のtransactionHash> --rpc-url ${input.rpcUrl}`,
    muted("  → status: 0 (failed)"),
    "",
    `  cast balance ${input.recipient} --ether --rpc-url ${input.rpcUrl}`,
    muted("  → 0.1 ETH（正常系・異常系を各1回実行した後）"),
    "",
    step("04", "デモを終了", "Claude Code"),
    "",
    "  /exit",
    "",
    muted("  Anvilが停止します。RPCの確認は終了前に行ってください。"),
    "",
    muted("  実行結果"),
    `  ${input.resultsPath}`,
    "",
    muted(rule),
    "  Claude Codeを起動します。STEP 01から順に進めてください。",
    "",
  ].join("\n");
}

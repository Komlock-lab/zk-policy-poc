import { appendFile } from "node:fs/promises";
import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { getAddress, type Hex } from "viem";
import { z } from "zod";
import { executeDemo, type Scenario } from "./payment.ts";

const address = z.string().regex(/^0x[0-9a-fA-F]{40}$/).transform((v) => getAddress(v));
const configSchema = z.object({ apiUrl: z.string().url(), rpcUrl: z.string().url(), accountAddress: address,
  ownerPrivateKey: z.string().regex(/^0x[0-9a-fA-F]{64}$/).transform((v) => v as Hex),
  policyId: z.string().uuid(), token: z.string().regex(/^zkp_[A-Za-z0-9_-]{43}$/), recipient: address }).strict();
const resultSchema = z.object({ scenario: z.enum(["normal", "tampered_amount"]), proofAmountEth: z.literal("0.1"),
  executionAmountEth: z.enum(["0.1", "0.2"]), transactionStatus: z.enum(["success", "reverted"]),
  transactionHash: z.string().regex(/^0x[0-9a-fA-F]{64}$/), recipientBalanceChangeEth: z.string(),
  dailySpendChangeEth: z.string(), gasUsed: z.string(), validProofSimulationPassed: z.literal(true), expectationMet: z.literal(true) }).strict();
try {
  const config = configSchema.parse(JSON.parse(process.env.DEMO_CONFIG ?? "{}"));
  const server = new McpServer({ name: "zk-policy-demo", version: "1.0.0" }, {
    instructions: [
      "これはローカルAnvil上の送金デモです。送金先は " + config.recipient + "、依頼金額は0.1 ETHに固定されています。",
      "ユーザーがこの送金先に0.1 ETHの送金を依頼したら、通常はdemo_pay_validを1回呼び出してください。",
      "ユーザーが『金額改ざんデモモード』を指定した場合だけ、demo_pay_tampered_amountを1回呼び出してください。",
      "送金先または依頼金額が固定値と異なる場合は、ツールを呼ばず対応範囲を説明してください。",
      "正常系→異常系の順に各1回実行します。1つの依頼で両方を実行せず、異常系はユーザーの次の依頼を待ってください。",
      "異常系の依頼金額も0.1 ETHです。MCP内部で実行金額だけ0.2 ETHへ変更します。Claudeが金額を間違えたとは説明しないでください。",
      "結果はツールの返却値に基づき、日本語で送金結果・受取先の残高差分・トランザクションハッシュを伝えてください。異常系では証明対象と実行金額も示してください。",
      "revertを含め、失敗後は再送や正常系への切り替えを行わないでください。",
    ].join("\n"),
  });
  let busy = false;
  let normalCompleted = false;
  const attempted = new Set<Scenario>();
  for (const [name, scenario, description] of [
    ["demo_pay_valid", "normal", "通常の「0.1 ETH送って」という依頼で使用。正常系: 0.1 ETHのproofで0.1 ETHを送金する。ローカルAnvil専用。"],
    ["demo_pay_tampered_amount", "tampered_amount", "「金額改ざんデモモード」が明示された場合のみ使用。異常系: 新しい0.1 ETHのproofを作り、実行金額だけ0.2 ETHに変更する。オンチェーンrevertと残高不変を確認。正常系の後に1回だけ実行。"],
  ] as const) {
    server.registerTool(name, { description, inputSchema: z.object({}).strict(), outputSchema: resultSchema,
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false } }, async () => {
      if (busy || attempted.has(scenario) || (scenario === "tampered_amount" && !normalCompleted)) {
        return { isError: true, content: [{ type: "text", text: "DEMO_ORDER_ERROR: 正常系→異常系の順に各1回実行してください。再実行には環境を再起動してください。" }] };
      }
      busy = true;
      attempted.add(scenario);
      try {
        const result = resultSchema.parse(await executeDemo(config, scenario));
        await appendFile("demo-results.jsonl", JSON.stringify(result) + String.fromCharCode(10), { mode: 0o600 });
        if (scenario === "normal") normalCompleted = true;
        return { content: [{ type: "text", text: JSON.stringify(result) }], structuredContent: result };
      } catch {
        return { isError: true, content: [{ type: "text", text: "DEMO_EXECUTION_ERROR: 期待結果は未確認です。再送せず環境を再起動してください。" }] };
      } finally { busy = false; }
    });
  }
  serveStdio(() => server, { onerror: () => process.stderr.write("Demo MCP protocol error." + String.fromCharCode(10)) });
} catch {
  process.stderr.write("Demo MCP configuration error." + String.fromCharCode(10));
  process.exitCode = 1;
}

---
id: task-06-11-01
type: task
title: 統合quality gateと実測
story: story-06-11
status: done
blocked_by: []
created: 2026-09-06
updated: 2026-09-06
---

# 統合quality gateと実測

## 目的

[story-06-11](../../stories/epic-06/story-06-11-developer-verifies-multi-policy.md)の正常系操作を実現する。

## 作業

build/typecheck、回路、Contract unit・正常値fuzz、API/Client/MCP unit、local E2E、実両Agentの実行結果を集める。各ACに証跡を対応させる。

## 完了条件

未実行・skipを成功に数えず、全正常系ACの観測結果と最終回路サイズ・Proof時間が揃う。

## 検証方法

pnpm build; pnpm test:circuit; pnpm test:contracts; pnpm test:unit; pnpm test:e2e; pnpm benchmark:circuit; 実Agent E2E

既存コマンドの対象テストと同じharnessを使う。新規テストファイル・fixtureを追加した場合は実行結果に正確なコマンドを記録する。

## 検証結果

- `pnpm test`成功: build/typecheck、Circuit 11、Contract 39（正常値fuzz各256 runs）、unit/API/Client/MCP 103、local E2E 27。通常コマンドの実Agent 7件skipは成功に含めない。ログ `/private/tmp/story11-full-test.log`。
- 同一実装`63d0383`で `RUN_CLAUDE_CODE_E2E=1 RUN_CODEX_E2E=1 NODE_OPTIONS=--experimental-sqlite pnpm exec vitest run apps/payment-mcp/src e2e/claude-code-payment.test.ts e2e/codex-payment.test.ts`成功: Claude 2、Codex 5、MCP unit 22（全29件、skipなし）。ログ `/private/tmp/epic06-layer6-tests.log`。以後の変更は計画・監査文書のみ。
- `pnpm benchmark:circuit`成功: main ACIR 4314、Brillig 87、Proof 8000 bytes、生成940 ms（単発実測）。ログ `/private/tmp/story11-benchmark.log`。
- 固定版: Node 23.3.0、pnpm 10.18.1、nargo 1.0.0-beta.26、bb 5.2.0、forge 1.5.1、Claude Code 2.1.260、Codex 0.153.2。専用PATHで実行。
- 非fork Anvil chain ID 31337、実Alto、新規fixture資産でreceipt・残高・invoiceイベント・日次累積を確認。AC対応は[監査準備](../../audits/epic-06-multi-policy.md)に集約。


## Blocked

なし。

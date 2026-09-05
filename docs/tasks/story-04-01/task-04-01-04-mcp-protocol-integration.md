---
id: task-04-01-04
type: task
title: MCP protocol統合テスト
story: story-04-01
status: done
blocked_by: [task-04-01-03]
created: 2026-09-05
updated: 2026-09-05
---

# MCP protocol統合テスト

## 目的

実stdio transport越しのTool discovery、validation、決済結果を確認する。

## 作業

- MCP Client test harnessからServer processへ接続する。
- Tool一覧が`pay_native`だけであることを確認する。
- 正常決済、入力不正、local-only不一致、downstream失敗を確認する。

## 完了条件

- protocol越しの全受け入れ条件が安定して再現する。

## 検証方法

- Payment MCP integration test
- `pnpm typecheck`

## 検証結果

- `pnpm vitest run apps/payment-mcp`: 実stdio processのTool discovery、正常呼出し、schema拒否、downstream error sanitizationを含む15 tests成功。
- `pnpm typecheck`: 成功。

## Blocked

なし。

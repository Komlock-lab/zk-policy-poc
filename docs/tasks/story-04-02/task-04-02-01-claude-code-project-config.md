---
id: task-04-02-01
type: task
title: Claude Code project設定と自動許可
story: story-04-02
status: done
blocked_by: []
created: 2026-09-05
updated: 2026-09-05
---

# Claude Code project設定と自動許可

## 目的

Claude Codeが共有Serverの決済Toolだけを追加承認なしに利用できるようにする。

## 作業

- `.mcp.json`へproject-scoped stdio Serverを追加する。
- credential値をcommitせず環境変数参照だけを設定する。
- Claude設定で`pay_native`だけをallowし、他のToolを許可しない。
- Claude Code 2.1.260で接続状態とTool discoveryを確認する。

## 完了条件

- workspace trust後にServerが接続し、決済Tool呼出しで追加承認が発生しない。

## 検証方法

- `claude mcp get zk-policy-payment`
- Claude Code Tool discovery smoke test

## 検証結果

- `PATH="...node-v23.3.0..." pnpm vitest run apps/payment-mcp/src/claude-config.test.ts`: 1 file / 2 tests passed。project stdio entryが共有`apps/payment-mcp`を指し、credential値ではなく`${POLICY_*}`参照だけを持つこと、allow ruleが`mcp__zk-policy-payment__pay_native`だけであることを確認した。
- `claude mcp get zk-policy-payment`（Claude Code 2.1.260、local placeholder設定）: `.mcp.json`のproject scope、stdio command、全環境変数参照を認識した。未trust workspaceでは期待どおり`Pending approval`となり、後続の実Agent E2Eでは同Serverへ接続してToolをdiscoverした。
- `PATH="...node-v23.3.0..." pnpm typecheck`: passed。

## Blocked

なし。

---
id: task-04-01-01
type: task
title: MCP workspaceと依存関係
story: story-04-01
status: pending
blocked_by: []
created: 2026-09-05
updated: 2026-09-05
---

# MCP workspaceと依存関係

## 目的

共有stdio MCP Serverを既存monorepo内でbuild、testできる基盤を作る。

## 作業

- `apps/payment-mcp`をworkspaceへ追加する。
- `@modelcontextprotocol/server` 2.0.0を固定し、既存Zodを使用する。
- Server起動script、TypeScript対象、unit test対象を追加する。

## 完了条件

- 最小Serverがstdioで起動し、typecheckと依存lockが再現可能である。

## 検証方法

- `pnpm typecheck`
- MCP Server起動test

## 検証結果

未実施。

## Blocked

なし。

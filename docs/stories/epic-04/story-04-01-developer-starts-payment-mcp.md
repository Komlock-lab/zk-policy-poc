---
id: story-04-01
type: story
title: DeveloperがPolicy決済MCP Serverを起動する
epic: epic-04
status: approved
depends_on: []
adrs: [adr-0010, adr-0011]
created: 2026-09-05
updated: 2026-09-05
---

# DeveloperがPolicy決済MCP Serverを起動する

## ユーザーアクション

DeveloperはPhase 3決済Clientを狭い構造化Toolとして公開するlocal stdio MCP Serverを起動できる。

## 背景

Agent固有処理を決済ロジックへ混ぜず、秘密を公開しない共通接続境界が必要である。

## スコープ

### 含むもの

- MCP Server workspace、`pay_native`、設定とprotocol test
- Phase 3 Client adapter、structured result、秘密を除去したerror

### 含まないもの

- Host固有設定、自然言語E2E、任意call、remote transport

## 受け入れ条件

### 正常系

- AC-1 [正常系]: Given 必須local設定がある / When Developerがstdio Serverへ接続する / Then Clientが`pay_native`だけを検出する
- AC-2 [正常系]: Given activeな0.1 ETH Policyがある / When MCP Clientが0.01 ETHのIntentを送る / Then UserOperation決済が成功し公開receiptだけを返す

### 異常系

- AC-3 [異常系]: Given 不正またはzero recipientがある / When Toolを呼ぶ / Then network接続前にschema errorで拒否する
- AC-4 [異常系]: Given 不正なdecimal `valueWei`がある / When Toolを呼ぶ / Then network接続前にschema errorで拒否する
- AC-5 [異常系]: Given 必須credentialが欠落している / When Serverを起動する / Then 値を表示せず設定名を示して失敗する
- AC-6 [異常系]: Given 非loopback endpointまたはchain不一致がある / When Toolを呼ぶ / Then UserOperationを送信せず拒否する
- AC-7 [異常系]: Given downstreamが秘密を含むerrorを返す / When ServerがMCP errorへ変換する / Then 秘密を除去した固定分類だけを返す

## アーキテクチャ制約

- [epic-04](../../epics/epic-04-agent-integration.md)の不変条件を維持する。
- [adr-0010](../../adr/adr-0010-shared-stdio-mcp-payment-interface.md)、[adr-0011](../../adr/adr-0011-autonomous-policy-authorization-and-secret-boundary.md)に従う。
- [Agent Policy Payment Boundary](../../../llm-wiki/wiki/concepts/agent-policy-payment-boundary.md)を参照する。

## Task

| ID | Task | Status |
| --- | --- | --- |
| [task-04-01-01](../../tasks/story-04-01/task-04-01-01-mcp-workspace-and-dependency.md) | MCP workspaceと依存関係 | pending |
| [task-04-01-02](../../tasks/story-04-01/task-04-01-02-payment-tool-adapter.md) | Policy決済Tool adapter | pending |
| [task-04-01-03](../../tasks/story-04-01/task-04-01-03-secret-and-error-boundary.md) | 秘密情報とerror境界 | pending |
| [task-04-01-04](../../tasks/story-04-01/task-04-01-04-mcp-protocol-integration.md) | MCP protocol統合テスト | pending |

## 検証結果

未実施。

## Blocked

なし。

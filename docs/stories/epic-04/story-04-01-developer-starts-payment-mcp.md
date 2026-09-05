---
id: story-04-01
type: story
title: DeveloperがPolicy決済MCP Serverを起動する
epic: epic-04
status: in-progress
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
| [task-04-01-01](../../tasks/story-04-01/task-04-01-01-mcp-workspace-and-dependency.md) | MCP workspaceと依存関係 | done |
| [task-04-01-02](../../tasks/story-04-01/task-04-01-02-payment-tool-adapter.md) | Policy決済Tool adapter | done |
| [task-04-01-03](../../tasks/story-04-01/task-04-01-03-secret-and-error-boundary.md) | 秘密情報とerror境界 | done |
| [task-04-01-04](../../tasks/story-04-01/task-04-01-04-mcp-protocol-integration.md) | MCP protocol統合テスト | done |

## 検証結果

- AC-1: stdio integration testで公開Toolが`pay_native`だけであることを確認。
- AC-2: 実stdio MCP processからProof API、Alto、EntryPointまで通すE2Eで0.01 ETH決済と公開receiptだけの応答を確認。
- AC-3、AC-4: schema testでzero/不正addressと不正decimal weiをexecutor呼出し前に拒否することを確認。
- AC-5、AC-6: config testでcredential欠落とremote endpointをServer起動または接続前に拒否することを確認。
- AC-7: protocol handlerがdownstream errorを固定`PAYMENT_REJECTED`へ変換し、secret canaryを返さないことを確認。
- `pnpm typecheck`: 成功。
- `pnpm vitest run apps/payment-mcp`: 3 files、13 tests成功。
- `pnpm vitest run e2e/payment-mcp.test.ts`: 実local stackの2 tests成功。
- `pnpm test:unit`: 16 files、86 tests成功。
- `pnpm build`: Noir verifier生成、Forge build、TypeScript typecheck成功。

## Blocked

なし。

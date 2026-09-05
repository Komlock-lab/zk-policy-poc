---
id: story-04-03
type: story
title: 利用者がCodexからPolicy決済する
epic: epic-04
status: approved
depends_on: [story-04-01]
adrs: [adr-0010, adr-0011]
created: 2026-09-05
updated: 2026-09-05
---

# 利用者がCodexからPolicy決済する

## ユーザーアクション

利用者はCodexへ自然言語で依頼し、追加承認なしにPolicy内のnative tokenを送金できる。

## 背景

共有ToolがCodexの実Hostから正しく選択され、決済結果まで到達することを確認する。

## スコープ

### 含むもの

- project MCP設定、Tool限定approval、Codex CLI 0.153.2 E2E

### 含まないもの

- Server実装、Codex cloud、Remote MCP、plugin packaging

## 受け入れ条件

### 正常系

- AC-1 [正常系]: Given trusted projectと接続済みServerがある / When 利用者がrecipientへ0.01 ETHを送るよう依頼する / Then Codexが`pay_native`を追加承認なしに呼びreceipt成功と残高増加を返す

### 異常系

- AC-2 [異常系]: Given 0.1 ETH Policyがある / When 利用者が1 ETH送金を依頼する / Then Proof APIが拒否しUserOperationを送信しない
- AC-3 [異常系]: Given 不正recipientを含む依頼がある / When CodexがToolを呼ぶ / Then MCP schemaが拒否し送金しない
- AC-4 [異常系]: Given 決済が失敗する / When Codexが結果を説明する / Then transcriptへOwner Key、Policy Token、Proofを含めない

## アーキテクチャ制約

- [epic-04](../../epics/epic-04-agent-integration.md)、[adr-0010](../../adr/adr-0010-shared-stdio-mcp-payment-interface.md)、[adr-0011](../../adr/adr-0011-autonomous-policy-authorization-and-secret-boundary.md)に従う。
- [Codex MCP](../../../llm-wiki/wiki/articles/codex-mcp.md)を参照する。

## Task

| ID | Task | Status |
| --- | --- | --- |
| [task-04-03-01](../../tasks/story-04-03/task-04-03-01-codex-project-config.md) | Codex project設定と自動許可 | pending |
| [task-04-03-02](../../tasks/story-04-03/task-04-03-02-codex-payment-e2e.md) | Codex自然言語決済E2E | pending |

## 検証結果

未実施。

## Blocked

なし。

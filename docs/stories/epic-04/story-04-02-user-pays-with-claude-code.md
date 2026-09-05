---
id: story-04-02
type: story
title: 利用者がClaude CodeからPolicy決済する
epic: epic-04
status: done
depends_on: [story-04-01]
adrs: [adr-0010, adr-0011]
created: 2026-09-05
updated: 2026-09-05
---

# 利用者がClaude CodeからPolicy決済する

## ユーザーアクション

利用者はClaude Codeへ自然言語で依頼し、追加承認なしにPolicy内のnative tokenを送金できる。

## 背景

共有ToolがClaude Codeの実Hostから正しく選択され、決済結果まで到達することを確認する。

## スコープ

### 含むもの

- project MCP設定、Tool限定allow rule、Claude Code 2.1.260 E2E

### 含まないもの

- Server実装、Remote Control、Agent SDK、非対話automation

## 受け入れ条件

### 正常系

- AC-1 [正常系]: Given trusted projectと接続済みServerがある / When 利用者がrecipientへ0.01 ETHを送るよう依頼する / Then Claude Codeが`pay_native`を追加承認なしに呼びreceipt成功と残高増加を返す

### 異常系

- AC-2 [異常系]: Given 0.1 ETH Policyがある / When 利用者が1 ETH送金を依頼する / Then Proof APIが拒否しUserOperationを送信しない
- AC-3 [異常系]: Given 不正recipientを含む依頼がある / When Claude CodeがToolを呼ぶ / Then MCP schemaが拒否し送金しない
- AC-4 [異常系]: Given 決済が失敗する / When Claude Codeが結果を説明する / Then transcriptへOwner Key、Policy Token、Proofを含めない

## アーキテクチャ制約

- [epic-04](../../epics/epic-04-agent-integration.md)、[adr-0010](../../adr/adr-0010-shared-stdio-mcp-payment-interface.md)、[adr-0011](../../adr/adr-0011-autonomous-policy-authorization-and-secret-boundary.md)に従う。
- [Claude Code MCP](../../../llm-wiki/wiki/articles/claude-code-mcp.md)を参照する。

## Task

| ID | Task | Status |
| --- | --- | --- |
| [task-04-02-01](../../tasks/story-04-02/task-04-02-01-claude-code-project-config.md) | Claude Code project設定と自動許可 | done |
| [task-04-02-02](../../tasks/story-04-02/task-04-02-02-claude-code-payment-e2e.md) | Claude Code自然言語決済E2E | done |

## 検証結果

- AC-1: `RUN_CLAUDE_CODE_E2E=1 NODE_OPTIONS=--experimental-sqlite pnpm vitest run e2e/claude-code-payment.test.ts`でClaude Code 2.1.260が自然言語から0.01 ETHの`pay_native`を追加承認なしに呼び、receipt成功、recipient残高+0.01 ETH、EntryPoint nonce+1を確認した（1 file / 1 test passed）。
- AC-2: 同じ実Agent sessionで1 ETHをToolへ渡し、`PAYMENT_REJECTED`後に残高とnonceが変化しないことを確認した。
- AC-3: 同じ実Agent sessionで`not-an-address`をToolへ渡し、schema拒否後に残高とnonceが変化しないことを確認した。
- AC-4: stream-json transcriptにOwner Key、Policy Token、Proof fieldがないことをcanary値との照合で確認した。
- project設定: `pnpm vitest run apps/payment-mcp/src/claude-config.test.ts`は2 tests passed。`.mcp.json`がcredentialの環境変数参照だけを渡し、`.claude/settings.json`が`pay_native`だけをallowすることを確認した。
- 回帰・静的検証: 最新Epic統合後の`pnpm build`、`pnpm test:unit`（18 files / 90 tests）、`pnpm typecheck`、`node scripts/validate-planning.mjs`、`git diff --check`はいずれもpassed。

## Blocked

なし。

---
id: story-06-09
type: story
title: 利用者がClaude Codeから複合Policyで支払う
epic: epic-06
status: done
depends_on: [story-06-06]
adrs: [adr-0012, adr-0013, adr-0014]
created: 2026-09-06
updated: 2026-09-06
---

# 利用者がClaude Codeから複合Policyで支払う

## ユーザーアクション

利用者がClaude Codeから複合Policyで支払う。

## 背景

承認済み[epic-06](../../epics/epic-06-multi-policy.md)の複合条件を、観測可能な操作として実現する。

## スコープ

### 含むもの

- Claude Codeの3決済Tool設定
- 実Claude Codeの複合Policy決済E2E

### 含まないもの

- 新規の異常系・攻撃検証、同時送信、Risk Score全体、本番配置、実資産
- EpicおよびADRにない決済種別・PolicyのOR選択

## 受け入れ条件

### 正常系

- AC-1 [正常系]: Given 全条件を有効化したPolicyと3 Toolを許可した実Claude Code / When 利用者がnative・ERC-20・Contract決済を順番に自然言語で依頼する / Then 追加の決済承認なしに各receipt・残高・累積を確認できる

### 異常系

2026-09-06のユーザー指定により延期する。根拠はEpicのerror_acceptance_authorizationに記録済み。実施済み・成功とは扱わない。

## アーキテクチャ制約

- Epicの「Storyをまたぐ不変条件」と15公開入力の順序・型を維持する。
- [adr-0012](../../adr/adr-0012-composite-policy-schema.md)
- [adr-0013](../../adr/adr-0013-typed-multi-asset-payments.md)
- [adr-0014](../../adr/adr-0014-onchain-daily-spend.md)
- [公開・秘密入力](../../../llm-wiki/wiki/concepts/noir-public-and-private-inputs.md)
- [ERC-4337決済境界](../../../llm-wiki/wiki/concepts/erc-4337-zk-policy-payment.md)
- Owner Key・Policy・TokenをAgentへ公開しない。local chain ID 31337のみ使用する。

## Task

| ID | Task | Status |
| --- | --- | --- |
| [task-06-09-01](../../tasks/story-06-09/task-06-09-01-claude-tool-configuration.md) | Claude Codeの3決済Tool設定 | done |
| [task-06-09-02](../../tasks/story-06-09/task-06-09-02-claude-multi-policy-e2e.md) | 実Claude Codeの複合Policy決済E2E | done |

## 検証結果

- AC-1: 実Claude Code 2.1.260にTool名を含む自然言語依頼を1件ずつ渡し、全条件有効Policyでnative0.01 ETH・Token10最小単位・Contract0.02 ETHを逐次実行。`dontAsk`/`permission-prompts none`と3Tool限定許可で追加決済承認なしに成功。
- `RUN_CLAUDE_CODE_E2E=1 NODE_OPTIONS=--experimental-sqlite pnpm exec vitest run e2e/claude-code-payment.test.ts`: 全2件成功（既存回帰1＋複合正常系1、59.24秒）。固定PATHは`/private/tmp/zk-policy-epic-06-tools/bin:/Users/takumaabe/.nvm/versions/node/v23.3.0/bin:$PATH`。最終実行は秘密置換済み診断の保存先も環境変数で指定。
- 実tool_useはnative/erc20/contractの順に各1回、3receiptすべてsuccessでblock順序一致。nonce+3、native累積+0.03 ETH/Token累積+10、recipientETH+0.01・ContractETH+0.02・TokenAccount990/recipient10を照合。
- transcriptにOwnerKey/PolicyToken/salt/Proof/秘密Policyフィールドがないことを確認。既存の秘密隔離・Bash deny・stdio設定を維持し、共通互換性テストはClaude側だけ更新。
- `pnpm test`: build/TypeScript、Circuit11、Contract39、unit103、通常E2E27成功。既定skipのAgent6件は成功に数えず、上記Claude実行2件を別証跡として区別する。
- `node scripts/validate-planning.mjs`、`git diff --check`: 成功。
- 診断経緯: Tool名を省略した依頼で未呼出しが発生（原因未確定）。Tool一覧を拾う誤った順序assertを構造化tool_useへ修正し、既存成功harnessと同じ明示Tool名形式にそろえた最終実行は全成功。一時全文は削除し、秘密を置換した最終応答metadataだけを保存。製品権限の回避や成功条件緩和なし。
- 自己・独立レビューで重大指摘なし。accepted ADR0012/0013/0014の全条件・秘密境界を維持。新規異常系は承認済みscopeで延期、既存は維持。新知識や設計変更がなくWiki/ADR更新不要。

## Blocked

なし。Story PRのmergeとdone遷移はrun-epicが担当。

統合後確認: `63d0383`で実Claude 2件・実Codex 5件・MCP unit 22件成功（skipなし）。ログ `/private/tmp/epic06-layer6-tests.log`。

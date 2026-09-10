---
id: story-06-10
type: story
title: 利用者がCodexから複合Policyで支払う
epic: epic-06
status: done
depends_on: [story-06-06]
adrs: [adr-0012, adr-0013, adr-0014]
created: 2026-09-06
updated: 2026-09-06
---

# 利用者がCodexから複合Policyで支払う

## ユーザーアクション

利用者がCodexから複合Policyで支払う。

## 背景

承認済み[epic-06](../../epics/epic-06-multi-policy.md)の複合条件を、観測可能な操作として実現する。

## スコープ

### 含むもの

- Codexの3決済Tool設定
- 実Codexの複合Policy決済E2E

### 含まないもの

- 新規の異常系・攻撃検証、同時送信、Risk Score全体、本番配置、実資産
- EpicおよびADRにない決済種別・PolicyのOR選択

## 受け入れ条件

### 正常系

- AC-1 [正常系]: Given 全条件を有効化したPolicyと3 Toolを許可した実Codex / When 利用者がnative・ERC-20・Contract決済を順番に自然言語で依頼する / Then 追加の決済承認なしに各receipt・残高・累積を確認できる

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
| [task-06-10-01](../../tasks/story-06-10/task-06-10-01-codex-tool-configuration.md) | Codexの3決済Tool設定 | done |
| [task-06-10-02](../../tasks/story-06-10/task-06-10-02-codex-multi-policy-e2e.md) | 実Codexの複合Policy決済E2E | done |

## 検証結果

- AC-1: `e2e/codex-payment.test.ts`のStory 06-10正常系で全条件有効Policy、実Codexの自然言語3種別逐次決済を確認。各receipt成功、native +0.01 ETH、Token recipient +25 / Account -25、Contract +0.02 ETHとinvoiceイベント、native共有累積+0.03 ETH、Token累積+25、nonce+3が一致。秘密情報やProofのtranscript露出、追加承認要求なし。
- `pnpm install --frozen-lockfile`成功。
- `pnpm build`、`pnpm typecheck`成功。Circuit/Verifier/Contract生成物に差分なし。
- `pnpm test:unit`成功（22 files / 103 tests）。
- `RUN_CODEX_E2E=1 NODE_OPTIONS=--experimental-sqlite pnpm exec vitest run e2e/codex-payment.test.ts`成功（5 tests、skipなし、189.58秒）。既存4件と追加正常系1件。ログ: `/private/tmp/story-06-10-codex-e2e.log`。
- 上記コマンドのPATH: `/private/tmp/zk-policy-epic-06-tools/bin:/Users/takumaabe/.nvm/versions/node/v23.3.0/bin:$PATH`。固定Codex CLI 0.153.2、chain ID 31337の非fork Anvil、実Altoを使用。
- `node scripts/validate-planning.mjs`成功（112 documents）、`git diff --check`成功。
- `ship-story`レビュー: ADR-0012/0013/0014準拠。Product差分はCodexの3 Tool許可とユーザー指定required=falseの統合のみ。shell_tool=false・既存credential forwardingを維持。CRITICAL/HIGH指摘なし。永続化対象の新しいドメイン知識・設計判断なし。
- 元worktreeの未コミット変更は編集せず保持。Phase 6新規異常系は延期のまま。

## Blocked

なし。Epic宛Story PRのレビュー待ち。mainにはmergeしない。

統合後確認: `63d0383`で実Claude 2件・実Codex 5件・MCP unit 22件成功（skipなし）。ログ `/private/tmp/epic06-layer6-tests.log`。

---
id: story-06-11
type: story
title: Developerがフェーズ6全体の正常系を再現する
epic: epic-06
status: done
depends_on: [story-06-09, story-06-10]
adrs: [adr-0012, adr-0013, adr-0014]
created: 2026-09-06
updated: 2026-09-06
---

# Developerがフェーズ6全体の正常系を再現する

## ユーザーアクション

Developerがフェーズ6全体の正常系を再現する。

## 背景

承認済み[epic-06](../../epics/epic-06-multi-policy.md)の複合条件を、観測可能な操作として実現する。

## スコープ

### 含むもの

- 統合quality gateと実測
- 設計適合確認とEpic PR

### 含まないもの

- 新規の異常系・攻撃検証、同時送信、Risk Score全体、本番配置、実資産
- EpicおよびADRにない決済種別・PolicyのOR選択

## 受け入れ条件

### 正常系

- AC-1 [正常系]: Given 新規ローカルfixtureと固定ツールチェーン / When Developerが全体quality gateを実行する / Then 各Storyの正常系・既存回帰テスト・実両Agent決済が成功し、回路サイズとProof時間を記録できる

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
| [task-06-11-01](../../tasks/story-06-11/task-06-11-01-integrated-quality-gate.md) | 統合quality gateと実測 | done |
| [task-06-11-02](../../tasks/story-06-11/task-06-11-02-audit-and-delivery.md) | 設計適合確認とEpic PR | done |

## 検証結果

AC-1: 以下の結果と監査文書の全Story/AC表で確認。

- `pnpm test`成功: build/typecheck、Circuit 11、Contract 39（正常値fuzz各256 runs）、unit/API/Client/MCP 103、local E2E 27。通常コマンドの実Agent 7件skipは成功に含めない。ログ `/private/tmp/story11-full-test.log`。
- 同一実装`63d0383`で `RUN_CLAUDE_CODE_E2E=1 RUN_CODEX_E2E=1 NODE_OPTIONS=--experimental-sqlite pnpm exec vitest run apps/payment-mcp/src e2e/claude-code-payment.test.ts e2e/codex-payment.test.ts`成功: Claude 2、Codex 5、MCP unit 22（全29件、skipなし）。ログ `/private/tmp/epic06-layer6-tests.log`。以後の変更は計画・監査文書のみ。
- `pnpm benchmark:circuit`成功: main ACIR 4314、Brillig 87、Proof 8000 bytes、生成940 ms（単発実測）。ログ `/private/tmp/story11-benchmark.log`。
- 固定版: Node 23.3.0、pnpm 10.18.1、nargo 1.0.0-beta.26、bb 5.2.0、forge 1.5.1、Claude Code 2.1.260、Codex 0.153.2。専用PATHで実行。
- 非fork Anvil chain ID 31337、実Alto、新規fixture資産でreceipt・残高・invoiceイベント・日次累積を確認。AC対応は[監査準備](../../audits/epic-06-multi-policy.md)に集約。


## Blocked

なし。

ship-story確認: 全Task done、4分野レビュー指摘なし、監査準備とEpic PR引渡し内容を作成。Account/testのformatのみ調整し、全Story統合後にrun-epicが監査を確定する。

PR #29をEpicへ統合後、Contract 39件成功。全9 Story done。最終Epic監査・quality gate・main向けPR作成はrun-epicで継続する。

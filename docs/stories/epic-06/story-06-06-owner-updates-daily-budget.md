---
id: story-06-06
type: story
title: Ownerが当日の支出を維持して日次上限を更新する
epic: epic-06
status: in-progress
depends_on: [story-06-05]
adrs: [adr-0012, adr-0014]
created: 2026-09-06
updated: 2026-09-06
---

# Ownerが当日の支出を維持して日次上限を更新する

## ユーザーアクション

Ownerが当日の支出を維持して日次上限を更新する。

## 背景

承認済み[epic-06](../../epics/epic-06-multi-policy.md)の複合条件を、観測可能な操作として実現する。

## スコープ

### 含むもの

- Policy更新と支出状態の独立性を実装・確認
- 更新・asset再登録後の累積引継ぎE2E

### 含まないもの

- 新規の異常系・攻撃検証、同時送信、Risk Score全体、本番配置、実資産
- EpicおよびADRにない決済種別・PolicyのOR選択

## 受け入れ条件

### 正常系

- AC-1 [正常系]: Given 当日native累積0.05 ETHとactive Policy / When Ownerが日次上限を0.1 ETHから0.2 ETHへ更新・active化し0.02 ETHを支払う / Then 新versionで決済し累積は0.07 ETHとなる
- AC-2 [正常系]: Given あるassetに当日支出実績がある / When OwnerがPolicyからそのassetを外した後に再登録して支払う / Then そのassetの当日実績を引き継ぐ

### 異常系

2026-09-06のユーザー指定により延期する。根拠はEpicのerror_acceptance_authorizationに記録済み。実施済み・成功とは扱わない。

## アーキテクチャ制約

- Epicの「Storyをまたぐ不変条件」と15公開入力の順序・型を維持する。
- [adr-0012](../../adr/adr-0012-composite-policy-schema.md)
- [adr-0014](../../adr/adr-0014-onchain-daily-spend.md)
- [公開・秘密入力](../../../llm-wiki/wiki/concepts/noir-public-and-private-inputs.md)
- [ERC-4337決済境界](../../../llm-wiki/wiki/concepts/erc-4337-zk-policy-payment.md)
- Owner Key・Policy・TokenをAgentへ公開しない。local chain ID 31337のみ使用する。

## Task

| ID | Task | Status |
| --- | --- | --- |
| [task-06-06-01](../../tasks/story-06-06/task-06-06-01-budget-update-preservation.md) | Policy更新と支出状態の独立性を実装・確認 | done |
| [task-06-06-02](../../tasks/story-06-06/task-06-06-02-budget-update-e2e.md) | 更新・asset再登録後の累積引継ぎE2E | done |

## 検証結果

- AC-1: `e2e/daily-policy-update.test.ts`で当日native累積0.05 ETHから、実Owner CLIのJSON入力で日次上限0.1→0.2へ更新・active化。v2の実Proof公開spentBefore0.05と支払い結果version2、receipt後の累積0.07 ETHを確認。
- AC-2: 同E2Eでnativeを除外v3→再登録v4して0.01 ETH追加、累積0.08 ETHを確認。Tokenは初期10支出から除外v5→再登録v6して20追加、累積30とnative不変。recipientのETH増分0.08、Token残高30・AccountToken残高970を照合。
- 全更新で旧versionのsuperseded、新activeのCommitmentとAccount値の一致を確認。CLI出力にTokenが露出しないことも確認。
- 既存Owner CLI/APIのasset別dailyLimit更新とAccountの独立したdailySpend保存が要件を満たすため製品コード変更は不要。正常系の単体・Contract・実Alto E2Eと証跡を追加した。
- `pnpm test`: build/typecheck、Circuit11、Contract39（fuzz各256 runs）、unit103、E2E27成功。実Agent固有5件は既定でskipされ成功に数えない。
- `forge fmt --check contracts/test/ZkPolicyAccount.t.sol`、`git diff --check`、`node scripts/validate-planning.mjs`: 成功。
- 自己・独立レビューで重大指摘なし。Owner署名・activation認可、秘密保持、Accountとasset単位の累積、最新contextと実行値の全15入力照合を維持。新規異常系はユーザー承認済みスコープに従い延期、既存異常系は維持。
- 新しい設計判断や外部知識はなく、ADR/Wiki変更は不要。

## Blocked

なし。Story PRのmergeとdone遷移はrun-epicが担当。

---
id: story-06-06
type: story
title: Ownerが当日の支出を維持して日次上限を更新する
epic: epic-06
status: approved
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
| [task-06-06-01](../../tasks/story-06-06/task-06-06-01-budget-update-preservation.md) | Policy更新と支出状態の独立性を実装・確認 | pending |
| [task-06-06-02](../../tasks/story-06-06/task-06-06-02-budget-update-e2e.md) | 更新・asset再登録後の累積引継ぎE2E | pending |

## 検証結果

未実施。

## Blocked

実装前条件はEpicのPreflightを参照。計画は承認済みだが実装開始前。

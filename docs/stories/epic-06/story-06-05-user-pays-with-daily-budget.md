---
id: story-06-05
type: story
title: 利用者が日次予算内で続けて支払う
epic: epic-06
status: approved
depends_on: [story-06-04]
adrs: [adr-0012, adr-0013, adr-0014]
created: 2026-09-06
updated: 2026-09-06
---

# 利用者が日次予算内で続けて支払う

## ユーザーアクション

利用者が日次予算内で続けて支払う。

## 背景

承認済み[epic-06](../../epics/epic-06-multi-policy.md)の複合条件を、観測可能な操作として実現する。

## スコープ

### 含むもの

- Accountの資産別日次累積保存
- 日次上限の回路と最新context取得
- 同日連続・日跨ぎ・資産別決済E2E

### 含まないもの

- 新規の異常系・攻撃検証、同時送信、Risk Score全体、本番配置、実資産
- EpicおよびADRにない決済種別・PolicyのOR選択

## 受け入れ条件

### 正常系

- AC-1 [正常系]: Given nativeの日次上限0.1 ETH・当日累積0 / When 利用者が0.03 ETH送金のreceiptを待って0.02 ETHを支払う / Then Accountの当日累積が0.05 ETHになる
- AC-2 [正常系]: Given native累積0.05 ETH / When 利用者が許可Contractへ0.01 ETH支払う / Then 同じnative枠の累積が0.06 ETHになる
- AC-3 [正常系]: Given nativeとERC-20を支払ったAccount / When 利用者が同日にERC-20を追加送金する / Then そのTokenだけの累積が増えnative累積は維持される
- AC-4 [正常系]: Given 前日に支払い済みのAccount / When 翌UTC日の最初の決済を実行する / Then 新しい日の累積が今回の金額となる

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
| [task-06-05-01](../../tasks/story-06-05/task-06-05-01-daily-state-account.md) | Accountの資産別日次累積保存 | pending |
| [task-06-05-02](../../tasks/story-06-05/task-06-05-02-daily-proof-context.md) | 日次上限の回路と最新context取得 | pending |
| [task-06-05-03](../../tasks/story-06-05/task-06-05-03-daily-payment-e2e.md) | 同日連続・日跨ぎ・資産別決済E2E | pending |

## 検証結果

未実施。

## Blocked

実装前条件はEpicのPreflightを参照。計画は承認済みだが実装開始前。

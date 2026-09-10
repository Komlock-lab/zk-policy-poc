---
id: story-06-11
type: story
title: Developerがフェーズ6全体の正常系を再現する
epic: epic-06
status: approved
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
| [task-06-11-01](../../tasks/story-06-11/task-06-11-01-integrated-quality-gate.md) | 統合quality gateと実測 | pending |
| [task-06-11-02](../../tasks/story-06-11/task-06-11-02-audit-and-delivery.md) | 設計適合確認とEpic PR | pending |

## 検証結果

未実施。

## Blocked

実装前条件はEpicのPreflightを参照。計画は承認済みだが実装開始前。

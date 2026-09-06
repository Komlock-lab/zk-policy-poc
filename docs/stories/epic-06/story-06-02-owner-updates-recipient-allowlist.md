---
id: story-06-02
type: story
title: Ownerが許可送金先を更新して決済する
epic: epic-06
status: approved
depends_on: [story-06-01]
adrs: [adr-0012]
created: 2026-09-06
updated: 2026-09-06
---

# Ownerが許可送金先を更新して決済する

## ユーザーアクション

Ownerが許可送金先を更新して決済する。

## 背景

承認済み[epic-06](../../epics/epic-06-multi-policy.md)の複合条件を、観測可能な操作として実現する。

## スコープ

### 含むもの

- recipient allowlistの回路制約
- allowlistのOwner更新と決済E2E

### 含まないもの

- 新規の異常系・攻撃検証、同時送信、Risk Score全体、本番配置、実資産
- EpicおよびADRにない決済種別・PolicyのOR選択

## 受け入れ条件

### 正常系

- AC-1 [正常系]: Given recipient Aを許可したactive Policy / When Ownerがrecipient Bを追加して更新・active化する / Then 同じPolicy IDでversionが増え、新CommitmentでBへの期限内決済が成功する

### 異常系

2026-09-06のユーザー指定により延期する。根拠はEpicのerror_acceptance_authorizationに記録済み。実施済み・成功とは扱わない。

## アーキテクチャ制約

- Epicの「Storyをまたぐ不変条件」と15公開入力の順序・型を維持する。
- [adr-0012](../../adr/adr-0012-composite-policy-schema.md)
- [公開・秘密入力](../../../llm-wiki/wiki/concepts/noir-public-and-private-inputs.md)
- [ERC-4337決済境界](../../../llm-wiki/wiki/concepts/erc-4337-zk-policy-payment.md)
- Owner Key・Policy・TokenをAgentへ公開しない。local chain ID 31337のみ使用する。

## Task

| ID | Task | Status |
| --- | --- | --- |
| [task-06-02-01](../../tasks/story-06-02/task-06-02-01-recipient-membership.md) | recipient allowlistの回路制約 | pending |
| [task-06-02-02](../../tasks/story-06-02/task-06-02-02-recipient-policy-update.md) | allowlistのOwner更新と決済E2E | pending |

## 検証結果

未実施。

## Blocked

実装前条件はEpicのPreflightを参照。計画は承認済みだが実装開始前。

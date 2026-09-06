---
id: story-06-09
type: story
title: 利用者がClaude Codeから複合Policyで支払う
epic: epic-06
status: approved
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
| [task-06-09-01](../../tasks/story-06-09/task-06-09-01-claude-tool-configuration.md) | Claude Codeの3決済Tool設定 | pending |
| [task-06-09-02](../../tasks/story-06-09/task-06-09-02-claude-multi-policy-e2e.md) | 実Claude Codeの複合Policy決済E2E | pending |

## 検証結果

未実施。

## Blocked

実装前条件はEpicのPreflightを参照。計画は承認済みだが実装開始前。

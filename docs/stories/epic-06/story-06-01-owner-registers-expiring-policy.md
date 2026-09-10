---
id: story-06-01
type: story
title: Ownerが有効期限付きPolicyを登録して決済する
epic: epic-06
status: approved
depends_on: []
adrs: [adr-0012]
created: 2026-09-06
updated: 2026-09-06
---

# Ownerが有効期限付きPolicyを登録して決済する

## ユーザーアクション

Ownerが有効期限付きPolicyを登録して決済する。

## 背景

承認済み[epic-06](../../epics/epic-06-multi-policy.md)の複合条件を、観測可能な操作として実現する。

## スコープ

### 含むもの

- 複合Policyと公開入力の共通定義
- 有効期間を証明する回路・Prover・Verifier
- Account・Policy API・CLIの期限付き決済

### 含まないもの

- 新規の異常系・攻撃検証、同時送信、Risk Score全体、本番配置、実資産
- EpicおよびADRにない決済種別・PolicyのOR選択

## 受け入れ条件

### 正常系

- AC-1 [正常系]: Given 新しいローカルAccountとnative上限0.1 ETH・有効期間300秒のPolicy / When Ownerが作成CLIで登録する / Then 暗号化保存、Commitment更新、active化が完了する
- AC-2 [正常系]: Given active Policy / When Ownerが期限内に0.01 ETHを直接実行またはBundler経由で支払う / Then recipient残高が0.01 ETH増え、APIとAccountが同じ公開入力で実Proofを検証する

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
| [task-06-01-01](../../tasks/story-06-01/task-06-01-01-policy-schema-and-inputs.md) | 複合Policyと公開入力の共通定義 | pending |
| [task-06-01-02](../../tasks/story-06-01/task-06-01-02-expiry-circuit-and-verifier.md) | 有効期間を証明する回路・Prover・Verifier | pending |
| [task-06-01-03](../../tasks/story-06-01/task-06-01-03-expiry-account-api-cli.md) | Account・Policy API・CLIの期限付き決済 | pending |

## 検証結果

未実施。

## Blocked

実装前条件はEpicのPreflightを参照。計画は承認済みだが実装開始前。

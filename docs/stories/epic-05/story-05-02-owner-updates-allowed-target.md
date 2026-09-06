---
id: story-05-02
type: story
title: Ownerが送金先を含むPolicyを更新する
epic: epic-05
status: approved
depends_on: [story-05-01]
adrs: [adr-0012, adr-0013]
created: 2026-09-06
updated: 2026-09-06
---

# Ownerが送金先を含むPolicyを更新する

## ユーザーアクション

Ownerは同じPolicy IDの許可送金先(または上限)を更新し、新versionをAccountとAPIでactiveにできる。

## 背景

送金先を秘密Policyの一部にした以上、既存のversion遷移(pending/active/superseded、adr-0004)が`allowedTarget`の変更にも一貫して適用され、旧versionのProofが更新後のCommitmentでは無効になることを確認する必要がある。

## スコープ

### 含むもの

- Policy更新CLIへの許可送金先入力の追加
- 許可送金先を変更したPolicy更新のCommitment再計算とversion遷移
- 更新前のCommitmentに対するProofが更新後のAccountで無効になることの確認

### 含まないもの

- 複数active Policy、複数送金先のallowlist、Proof生成・決済(story-05-03で扱う)

## 受け入れ条件

### 正常系

- AC-1 [正常系]: Given 許可送金先0xAAAA・上限0.1 ETHのversion 1がactiveである / When Ownerが許可送金先を0xBBBBへ更新してTxを確定する / Then version 2がactiveになり、`allowedTarget`を含めて再計算したCommitmentがAccountの値と一致する

### 異常系

- AC-2 [異常系]: Given version 1(許可送金先0xAAAA)時点で発行されたProofがある / When 許可送金先を0xBBBBへ更新した後にそのProofで送金を試みる / Thenオンチェーン検証がCommitment不一致で失敗し送金されない
- AC-3 [異常系]: Given Owner以外がAccountのCommitmentを更新する / When update Txを送る / Then Accountは`Unauthorized`でrevertする

## アーキテクチャ制約

- [epic-05](../../epics/epic-05-target-allowlist-payment.md)、[adr-0012](../../adr/adr-0012-policy-commitment-and-target-public-input.md)、[adr-0013](../../adr/adr-0013-policy-update-api-target-allowlist.md)に従う。
- [adr-0004](../../adr/adr-0004-policy-lifecycle-and-commitment-update.md)のversion遷移(pending/active/superseded)は変更しない。
- story-05-01で確立したCircuit・Prover・Account・API基盤を前提とする。

## Task

| ID | Task | Status |
| --- | --- | --- |
| [task-05-02-01](../../tasks/story-05-02/task-05-02-01-policy-update-cli-target.md) | Policy更新CLIのallowedTarget対応 | pending |
| [task-05-02-02](../../tasks/story-05-02/task-05-02-02-policy-update-target-e2e.md) | Policy更新(送金先変更)E2E | pending |

## 検証結果

未実施。

## Blocked

なし。

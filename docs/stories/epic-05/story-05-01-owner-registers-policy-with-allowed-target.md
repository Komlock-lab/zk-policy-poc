---
id: story-05-01
type: story
title: Ownerが送金先を含むPolicyを新規登録する
epic: epic-05
status: approved
depends_on: []
adrs: [adr-0012, adr-0013]
created: 2026-09-06
updated: 2026-09-06
---

# Ownerが送金先を含むPolicyを新規登録する

## ユーザーアクション

OwnerはCLIから支出上限と許可送金先を含む秘密Policyを作成し、AccountへCommitmentを登録してAPI上のPolicyをactiveにできる。

## 背景

送金先制約を追加するにはCircuit・Prover・Account・API・CLIのすべてが新しいPolicy schema(`maxAmount`、`allowedTarget`、`salt`)とPublic Input構成(`value`、`target`、`policyCommitment`)を扱える必要がある。本Storyはこの基盤と初回登録フローを確立する。

## スコープ

### 含むもの

- Circuitへの`allowedTarget`Private Inputと`target`Public Inputの追加
- `packages/policy`のPolicy型・Commitment計算の3入力化
- `packages/prover`の3要素Public Input対応
- `ZkPolicyAccount`・生成Verifierの3要素Public Input対応
- `PolicyUpdate` EIP-712型・登録APIへの`allowedTarget`追加
- Policy登録CLIへの許可送金先入力の追加
- Policy未設定Accountへの初回Commitment登録

### 含まないもの

- 既存Policyの更新、Proof生成、決済(story-05-02、story-05-03で扱う)

## 受け入れ条件

### 正常系

- AC-1 [正常系]: Given Policy未設定のAccount、0.1 ETHの上限、許可送金先0xAAAAがある / When OwnerがCLIでこれらを含むPolicyを登録してTxを確定する / Then APIのversion 1がactiveになり、`maxAmount`・`allowedTarget`・`salt`から再計算したCommitmentがAccountの値と一致する

### 異常系

- AC-2 [異常系]: Given 秘密値(`maxAmount`、`allowedTarget`、`salt`)から再計算した値と異なる`policyCommitment`が署名されている / When Policy登録を要求する / Then APIは保存前に拒否する
- AC-3 [異常系]: Given `allowedTarget`がzero addressまたは20byteの0xアドレスとして不正である / When Policy登録を要求する / Then APIは入力検証で拒否し状態を変更しない
- AC-4 [異常系]: Given Owner以外の署名がある / When `allowedTarget`を含むPolicy登録を要求する / Then APIは拒否しnonceとPolicy状態を変更しない
- AC-5 [異常系]: Given AccountにPolicyが設定されていない / When Ownerが送金を実行する / Then Accountは送金せず`PolicyNotConfigured`でrevertする

## アーキテクチャ制約

- [epic-05](../../epics/epic-05-target-allowlist-payment.md)の不変条件を維持する。
- [adr-0012](../../adr/adr-0012-policy-commitment-and-target-public-input.md)、[adr-0013](../../adr/adr-0013-policy-update-api-target-allowlist.md)に従う。
- 既存の[adr-0004](../../adr/adr-0004-policy-lifecycle-and-commitment-update.md)、[adr-0005](../../adr/adr-0005-eip712-owner-authorization-and-api-nonce.md)、[adr-0006](../../adr/adr-0006-encrypted-policy-storage-and-proof-token.md)のPolicy lifecycleと暗号化構成は変更しない。
- [Noir Public and Private Inputs](../../../llm-wiki/wiki/concepts/noir-public-and-private-inputs.md)、[Local Policy Secret Storage](../../../llm-wiki/wiki/concepts/local-policy-secret-storage.md)を参照する。

## Task

| ID | Task | Status |
| --- | --- | --- |
| [task-05-01-01](../../tasks/story-05-01/task-05-01-01-circuit-target-constraint.md) | Circuitへのallowed target制約追加 | pending |
| [task-05-01-02](../../tasks/story-05-01/task-05-01-02-policy-package-target-commitment.md) | packages/policyのPolicy型とCommitment計算拡張 | pending |
| [task-05-01-03](../../tasks/story-05-01/task-05-01-03-prover-target-public-input.md) | packages/proverのtarget public input対応 | pending |
| [task-05-01-04](../../tasks/story-05-01/task-05-01-04-account-verifier-target-public-input.md) | ZkPolicyAccountとVerifierのpublic input拡張 | pending |
| [task-05-01-05](../../tasks/story-05-01/task-05-01-05-policy-api-eip712-target-field.md) | Policy APIのEIP-712・登録スキーマ拡張 | pending |
| [task-05-01-06](../../tasks/story-05-01/task-05-01-06-policy-registration-cli-target.md) | Policy登録CLIのallowedTarget対応 | pending |
| [task-05-01-07](../../tasks/story-05-01/task-05-01-07-initial-target-policy-e2e.md) | 初回Policy登録(送金先付き)E2E | pending |

## 検証結果

未実施。

## Blocked

なし。

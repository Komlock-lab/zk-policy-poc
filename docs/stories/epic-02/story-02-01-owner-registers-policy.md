---
id: story-02-01
type: story
title: Ownerが初回Policyを登録する
epic: epic-02
status: approved
depends_on: []
adrs: [adr-0004, adr-0005, adr-0006, adr-0007]
created: 2026-09-04
updated: 2026-09-04
---

# Ownerが初回Policyを登録する

## ユーザーアクション

OwnerはCLIから秘密の支出上限Policyを作成し、AccountへCommitmentを登録してAPI上のPolicyをactiveにできる。

## 背景

AccountとAPIが同じCommitmentを正本として共有し、秘密値をオンチェーンへ公開せずに後続のProof生成へ備える必要がある。

## スコープ

### 含むもの

- API・SQLite・暗号化の基盤
- Policy未設定Accountへの初回Commitment登録
- EIP-712署名、nonce、deadline検証
- stable Policy ID、version 1、pendingからactiveへの遷移
- Proof API Tokenの初回発行

### 含まないもの

- 既存Policyの更新、Proof生成、Token再発行、決済

## 受け入れ条件

### 正常系

- AC-1 [正常系]: Given Policy未設定のAccountと0.1 ETHの上限がある / When OwnerがCLIでPolicyを登録してTxを確定する / Then APIのversion 1がactiveになりAccountのCommitmentと一致する
- AC-2 [正常系]: Given 正しいOwner署名がある / When APIが初回Policyを受理する / Then Proof API Tokenが一度だけ返されDBにはhashだけが保存される

### 異常系

- AC-3 [異常系]: Given Owner以外の署名がある / When Policy登録を要求する / Then APIは拒否しnonceとPolicy状態を変更しない
- AC-4 [異常系]: Given deadlineを過ぎた署名がある / When Policy登録を要求する / Then APIは期限切れとして拒否する
- AC-5 [異常系]: Given 使用済みnonceの署名がある / When 同じPolicy登録を再送する / Then APIはreplayとして拒否する
- AC-6 [異常系]: Given 秘密値から再計算した値と異なるCommitmentが署名されている / When Policy登録を要求する / Then APIは保存前に拒否する
- AC-7 [異常系]: Given AccountにPolicyが設定されていない / When Ownerが送金を実行する / Then Accountは送金せず`PolicyNotConfigured`でrevertする

## アーキテクチャ制約

- [epic-02](../../epics/epic-02-policy-management-proof-api.md)の不変条件を維持する。
- [adr-0004](../../adr/adr-0004-policy-lifecycle-and-commitment-update.md)、[adr-0005](../../adr/adr-0005-eip712-owner-authorization-and-api-nonce.md)、[adr-0006](../../adr/adr-0006-encrypted-policy-storage-and-proof-token.md)、[adr-0007](../../adr/adr-0007-local-synchronous-policy-proof-api.md)に従う。
- [EIP-712 Policy Update Authorization](../../../llm-wiki/wiki/concepts/eip-712-policy-update-authorization.md)と[Local Policy Secret Storage](../../../llm-wiki/wiki/concepts/local-policy-secret-storage.md)を参照する。

## Task

| ID | Task | Status |
| --- | --- | --- |
| [task-02-01-01](../../tasks/story-02-01/task-02-01-01-api-workspace-and-config.md) | API workspaceと設定 | pending |
| [task-02-01-02](../../tasks/story-02-01/task-02-01-02-account-policy-registration.md) | AccountのPolicy登録・更新機能 | pending |
| [task-02-01-03](../../tasks/story-02-01/task-02-01-03-sqlite-policy-repository.md) | SQLite Policy repository | pending |
| [task-02-01-04](../../tasks/story-02-01/task-02-01-04-policy-encryption-and-token.md) | Policy暗号化とToken管理 | pending |
| [task-02-01-05](../../tasks/story-02-01/task-02-01-05-signed-policy-registration-api.md) | EIP-712 Policy登録API | pending |
| [task-02-01-06](../../tasks/story-02-01/task-02-01-06-policy-create-activation-cli.md) | Policy作成・active化CLI | pending |
| [task-02-01-07](../../tasks/story-02-01/task-02-01-07-initial-policy-e2e.md) | 初回Policy登録E2E | pending |

## 検証結果

未実施。

## Blocked

なし。

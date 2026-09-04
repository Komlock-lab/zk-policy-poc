---
id: story-02-02
type: story
title: OwnerがPolicyを更新する
epic: epic-02
status: approved
depends_on: [story-02-01]
adrs: [adr-0004, adr-0005, adr-0006, adr-0007]
created: 2026-09-04
updated: 2026-09-04
---

# OwnerがPolicyを更新する

## ユーザーアクション

Ownerは同じPolicy IDの支出上限を更新し、新versionをAccountとAPIでactiveにできる。

## 背景

秘密Policyの変更履歴を保持しながら、Proof生成対象を現在のオンチェーンCommitmentと一致するversionだけに限定する必要がある。

## スコープ

### 含むもの

- versionを増やしたpending Policyの保存
- Owner TxによるCommitment更新
- tx確定後の新version active化と旧version superseded化
- 未確定pendingのOwner署名による置換

### 含まないもの

- 複数active Policy、複数ルール、Event常時監視

## 受け入れ条件

### 正常系

- AC-1 [正常系]: Given version 1がactiveである / When Ownerが上限を更新してTxを確定する / Then version 2がactive、version 1がsupersededになりAccountのCommitmentがversion 2と一致する
- AC-2 [正常系]: Given 未確定のpending versionがある / When Ownerが新しいnonceで別の更新を登録する / Then 古いpendingがsupersededになり新versionだけがpendingになる

### 異常系

- AC-3 [異常系]: Given Owner以外がAccountのCommitmentを更新する / When update Txを送る / Then Accountは`Unauthorized`でrevertする
- AC-4 [異常系]: Given 成功receiptが存在しないtx hashがある / When active化を要求する / Then APIはpending状態を維持して拒否する
- AC-5 [異常系]: Given 対象AccountまたはCommitmentが異なるTxがある / When active化を要求する / Then APIは不一致として拒否する
- AC-6 [異常系]: Given 古いAPI nonceで署名した更新がある / When APIへ登録する / Then replayとして拒否する

## アーキテクチャ制約

- [epic-02](../../epics/epic-02-policy-management-proof-api.md)と[adr-0004](../../adr/adr-0004-policy-lifecycle-and-commitment-update.md)、[adr-0005](../../adr/adr-0005-eip712-owner-authorization-and-api-nonce.md)に従う。
- active化の前にreceiptと現在のAccount状態を検証する。

## Task

| ID | Task | Status |
| --- | --- | --- |
| [task-02-02-01](../../tasks/story-02-02/task-02-02-01-policy-version-transitions.md) | Policy version状態遷移 | pending |
| [task-02-02-02](../../tasks/story-02-02/task-02-02-02-policy-update-confirmation-api.md) | Policy更新・確定API | pending |
| [task-02-02-03](../../tasks/story-02-02/task-02-02-03-policy-update-cli.md) | Policy更新CLI | pending |
| [task-02-02-04](../../tasks/story-02-02/task-02-02-04-policy-update-e2e.md) | Policy更新E2E | pending |

## 検証結果

未実施。

## Blocked

なし。

---
id: task-02-01-02
type: task
title: AccountのPolicy登録・更新機能
story: story-02-01
status: done
blocked_by: [task-02-01-01]
created: 2026-09-04
updated: 2026-09-04
---

# AccountのPolicy登録・更新機能

## 目的

OwnerがPolicy未設定AccountへCommitmentを登録・更新できるようにする。

## 作業

- constructorからCommitmentを除き、設定状態とmutable Commitmentを追加する。
- Owner限定`updatePolicyCommitment(bytes32)`、Field検証、更新Eventを実装する。
- 未設定時の`execute()`をcustom errorで拒否する。
- unit testとfuzz testを更新する。

## 完了条件

- Ownerの登録・更新だけが成功し、未設定送金と不正入力がrevertする。

## 検証方法

- `forge fmt --check --root contracts`
- `forge test --root contracts`

## 検証結果

- 変更対象2 fileの`forge fmt --check`が成功した。
- `forge test --root contracts`でunit・fuzz test 15件が成功し、Owner限定更新、Field範囲、Event、未設定送金拒否を確認した。

## Blocked

なし。

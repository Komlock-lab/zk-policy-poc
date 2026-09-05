---
id: task-03-01-03
type: task
title: EntryPoint専用Policy決済
story: story-03-01
status: pending
blocked_by: [task-03-01-02]
created: 2026-09-05
updated: 2026-09-05
---

# EntryPoint専用Policy決済

## 目的

EntryPointだけがProof付きUserOperation決済を実行でき、Owner直接決済と同じPolicy検証を再利用できるようにする。

## 作業

- `executeUserOp(recipient,value,proof)`をEntryPoint caller専用で追加する。
- 既存`execute`と新規`executeUserOp`から呼ぶ内部Policy検証・送金処理を抽出する。
- 両経路でpolicyConfigured、recipient、u128 amount、実送金額、現在Commitment、Proof、送金結果を同じ順序で検証する。
- EntryPoint以外の実行、改ざん額、古いCommitment、送金失敗のContract testを追加する。

## 完了条件

- Story 03-01のAC-3、AC-4、AC-8が成功し、両実行経路が同じPublic Inputを使用する。

## 検証方法

- `pnpm test:contracts`
- `forge fmt --check --root contracts`

## 検証結果

未実施。

## Blocked

なし。

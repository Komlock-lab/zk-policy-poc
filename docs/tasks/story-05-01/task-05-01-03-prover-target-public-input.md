---
id: task-05-01-03
type: task
title: packages/proverのtarget public input対応
story: story-05-01
status: pending
blocked_by: [task-05-01-02]
created: 2026-09-06
updated: 2026-09-06
---

# packages/proverのtarget public input対応

## 目的

`generateSpendLimitProof`が`target`をwitnessとPublic Inputへ正しく渡し、3要素のPublic Input順序を検証できるようにする。

## 作業

- `packages/prover/src/spend-limit.ts`の入力に`target`(address)を追加し、witnessへ`allowed_target`・`target`を渡す。
- 生成したProofのPublic Inputが`[value, target, policyCommitment]`の順序であることを検証するチェックを更新する。
- 既存の`spend-limit.test.ts`を新しいPublic Input構成に合わせて更新する。

## 完了条件

- 許可送金先と一致する`target`でのみProofが生成でき、不一致の場合はエラーになる。

## 検証方法

- `pnpm exec vitest run packages/prover`

## 検証結果

未実施。

## Blocked

なし。

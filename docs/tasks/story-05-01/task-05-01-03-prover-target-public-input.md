---
id: task-05-01-03
type: task
title: packages/proverのtarget public input対応
story: story-05-01
status: done
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

- `pnpm exec vitest run packages/prover`: 2 tests passed(上限超過・target不一致のどちらもwitness実行前に拒否することを確認)。
- 実際のCircuit witness実行とUltraHonk Proof生成を伴う正常系(3要素Public Inputの往復)は、このセッションのネットワークポリシーがBarretenbergのCRS取得先(crs.aztec-labs.com)を403で拒否するため未検証。既存の`packages/prover`テストも元々この経路をunit testで検証しておらず、e2e(`pnpm test:e2e`、task-05-01-07/05-03-03)の範囲としている。

## Blocked

なし。

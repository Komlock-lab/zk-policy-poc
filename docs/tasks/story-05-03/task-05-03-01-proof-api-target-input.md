---
id: task-05-03-01
type: task
title: Proof生成APIのtarget対応
story: story-05-03
status: done
blocked_by: []
created: 2026-09-06
updated: 2026-09-06
---

# Proof生成APIのtarget対応

## 目的

Proof生成APIが送金予定の送金先を受け取り、Circuitへ`target`として渡せるようにする。

## 作業

- `apps/policy-api/src/service.ts`の`createProof`入力に`target`(address)を追加し、Prover呼び出しへ渡す。
- Proof responseの`publicInputs`検証を3要素`[value, target, policyCommitment]`に更新する。
- `service.test.ts`を更新し、許可送金先と異なる`target`ではProof生成が失敗することを確認する。

## 完了条件

- 許可送金先と一致する`target`でのみProofが生成され、不一致の場合はエラーになる。

## 検証方法

- `pnpm exec vitest run apps/policy-api`

## 検証結果

- `pnpm exec vitest run apps/policy-api`: 51 tests passed。`target`不一致時に`TARGET_NOT_ALLOWED`でProof生成前に拒否するテスト、Proverが返す3要素Public Input(`value`/`target`/`policyCommitment`)の不一致検知を含む。
- `pnpm exec tsc --noEmit`: エラーなし。

## Blocked

なし。

---
id: task-05-01-02
type: task
title: packages/policyのPolicy型とCommitment計算拡張
story: story-05-01
status: pending
blocked_by: [task-05-01-01]
created: 2026-09-06
updated: 2026-09-06
---

# packages/policyのPolicy型とCommitment計算拡張

## 目的

TypeScript側が`allowedTarget`を含むPolicyを表現し、Circuitと同じ3入力Commitmentを計算できるようにする。

## 作業

- `packages/policy/src`にaddress(20byte、0x-hex)をFieldへ変換するencode関数を追加する。
- `computePolicyCommitment`を`maxAmount`・`allowedTarget`・`salt`の3引数に変更する。
- `allowedTarget`がzero addressまたは20byte hexとして不正な場合を拒否するZod schemaを追加する。
- 既存の`commitment.test.ts`・`amount.test.ts`を更新し、`circuits/spend-limit`の新しいlocked vectorと一致する既知値テストを追加する。

## 完了条件

- `computePolicyCommitment(maxAmount, allowedTarget, salt)`がCircuitの`compute_policy_commitment`と同じ値を返す。

## 検証方法

- `pnpm exec vitest run packages/policy`
- `nargo test`(`circuits/spend-limit`)で同じ入力の期待値を照合する。

## 検証結果

未実施。

## Blocked

なし。

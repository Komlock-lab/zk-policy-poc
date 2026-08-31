---
id: task-01-01-02
type: task
title: Spend Limit Circuit
story: story-01-01
status: done
blocked_by: [task-01-01-01]
created: 2026-08-30
updated: 2026-08-30
---

# Spend Limit Circuit

## 目的

秘密の支出上限とsaltを公開せず、実際の送金額が上限以内であることを証明する。

## 作業

- Public Inputに`value: u128`と`policyCommitment`を定義する。
- Private Inputに`maxAmount: u128`と`salt`を定義する。
- `value <= maxAmount`を制約する。
- `Poseidon2(maxAmount, salt) == policyCommitment`を制約する。
- 正常系、上限超過、Commitment不一致をテストする。
- CircuitサイズとProof生成時間を計測する。

## 完了条件

- Circuitテストが成功する。
- 上限超過とCommitment不一致ではwitnessを生成できない。

## 検証方法

- `pnpm test:circuit`
- `pnpm benchmark:circuit`

## 検証結果

- Circuit 4件が成功した。
- ACIR Opcodesは12、Proofは7,232 bytes、生成時間は332msだった。

## Blocked

なし。

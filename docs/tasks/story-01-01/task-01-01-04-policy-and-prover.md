---
id: task-01-01-04
type: task
title: PolicyとProof生成
story: story-01-01
status: done
blocked_by: [task-01-01-01, task-01-01-02]
created: 2026-08-30
updated: 2026-08-30
---

# PolicyとProof生成

## 目的

TypeScriptからPolicy CommitmentとSpend Limit Proofを再現可能に生成する。

## 作業

- wei金額と`u128`範囲を境界で検証する。
- 暗号学的乱数のsaltを生成する。
- `Poseidon2(maxAmount, salt)`を計算する。
- Noir CircuitのwitnessとProofを生成する。
- ProofとPublic InputをContract用形式へ変換する。
- 秘密のPolicyやsaltをログへ出力しない。

## 完了条件

- 上限以内のProofを生成・検証できる。
- 上限超過、範囲外、形式不正を明示的に拒否できる。

## 検証方法

- `pnpm test:unit`
- `pnpm benchmark:circuit`

## 検証結果

- Policy、Prover、local payment helperのunit test 7件が成功した。
- 生成したProofのローカル検証とPublic Inputの値・順序検証が成功した。

## Blocked

なし。

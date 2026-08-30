# Task 04: PolicyとProof生成

## 目的

TypeScriptからPolicy CommitmentとSpend Limit Proofを再現可能に生成する。

## 作業

- wei金額と`u128`範囲を境界で検証する
- 暗号学的乱数のsaltを生成する
- `Poseidon2(maxAmount, salt)`を計算する
- Noir CircuitのwitnessとProofを生成する
- ProofとPublic InputsをContract用形式へ変換する
- 秘密のPolicyやsaltをログへ出力しない

## 完了条件

- 上限以内のProofを生成・検証できる
- 上限超過、範囲外、形式不正を明示的に拒否できる

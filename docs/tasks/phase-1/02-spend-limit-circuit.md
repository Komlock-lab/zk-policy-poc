# Task 02: Spend Limit Circuit

## 目的

秘密の支出上限とsaltを公開せず、実際の送金額が上限以内であることを証明する。

## 作業

- Public Inputに`value: u128`と`policyCommitment`を定義する
- Private Inputに`maxAmount: u128`と`salt`を定義する
- `value <= maxAmount`を制約する
- `Poseidon2(maxAmount, salt) == policyCommitment`を制約する
- 正常系、上限超過、Commitment不一致をテストする
- Circuitサイズと実行時間を計測できるようにする

## 完了条件

- Circuitテストが成功する
- 上限超過とCommitment不一致ではwitnessを生成できない

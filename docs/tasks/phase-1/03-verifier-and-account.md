# Task 03: VerifierとZK Policy Account

## 目的

Ownerが承認し、実際の送金額に対するProofが有効な場合だけnative tokenを送金する。

## 作業

- BarretenbergからSolidity Verifierを生成する
- Owner、Verifier、policyCommitmentをconstructorで固定する
- `uint256`の送金額が`u128`範囲内であることを検証する
- 実際の送金額と登録済みCommitmentをPublic Inputとして検証する
- 検証成功後だけnative tokenを送金する
- custom error、unit test、fuzz testを追加する

## 完了条件

- Accountと生成VerifierがFoundryでビルドできる
- 認証、Proof検証、送金、失敗条件のテストが成功する

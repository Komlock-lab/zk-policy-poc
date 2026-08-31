---
id: task-01-01-03
type: task
title: VerifierとZK Policy Account
story: story-01-01
status: done
blocked_by: [task-01-01-02]
created: 2026-08-30
updated: 2026-08-30
---

# VerifierとZK Policy Account

## 目的

Ownerが承認し、実際の送金額に対するProofが有効な場合だけnative tokenを送金する。

## 作業

- BarretenbergからSolidity Verifierを生成する。
- Owner、Verifier、policyCommitmentをconstructorで固定する。
- `uint256`の送金額が`u128`範囲内であることを検証する。
- 実送金額と登録済みCommitmentをPublic Inputとして検証する。
- 検証成功後だけnative tokenを送金する。
- custom error、unit test、fuzz testを追加する。

## 完了条件

- Accountと生成VerifierがFoundryでビルドできる。
- 認証、Proof検証、送金、失敗条件のテストが成功する。

## 検証方法

- `pnpm generate:verifier`
- `pnpm test:contracts`

## 検証結果

- UltraHonk Solidity Verifierを再現可能に生成した。
- Contract unit・fuzz test 11件が成功した。

## Blocked

なし。

---
id: task-05-01-04
type: task
title: ZkPolicyAccountとVerifierのpublic input拡張
story: story-05-01
status: pending
blocked_by: [task-05-01-01]
created: 2026-09-06
updated: 2026-09-06
---

# ZkPolicyAccountとVerifierのpublic input拡張

## 目的

Accountが実際の送金先をVerifierへ渡し、Circuitの送金先制約をオンチェーンで強制する。

## 作業

- `pnpm generate:verifier`で新Circuitから`SpendLimitVerifier.sol`を再生成する(手動編集しない)。
- `contracts/src/ZkPolicyAccount.sol`の`_executePolicyPayment`で`publicInputs`を3要素`[value, target, policyCommitment]`にし、`target`へ`recipient`をFieldへ変換した値を渡す。
- `contracts/test/ZkPolicyAccount.t.sol`の`MockSpendLimitVerifier`とテストケースを3要素Public Inputに合わせて更新し、送金先不一致で`InvalidProof`になるケースを追加する。

## 完了条件

- 実際の送金先と異なる`target`で生成されたProofは`InvalidProof`でrevertする。

## 検証方法

- `forge fmt --check --root contracts`
- `forge test --root contracts`

## 検証結果

未実施。

## Blocked

なし。

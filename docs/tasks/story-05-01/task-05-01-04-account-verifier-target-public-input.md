---
id: task-05-01-04
type: task
title: ZkPolicyAccountとVerifierのpublic input拡張
story: story-05-01
status: blocked
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

- コード変更は完了した。`ZkPolicyAccount.sol`の`_executePolicyPayment`は`publicInputs`を`[value, target, policyCommitment]`の3要素にし、`MockSpendLimitVerifier`と`ZkPolicyAccount.t.sol`を3要素に合わせて更新し、送金先不一致で`InvalidProof`になる`testRejectsMismatchedTarget`を追加した。
- `forge fmt --check contracts/src/ZkPolicyAccount.sol contracts/test/ZkPolicyAccount.t.sol --root contracts`: 成功(差分なし)。
- `pnpm generate:verifier`(`bb write_vk`/`bb write_solidity_verifier`)は、このセッションのネットワークポリシーがBarretenbergのCRS取得先(crs.aztec-labs.com)を403で拒否するため実行できず、生成済み`contracts/src/verifiers/generated/SpendLimitVerifier.sol`は旧Circuit(2 Public Input)のまま未更新。
- `forge test --root contracts`は、solcコンパイラのダウンロード先(binaries.soliditylang.org)も同ポリシーで403拒否されるため実行できず、Contractのビルド・実行確認は未検証。

## Blocked

- CRS(`crs.aztec-labs.com`)とsolc(`binaries.soliditylang.org`)の両方がこのセッションのegressポリシーで403拒否されており、`pnpm generate:verifier`と`forge test`が実行できない。別環境(ネットワーク制限のないローカルまたはCI)で次を実行して結果を追記する必要がある。
  - `pnpm generate:verifier`でVerifierを再生成する。
  - `forge test --root contracts`で本Task変更分を含む全Contractテストを実行する。

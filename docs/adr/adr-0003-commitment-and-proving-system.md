---
id: adr-0003
type: adr
title: Policy CommitmentとProving System
epic: epic-01
status: accepted
date: 2026-08-30
---

# Policy CommitmentとProving System

## Context

秘密の`maxAmount`を推測されにくい形で固定し、生成したProofをEVM上で検証できる再現可能なツールチェーンが必要である。

## Decision

- `policyCommitment = Poseidon2(maxAmount, salt)`とする。
- `maxAmount`と暗号学的乱数の`salt`をPrivate Inputにする。
- Noir `1.0.0-beta.26`とBarretenberg `5.2.0`を固定する。
- EVM向けKeccak設定のUltraHonkでProof、Verification Key、Solidity Verifierを生成する。
- 生成されたSolidity Verifierは手動編集しない。

## Alternatives

- `hash(maxAmount)`だけを使う案は、候補額の総当たりに弱いため採用しない。
- EVM側でCommitmentを再計算する案は、秘密入力をオンチェーンへ公開するため採用しない。
- 生成Verifierを手動で最適化する案は、再生成可能性と検証鍵との対応を壊すため採用しない。

## Consequences

- saltを保持しないと同じPolicyのProofを再生成できない。
- Circuit、bb.js、Solidity Verifierのバージョンを一体で更新する必要がある。
- CommitmentとProofをOff-chainとOn-chainで同じ定義から再現できる。

## References

- [epic-01](../epics/epic-01-zk-payment.md)
- [Noir documentation](https://noir-lang.org/docs/)
- [Barretenberg](https://github.com/AztecProtocol/aztec-packages/tree/next/barretenberg)

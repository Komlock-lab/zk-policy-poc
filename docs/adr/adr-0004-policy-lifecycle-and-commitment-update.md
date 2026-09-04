---
id: adr-0004
type: adr
title: Policy lifecycleとオンチェーンCommitment更新
epic: epic-02
status: accepted
date: 2026-09-04
---

# Policy lifecycleとオンチェーンCommitment更新

## Context

秘密Policyの保存状態とAccountが実際に検証するCommitmentを混同せず、OwnerだけがPolicyを登録・更新できる状態遷移が必要である。

## Decision

- 本ADRは、[adr-0002](adr-0002-authorization-and-policy-boundary.md)のうちPolicy Commitmentをconstructorで固定し更新時に再deployするPhase 1の判断を置き換える。Owner認証とPolicy検証を分離する境界は引き続き維持する。
- AccountはPolicy未設定でデプロイし、設定状態をCommitment値とは別に保持する。
- Ownerだけが`updatePolicyCommitment(bytes32)`で初回登録と更新を行う。
- Off-chainでは1 Accountに1つの安定したPolicy IDを割り当て、更新ごとにversionを増やす。
- version状態は`pending`、`active`、`superseded`とし、activeとpendingはそれぞれ最大1件にする。
- API登録だけではactiveにせず、Owner Tx後の確定要求でreceiptと現在値を検証してactive化する。
- Proof生成時にもactive Commitmentとオンチェーン値の一致を確認する。

## Alternatives

- constructorでCommitmentを必須にする案は、Ownerによる初回Policy登録を独立した操作にできないため採用しない。
- API登録時に即active化する案は、オンチェーン未反映状態との不整合を生むため採用しない。
- Event常時監視案は、Phase 2へIndexerとbackground processを追加するため採用しない。

## Consequences

- AccountはPolicy未設定時の送金を明示的に拒否できる。
- Owner TxとAPI確定の二段階操作が必要になる。
- Commitment更新とProof生成が競合しても、不一致側が安全に失敗する。

## References

- [epic-02](../epics/epic-02-policy-management-proof-api.md)
- [adr-0002](adr-0002-authorization-and-policy-boundary.md)

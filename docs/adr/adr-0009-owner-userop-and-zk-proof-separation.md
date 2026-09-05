---
id: adr-0009
type: adr
title: Owner UserOperation認証とZK Proof実行検証の分離
epic: epic-03
status: accepted
date: 2026-09-04
---

# Owner UserOperation認証とZK Proof実行検証の分離

## Context

ERC-4337 AccountにはUserOperationの実行権限を検証するvalidation責務が加わる。一方、既存ZK Proofは秘密の支出上限を満たすことだけを証明しており、Owner認証へ流用してはならない。またPhase 2のOwner Transaction経路を壊さず、Bundler経路でも実送金額をPublic Inputとして検証する必要がある。

## Decision

- `ZkPolicyAccount`はERC-4337 v0.8の`IAccount`を直接実装し、信頼するEntryPointをimmutableに保持する。既存`execute(address,uint256,bytes)`と同じselectorを持つ`BaseAccount.execute`との衝突を避けるため、`BaseAccount`は継承しない。
- Account constructorを`owner`、`verifier`、`entryPoint`の3引数へ拡張し、Phase 2で追加された全deploy箇所を同時に更新する。
- `validateUserOp`はEntryPointからの呼出しだけを受け付け、`userOpHash`に対するOwner ECDSA署名を検証し、必要なprefundを支払う。
- ZK ProofをOwner認証に使用せず、UserOperationの`signature`にはOwner署名だけを格納する。
- Bundler経路にはEntryPointだけが呼べる`executeUserOp(recipient,value,proof)`を追加する。
- `executeUserOp`は`recipient`、`value`の境界を検証し、実際の`value`と保存済み`policyCommitment`からPublic Inputを再構築してProofを検証した後だけnative tokenを送る。
- Phase 2のOwner Transaction用`execute(recipient,value,proof)`は維持し、両経路で同じ内部Policy検証・送金処理を使用する。
- ZK Proof検証はexecution段階だけで行う。Owner署名がないUserOperationはvalidationで拒否し、Ownerが署名した不正Proofはexecutionで失敗させる。

## Alternatives

- ZK ProofをUserOperation署名の代わりにする案は、支出Policy検証と実行権限を混同するため採用しない。
- `validateUserOp`でProofも検証する案は、Bundler validation中に高コストなVerifierを実行し、executionでも送金値との結合を再確認する必要が生じるため採用しない。
- 既存`execute`のcallerをOwnerまたはEntryPointに広げる案は、異なる認証経路を1つの外部interfaceへ混在させるため採用しない。
- ERC-4337の`BaseAccount`を継承する案は、Phase 2の`execute(address,uint256,bytes)`と同一selectorの汎用実行関数を持ち、既存のZK Policy実行interfaceと責務が衝突するため採用しない。
- Phase 2のOwner Transaction経路を削除する案は、既存の受け入れ条件とClientを壊すため採用しない。

## Consequences

- Owner認証、ERC-4337 transport、ZK Policy検証の責務が分離される。
- ERC-4337の最小interface、署名検証、prefund処理をAccount内で明示的に実装・testする必要がある。
- Phase 2の直接TransactionとPhase 3のUserOperationを回帰テストできる。
- 正しいOwner署名でもProofが不正ならUserOperationのexecutionは失敗し、gasは消費され得る。
- AccountはOwner秘密鍵、Policy秘密値、API Tokenを保持しない。

## References

- [[erc-4337-zk-policy-payment]]
- [adr-0002](adr-0002-authorization-and-policy-boundary.md)
- [epic-02](../epics/epic-02-policy-management-proof-api.md)

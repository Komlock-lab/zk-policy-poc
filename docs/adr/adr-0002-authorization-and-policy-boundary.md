---
id: adr-0002
type: adr
title: Owner認証とZK Policy検証の責務分離
epic: epic-01
status: accepted
date: 2026-08-30
---

# Owner認証とZK Policy検証の責務分離

## Context

送金内容と実行権限の承認、秘密の支出ポリシーの検証、将来のERC-4337対応を混同しない構成が必要である。

## Decision

- Phase 1ではOwner EOAのトランザクション署名と`msg.sender == owner`で認証する。
- ZK Proofは認証に使用せず、支出上限Policyの検証だけに使用する。
- Owner、Verifier、`policyCommitment`はAccountのconstructorで固定する。
- Accountは認証、入力検証、Proof検証を完了してから外部送金を行う。
- ERC-4337 UserOperation対応とPolicy更新は後続Epicへ分離する。

## Alternatives

- ZK Proofへ実行権限も含める案は、認証とPolicy検証が密結合になるため採用しない。
- Phase 1からPolicy更新機能を持たせる案は、nonce、署名、有効期限、状態遷移が追加されるため採用しない。
- Phase 1からERC-4337 Accountを実装する案は、PoCのProof検証責務を不必要に広げるため採用しない。

## Consequences

- Phase 1の認証経路は単純になり、ZK制約を独立して検証できる。
- Policy更新にはAccountの再デプロイが必要である。
- CircuitとProverはERC-4337へ移行しても再利用できる。

## References

- [epic-01](../epics/epic-01-zk-payment.md)
- [ZK Policy Enforcement Layer ロードマップ](../roadmap.md)

---
id: adr-0012
type: adr
title: Policy CommitmentとCircuit Public Inputへのallowed target追加
epic: epic-05
status: accepted
date: 2026-09-06
---

# Policy CommitmentとCircuit Public Inputへのallowed target追加

## Context

roadmap Phase 6は「送金先Addressのallowlist」を含む複数条件対応を計画している。現行のCircuit(`circuits/spend-limit`)は`value <= maxAmount`とCommitment一致だけを制約し、送金先を制約しない。上限内であれば任意の送金先へ送金できてしまい、Prompt Injectionで送金先だけを差し替える攻撃を防げない。

adr-0003は`policyCommitment = Poseidon2(maxAmount, salt)`という2入力Commitmentを定めている。送金先を秘密Policyへ含めるには、この定義とPublic Inputの構成を変更する必要がある。

## Decision

- Private Policyに`allowedTarget`(単一address、20byte)を追加する。複数送金先のallowlistは将来のEpicで扱い、本Epicでは1 Policyにつき1つの送金先とする。
- `policyCommitment = Poseidon2(maxAmount, allowedTarget, salt)`とする(3入力)。入力順序は`maxAmount`→`allowedTarget`→`salt`に固定する。
- Circuitに新しいPublic Input`target`を追加し、`target == allowedTarget`を制約する。`allowedTarget`はPrivate Inputのままとし、送金先そのものはオンチェーンへ公開しない。
- Public Inputの順序を`[value, target, policyCommitment]`とする。adr-0001の「実際に送金する`value`をPublic Inputの先頭へ渡す」は維持し、`target`をCommitmentの前に挿入する。
- `target`はEVM addressをFieldとして扱う(`uint256(uint160(address))`、Solidity側は`bytes32(uint256(uint160(recipient)))`)。
- 本変更は破壊的である。既存の2入力Commitmentは新Circuitで検証できない。Phase 1-4はローカルAnvilのPoCであり永続資産がないため、移行措置は作らずPolicyの再登録を前提とする。

## Alternatives

- `target`もPrivate Inputにしてオンチェーンで別途allowlistを管理する案は、Accountに送金先の平文リストを保持させることになり、秘密Policyを隠す既存方針(adr-0003)と矛盾するため採用しない。
- 複数送金先のallowlist(Merkle Treeによる所属証明など)を最初から実装する案は、汎用化を先行させないという開発方針に反し、Phase 6の他項目(累積上限、risk score)より前に必要な検証範囲を超えるため採用しない。
- 既存Commitment形式を維持し、送金先制約をContract側だけで行う案(例えばAccountにallowlistを平文で保持する)は、秘密Policyの一部を平文でオンチェーンへ公開するため採用しない。

## Consequences

- Circuitの制約数とProof生成時間がわずかに増える。`pnpm benchmark:circuit`で計測し直す必要がある。
- Circuit、Prover、Contractの3か所でPublic Inputの並びを一致させる責務が増える。
- 本Epic適用後、Phase 1-4で登録済みのPolicyとCommitmentはすべて無効になり、再登録が必要になる。
- `salt`に加えて`allowedTarget`もPrivate Inputとして扱うため、Proof生成に必要な秘密値が1つ増える。

## References

- [epic-05](../epics/epic-05-target-allowlist-payment.md)
- [adr-0001](adr-0001-amount-and-public-inputs.md)
- [adr-0003](adr-0003-commitment-and-proving-system.md)
- [Noir Public and Private Inputs](../../llm-wiki/wiki/concepts/noir-public-and-private-inputs.md)

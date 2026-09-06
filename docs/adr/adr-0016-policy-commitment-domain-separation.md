---
id: adr-0016
type: adr
title: Policy Commitmentへのdomain separation追加
epic: epic-06
status: accepted
date: 2026-09-06
---

# Policy Commitmentへのdomain separation追加

## Context

`policyCommitment`は`Poseidon2::hash(policy_fields, 65)`として、65個の秘密Policy Fieldをそのままハッシュしている。この入力集合(schemaVersion、条件フラグ、salt等)は本Circuit専用の構造だが、ハッシュ自体にはその文脈を示す情報が含まれない。将来、同じPoseidon2実装を別の文脈(別Circuit、別Commitment用途)で使う場合、意図しない入力の衝突や誤用を検知できない。

zk-boundは`policyCommitment`の計算に`keccak256(domain tag) mod BN254_Fr`をdomain separatorとして加えており、Commitmentの文脈を明示している。

## Decision

- `POLICY_DOMAIN = keccak256("zk-policy-poc.policy.v2") mod BN254_Fr`を新しい定数とする(値: `0x0e5559f3d2fd7506a74426bba115323b003c6e165d2f7fd8e518881ce1a72d02`)。
- Commitmentを2段階のPoseidon2ハッシュにする。`policyFieldsHash = Poseidon2::hash(policy_fields, 65)`、`policyCommitment = Poseidon2::hash([POLICY_DOMAIN, policyFieldsHash], 2)`。
- 65個のPolicy Fieldとその添字構成(schemaVersion、allowlist、asset rules等)は変更しない。domain separationは既存構造を包む外側の1段として追加し、Circuit内の他の制約・添字には影響させない。
- 本変更は破壊的である。既存の(domain無し)Commitmentは新しい計算式と一致しない。Phase 1-6はローカルAnvilのPoCであり永続資産がないため、移行措置は作らずPolicyの再登録を前提とする。
- Circuit・`packages/policy`の両方で同じ2段階計算を実装し、既知ベクトルで一致を確認する。

## Alternatives

- 65 Fieldの先頭にdomain tagを追加し66要素にする案は、既存の全添字(schemaVersion@0、salt@64等)をずらすため、Circuit・TS・監査済みドキュメントへの影響が大きく採用しない。
- domain separationを追加しない案は、単一Circuitの現状では実害がないが、zk-boundの実践から得られる低コストな将来のhardeningを見送ることになるため採用しない。

## Consequences

- 既存の(このセッション開始時点でローカルにしか存在しない)Policy登録はすべて無効になり、再登録が必要になる。
- Circuit制約が1回のPoseidon2 permutationの呼び出し分増える。`pnpm benchmark:circuit`で計測し直す必要がある。
- Commitment計算がCircuit・TS双方で2箇所に分かれるため、既知ベクトルによる一致確認(golden vector test)の価値が上がる。

## References

- [epic-06](../epics/epic-06-multi-policy.md)
- [adr-0012](adr-0012-composite-policy-schema.md)
- [adr-0003](adr-0003-commitment-and-proving-system.md)

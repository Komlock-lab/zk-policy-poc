---
id: adr-0016
type: adr
title: Safe Moduleではなく自作Smart Accountを実行境界にする
epic: epic-01
status: accepted
date: 2026-09-07
---

# Safe Moduleではなく自作Smart Accountを実行境界にする

## Context

同じ問題意識から、実行境界の候補は2つあった。

1. Safe に `ZkPolicySafeModule` を載せる経路。先行実装は [zk-bound](https://github.com/br-to/zk-bound) と、その前身 [zk-agent-guard](https://github.com/br-to/zk-agent-guard) にある。
2. Owner認証とZK Proof検証を持つ自作 Smart Account（`ZkPolicyAccount`）を実装し、後で ERC-4337 へ接続する経路。本リポジトリがこれである。

Safe Module は本番寄りの実行境界として妥当である。一方で、Account 内部の認証、UserOperation 検証、EntryPoint との境界、Proof 検証の順序を自分で追わないと、後から既存 Account へ載せる判断もできない。

2026-09-07のユーザー指示「Safe Moduleは使わずsmart accountの理解のためにこっちにした。今後のため」により承認する。

## Decision

- PoC の実行境界は Safe Module ではなく、自作の `ZkPolicyAccount` とする。
- Phase 1では通常Transactionの Owner 認証と ZK Policy 検証を同じ Account に置き、Phase 3で ERC-4337 UserOperation へ接続する。
- zk-bound の Safe Module 実装は移植しない。先行検討と対比対象としてリポジトリリンクを残す。
- 脅威モデルや repository 運用など Safe に依存しない知見だけを取り込む。取り込み範囲は [比較記録](../reviews/zk-bound-selective-comparison.md) を正本とする。

## Alternatives

- Safe + `ZkPolicySafeModule`（[zk-bound](https://github.com/br-to/zk-bound)）: 既存 Safe の権限モデルと ModuleManager を使える。Account 内部と ERC-4337 の学習機会が減るため、この PoC では採用しない。
- 既存 ERC-4337 Account へ Validator だけを追加する案: Account 本体の理解が薄いまま境界だけ増えるため、最初の経路にはしない。

## Consequences

- Owner 認証、Proof 検証、送金、日次累積、UserOperation 検証を同じ Account で追える。
- Safe 固有の module enable / `execTransactionFromModule` / Safe nonce は持たない。
- 将来 Safe Module や既存 Account の Validator へ戻す場合でも、ここで得た Account / ERC-4337 の理解を前提にできる。
- zk-bound 側の暗号層と脅威モデルは対比可能な先行実装として残る。

## References

- [zk-bound](https://github.com/br-to/zk-bound)
- [zk-agent-guard](https://github.com/br-to/zk-agent-guard)
- [adr-0002](adr-0002-authorization-and-policy-boundary.md)
- [adr-0008](adr-0008-erc4337-v08-local-stack.md)
- [adr-0009](adr-0009-owner-userop-and-zk-proof-separation.md)
- [比較記録](../reviews/zk-bound-selective-comparison.md)

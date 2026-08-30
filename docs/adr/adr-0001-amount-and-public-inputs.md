---
id: adr-0001
type: adr
title: Phase 1の金額表現とPublic Input
epic: epic-01
status: accepted
date: 2026-08-30
---

# Phase 1の金額表現とPublic Input

## Context

Circuitの制約コストを抑えつつEVMの標準ABIと接続し、Proofで検証する金額と実際の送金額を一致させる必要がある。

## Decision

- Circuit、Proof、Contract内部ではweiの整数を使用する。
- Circuitの`value`と`maxAmount`は`u128`とする。
- Contractの外部入力は`uint256`とし、Verifier呼び出し前に`u128`範囲を検証する。
- 実際に送金する`value`をPublic Inputの先頭へ渡す。
- ETH表記との変換はスクリプト境界だけで行う。

## Alternatives

- Circuitでも`u256`を使う案は、Phase 1の金額範囲に不要で制約が増えるため採用しない。
- ETHの小数表記をドメイン内部で扱う案は、丸めと単位不一致を生むため採用しない。
- Proof用金額を呼び出し元から別に受け取る案は、実送金額との差し替えを許すため採用しない。

## Consequences

- 最大値は`2^128 - 1 wei`に制限されるが、Phase 1のnative token送金には十分である。
- Contract ABIは一般的な`uint256`を維持できる。
- Proofと実送金額の結合をAccountが強制できる。

## References

- [epic-01](../epics/epic-01-zk-payment.md)
- [Noir integer types](https://noir-lang.org/docs/noir/concepts/data_types/integers)

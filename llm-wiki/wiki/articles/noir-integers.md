---
title: Noir Integers
author: Noir Documentation
published: unknown
type: article
source: https://noir-lang.org/docs/language/data_types/integers
retrieved: 2026-08-30
tags: [noir, circuit, integer, u128]
---

# Noir Integers

## TL;DR

Noir `u128`はrange-constrained unsigned Fieldとして`0`から`2^128 - 1`を表現でき、非負のwei金額を扱うPhase 1に適合する。

## Key claims

- Noirは8、16、32、64、128 bitのunsigned integerをサポートする。
- 128 bit integerは取得時点ではunsignedだけが対象である。
- 通常のinteger演算はtype範囲を超えるとoverflow errorになる。

## Technical details

- `u128`の範囲は`0..=2^128-1`である。
- Circuitと外部境界の両方でrangeを明示的に検証する。

## Limitations and caveats

- 対応bit幅とoverflow semanticsはNoir versionに依存する。
- EVM ABIの`uint256`からCircuit `u128`へ渡す前にrange checkが必要である。

## Project relevance

- [[noir-integer-types]]とADR 0001の金額型選択を裏付ける。

## Related concepts

- [[noir-integer-types]]
- [[noir-public-and-private-inputs]]

## Source

- [Raw clipping](../../raw/articles/noir-integers.md)
- https://noir-lang.org/docs/language/data_types/integers

---
title: Noir Data Types
author: Noir Documentation
published: unknown
type: article
source: https://noir-lang.org/docs/language/data_types
retrieved: 2026-08-30
tags: [noir, circuit, public-input, private-input]
---

# Noir Data Types

## TL;DR

Noir inputはprivateがdefaultで、`main` parameterの`pub`がVerifierへ公開する値を指定する。オンチェーン検証するPublic Inputは秘密ではない。

## Key claims

- NoirのtypeはFieldを基礎に構成される。
- input visibilityは変数単位で指定できる。
- public valueはProofとVerifierへ公開され、on-chain verificationではBlockchain利用者から観測可能になる。

## Technical details

- Phase 1の`value`と`policyCommitment`はPublic Inputである。
- `maxAmount`と`salt`はdefault private inputとしてwitnessにだけ含める。

## Limitations and caveats

- `pub` inputとNoir functionの公開範囲は異なる概念である。
- visibility semanticsはNoir `v1.0.0-beta.26`、取得日2026-08-30を基準とする。

## Project relevance

- [[noir-public-and-private-inputs]]とEpic 01のOn-chain / Off-chain境界を裏付ける。

## Related concepts

- [[noir-public-and-private-inputs]]
- [[noir-integer-types]]

## Source

- [Raw clipping](../../raw/articles/noir-data-types.md)
- https://noir-lang.org/docs/language/data_types

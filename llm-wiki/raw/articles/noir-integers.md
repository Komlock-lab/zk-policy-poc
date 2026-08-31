---
title: Integers
source: https://noir-lang.org/docs/language/data_types/integers
publisher: Noir Documentation
published: unknown
retrieved: 2026-08-30
document_version: v1.0.0-beta.26
---

# Noir Integers

## Preserved material

- Noirのintegerはrange constraintを持つField typeである。
- unsigned integerは8、16、32、64、128 bitを利用でき、128 bitはunsignedだけをサポートする。
- unsigned integerの最大値はbit幅で決まり、`u128`は`0`から`2^128 - 1`を表現する。
- 通常の演算で範囲を超えるとoverflow errorになる。
- Phase 1では送金額と上限を非負のwei整数として`u128`にした。

## Capture note

取得時の公式ドキュメントversionは`v1.0.0-beta.26`。対応typeやoverflow semanticsはversion依存のため、Noir更新時に再確認する。

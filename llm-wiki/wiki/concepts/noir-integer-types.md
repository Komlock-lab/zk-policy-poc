---
title: Noir Integer Types
type: concept
tags: [noir, integer, range, u128]
sources: [noir-integers]
updated: 2026-08-30
---

# Noir Integer Types

Noirのintegerはbit幅に応じたrange constraintを持つ。`u128`は非負値`0..=2^128-1`を表現し、範囲外の値をCircuitへ入れない境界検証と組み合わせる。

## Phase 1 mapping

- Circuitの`value`と`maxAmount`は`u128`。
- Contract ABIはEVM標準の`uint256`。
- ContractはVerifier呼び出し前に`value <= type(uint128).max`を検証する。
- 単位はすべてweiとし、ETH表示はUIまたはscript境界に限定する。

## Version boundary

Noir `v1.0.0-beta.26`、取得日2026-08-30のinteger仕様を基準とする。Noir更新時は対応bit幅とoverflow semanticsを再確認する。

## Sources

- [[noir-integers]]
- [[noir-data-types]]

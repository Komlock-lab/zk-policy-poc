---
title: Noir Public and Private Inputs
type: concept
tags: [noir, zero-knowledge, public-input, private-input]
sources: [noir-data-types]
updated: 2026-08-30
---

# Noir Public and Private Inputs

Noirのinputはdefaultでprivateであり、`main` parameterの`pub` modifierでVerifierへ公開する値を指定する。on-chain verifierへ渡すPublic InputはBlockchain上で観測可能なので、秘密情報を置かない。

## Phase 1 mapping

- Public: 実際の送金額`value`、登録済み`policyCommitment`
- Private: 支出上限`maxAmount`、Commitment用`salt`

Proof検証に使うPublic InputとContractが実際に使用する値を結合し、呼び出し元が別値へ差し替えられないようにする。

## Sources

- [[noir-data-types]]
- [[noir-integer-types]]

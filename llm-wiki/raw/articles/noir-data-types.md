---
title: Data Types
source: https://noir-lang.org/docs/language/data_types
publisher: Noir Documentation
published: unknown
retrieved: 2026-08-30
document_version: v1.0.0-beta.26
---

# Noir Data Types

## Preserved material

- Noirの値はFieldを基礎とし、primitive typeとcompound typeを提供する。
- inputはprivateがdefaultで、`main`のparameterへ`pub`を付けるとVerifierへ公開される。
- オンチェーンVerifierで検証するPublic InputはBlockchain利用者から観測可能になる。
- Phase 1では`value`と`policyCommitment`をpublic、`maxAmount`と`salt`をprivateにした。

## Capture note

取得時の公式ドキュメントversionは`v1.0.0-beta.26`。visibilityの意味はNoir programのinputに対するもので、Solidityの関数visibilityとは別である。

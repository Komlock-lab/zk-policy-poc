---
title: Crypto
source: https://nodejs.org/api/crypto.html
publisher: Node.js Documentation
published: unknown
retrieved: 2026-09-04
document_version: v26.8.1
---

# Node.js authenticated encryption

## Preserved material

- `crypto.createCipheriv()`と`crypto.createDecipheriv()`は鍵とIVを明示して暗号化・復号する。
- GCMはauthentication tagを生成し、復号時にtagがない、またはciphertextが改ざんされている場合は`final()`が失敗する。
- IVは秘密である必要はないが、予測困難かつ一意であるべきである。
- GCMのauthentication tagは既定で16 bytesであり、Node.jsではciphertextとは別に取得・保存する。

## Capture note

Phase 2の保存データ暗号化に必要なNode.js APIの性質だけを2026-09-04時点で記録した。アルゴリズムの一般的な安全性評価ではなく、実装APIの根拠として使用する。

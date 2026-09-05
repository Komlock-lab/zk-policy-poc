---
title: Node.js Authenticated Encryption APIs
author: Node.js Documentation
published: unknown
type: article
source: https://nodejs.org/api/crypto.html
retrieved: 2026-09-04
tags: [nodejs, cryptography, aes-gcm, secrets]
---

# Node.js Authenticated Encryption APIs

## TL;DR

Node.jsの`Cipheriv`/`Decipheriv`はAES-GCMを含むauthenticated encryptionを提供する。ciphertext、ランダムIV、authentication tagを保存し、復号時にtagを検証することで、秘密値の漏えいだけでなく保存データの改ざんも検出する。

## Key claims

- GCMでは暗号化完了後にauthentication tagを取得する。
- 復号時にtagが不正なら`final()`が失敗する。
- IVは暗号学的乱数から生成し、同じ鍵で再利用しない。

## Technical details

- Phase 2ではAES-256-GCM、32-byte key、12-byte random IV、16-byte authentication tagを固定する。
- `policyId`と`version`をAADとして結び付け、別recordへのciphertext差し替えを検出する。
- keyはDBへ保存せず、環境変数からbase64形式で読み込む。

## Limitations and caveats

- 環境変数のkeyが漏えいするとDB内の全Policyを復号できる。
- Phase 2ではKMS、key rotation、複数key version、backup運用を扱わない。
- application logやerrorへplaintextを含めない設計が別途必要である。

## Project relevance

- [[local-policy-secret-storage]]で`maxAmount`と`salt`を暗号化してSQLiteへ保存する根拠になる。

## Related concepts

- [[local-policy-secret-storage]]

## Source

- [Raw clipping](../../raw/articles/node-crypto-aead.md)
- https://nodejs.org/api/crypto.html

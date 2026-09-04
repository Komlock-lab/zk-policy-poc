---
title: Local Policy Secret Storage
type: concept
tags: [sqlite, aes-gcm, policy, secrets]
sources: [node-sqlite, node-crypto-aead]
updated: 2026-09-04
---

# Local Policy Secret Storage

Phase 2の単一プロセスPolicy APIは、metadataと暗号化した秘密PolicyをSQLiteへ永続化する。`maxAmount`と`salt`はAES-256-GCMで暗号化し、暗号鍵はDBと分離した環境変数から取得する。

## Project baseline

- Runtime: Node.js `>=22.13 <25`
- Database: 組み込み`node:sqlite`のfile-backed database
- Encryption: AES-256-GCM
- Key: base64 encoded 32 bytes supplied by environment variable
- IV: recordごとに生成する12 random bytes
- Authentication tag: 16 bytes
- AAD: `policyId`と`version`
- Test database: `:memory:`

## Stored data

- 暗号化対象: `maxAmount`、`salt`
- 平文metadata: Policy ID、Account、version、Commitment、status、nonce、token hash
- 保存禁止: Owner private key、平文Proof API Token

## Scope boundary

KMS、key rotation、backup encryption、複数process、horizontal scaling、PostgreSQL移行はPhase 2に含めない。

## Sources

- [[node-sqlite]]
- [[node-crypto-aead]]

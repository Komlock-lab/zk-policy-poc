---
title: Node.js SQLite
author: Node.js Documentation
published: unknown
type: article
source: https://nodejs.org/api/sqlite.html
retrieved: 2026-09-04
tags: [nodejs, sqlite, persistence]
---

# Node.js SQLite

## TL;DR

Node.jsはv22.5.0から組み込みの`node:sqlite`を提供し、v22.13.0以降は追加flagなしで利用できる。同期APIの`DatabaseSync`は単一プロセスのローカルPoCに適するが、request処理をblockする性質を前提に利用範囲を限定する。

## Key claims

- SQLiteをfile-backedまたはin-memoryで利用できる。
- `DatabaseSync`操作は同期的である。
- Node.js 22系でflagなしに使うにはv22.13.0以降が必要である。

## Technical details

- Testでは`:memory:`、実行時は明示したDB file pathを使用できる。
- SQL値はprepared statementへbindし、外部入力をSQL文字列へ連結しない。
- nonceの検証・消費とPolicy version作成を1 transactionで処理する。

## Limitations and caveats

- 取得時の最新ドキュメントではmoduleはRelease candidateである。
- 同期APIなので、水平分散や高負荷を想定するAPIには別のdatabase access構成が必要になる。

## Project relevance

- Phase 2の単一プロセスPolicy APIに、外部DB serverやnative addonなしで永続化を追加できる。
- [[local-policy-secret-storage]]のmetadata、nonce、暗号化payload保存に使用する。

## Related concepts

- [[local-policy-secret-storage]]

## Source

- [Raw clipping](../../raw/articles/node-sqlite.md)
- https://nodejs.org/api/sqlite.html

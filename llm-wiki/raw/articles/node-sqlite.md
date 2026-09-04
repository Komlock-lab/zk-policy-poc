---
title: SQLite
source: https://nodejs.org/api/sqlite.html
publisher: Node.js Documentation
published: unknown
retrieved: 2026-09-04
document_version: v26.8.1
---

# Node.js SQLite

## Preserved material

- `node:sqlite`はNode.js v22.5.0で追加された。
- v22.13.0から`--experimental-sqlite`なしで利用できる。
- `DatabaseSync`はfile-backed databaseと`:memory:` databaseを扱える。
- `DatabaseSync`のAPIは同期的に実行される。

## Capture note

Phase 2は単一プロセスのローカルPoCとして`DatabaseSync`を利用する。取得時の最新ドキュメントではmoduleの安定性はRelease candidateである。

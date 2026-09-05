---
id: task-02-01-03
type: task
title: SQLite Policy repository
story: story-02-01
status: done
blocked_by: [task-02-01-01]
created: 2026-09-04
updated: 2026-09-04
---

# SQLite Policy repository

## 目的

Policy version、状態、nonce、Token hashを原子的に永続化する。

## 作業

- `node:sqlite`でfile-backedと`:memory:` repositoryを実装する。
- AccountとPolicyの一意性、active/pending件数をDB制約で守る。
- prepared statementとtransactionでnonce消費とversion作成を行う。
- schema初期化とrepository testを追加する。

## 完了条件

- 再起動後も状態が保持され、競合するnonceまたは状態更新は一方だけ成功する。

## 検証方法

- Repository unit test
- `pnpm typecheck`

## 検証結果

- Repository unit test 3件が成功し、初回作成とactive化、重複時rollback、file再open後の状態保持を確認した。
- `pnpm typecheck`が成功した。

## Blocked

なし。

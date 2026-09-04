---
id: task-02-01-01
type: task
title: API workspaceと設定
story: story-02-01
status: done
blocked_by: []
created: 2026-09-04
updated: 2026-09-04
---

# API workspaceと設定

## 目的

固定versionと安全なlocal設定でPolicy APIを起動できるようにする。

## 作業

- `apps/policy-api`と`apps/policy-cli`をworkspaceへ追加する。
- Fastify `5.12.1`を固定し、Node.jsを`>=22.13 <25`にする。
- RPC、DB path、base64暗号鍵、listen host/portをZodで検証する。
- `127.0.0.1`とchain ID `31337`以外を拒否する。

## 完了条件

- 有効な設定でAPIが起動し、無効な設定では処理開始前に失敗する。

## 検証方法

- `pnpm typecheck`
- API設定unit test

## 検証結果

- `pnpm typecheck`が成功した。
- API設定unit test 3件が成功し、local設定の受理、remote RPC URLと不正鍵の拒否を確認した。

## Blocked

なし。

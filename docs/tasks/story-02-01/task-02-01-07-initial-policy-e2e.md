---
id: task-02-01-07
type: task
title: 初回Policy登録E2E
story: story-02-01
status: pending
blocked_by: [task-02-01-06]
created: 2026-09-04
updated: 2026-09-04
---

# 初回Policy登録E2E

## 目的

Story 02-01の初回登録と拒否条件をlocal stack全体で検証する。

## 作業

- 非fork Anvil、API、CLI、Accountを接続したtest harnessを作る。
- 正常登録と署名者、deadline、nonce、Commitment、未設定送金の各異常系を検証する。
- 再起動後のPolicy状態とToken非保存を確認する。

## 完了条件

- Story 02-01の全受け入れ条件が自動testへ対応する。

## 検証方法

- Story 02-01 E2E command
- `pnpm test:contracts`

## 検証結果

未実施。

## Blocked

なし。

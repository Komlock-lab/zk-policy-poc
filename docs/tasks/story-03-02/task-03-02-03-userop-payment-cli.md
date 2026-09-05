---
id: task-03-02-03
type: task
title: UserOperation決済CLI
story: story-03-02
status: pending
blocked_by: [task-03-02-02]
created: 2026-09-05
updated: 2026-09-05
---

# UserOperation決済CLI

## 目的

Ownerが既存Policy設定を使ってProof付きUserOperation決済をCLIから実行できるようにする。

## 作業

- `policy:pay-userop RECIPIENT VALUE_WEI` commandを追加する。
- Policy API、execution RPC、Bundler URL、EntryPoint、Account、Owner key、Policy ID、Tokenを環境変数から検証する。
- 成功時にPolicy ID、Policy version、UserOperation hash、bundle transaction hashを出力する。
- 入力または実行失敗時に秘密値を出力せず非zeroで終了する。

## 完了条件

- CLIが有効な入力でUserOperation receiptを返し、不正入力を接続前に拒否する。

## 検証方法

- CLI unit test
- Local CLI integration test

## 検証結果

未実施。

## Blocked

なし。

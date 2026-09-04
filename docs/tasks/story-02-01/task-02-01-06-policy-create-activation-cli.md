---
id: task-02-01-06
type: task
title: Policy作成・active化CLI
story: story-02-01
status: pending
blocked_by: [task-02-01-05]
created: 2026-09-04
updated: 2026-09-04
---

# Policy作成・active化CLI

## 目的

Ownerが1 command flowでPolicy登録、Tx送信、API確定を実行できるようにする。

## 作業

- wei入力、salt・Commitment生成、context取得、EIP-712署名を実装する。
- Account更新Txを送りreceipt後にactivationを要求する。
- Tokenを標準出力へ一度だけ表示し、秘密値を表示しない。
- argumentとlocal chainを境界検証する。

## 完了条件

- CLI実行後にAPIとAccountで同じCommitmentのversion 1がactiveになる。

## 検証方法

- CLI integration test
- local AnvilでCLIを実行

## 検証結果

未実施。

## Blocked

なし。

---
id: task-02-04-02
type: task
title: Token再発行CLI
story: story-02-04
status: pending
blocked_by: [task-02-04-01]
created: 2026-09-04
updated: 2026-09-04
---

# Token再発行CLI

## 目的

OwnerがCLIからToken再発行へ署名し、新Tokenを受け取れるようにする。

## 作業

- nonce取得、EIP-712署名、再発行API呼び出しを実装する。
- 新Tokenだけを一度表示し、Owner鍵や署名内容をlogへ残さない。

## 完了条件

- CLIからTokenを再発行でき、秘密情報の不要な出力がない。

## 検証方法

- CLI token rotation integration test

## 検証結果

未実施。

## Blocked

なし。

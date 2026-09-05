---
id: task-02-04-02
type: task
title: Token再発行CLI
story: story-02-04
status: done
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

- `PATH="..." pnpm typecheck`: 成功。
- `PATH="..." pnpm test:unit`: 11 files、59 tests成功。CLI client 3 testsでAccount contextからのPolicy ID・nonce取得、exact EIP-712署名、Zod response検証を確認した。
- CLI entry pointはAccountとOwner鍵から再発行し、新Tokenを含むresponseだけを標準出力へ1回出力する。秘密値や署名のlog出力はない。

## Blocked

なし。

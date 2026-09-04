---
id: task-02-02-03
type: task
title: Policy更新CLI
story: story-02-02
status: pending
blocked_by: [task-02-02-02]
created: 2026-09-04
updated: 2026-09-04
---

# Policy更新CLI

## 目的

Ownerが既存Policy IDを維持したまま上限を更新できるようにする。

## 作業

- context取得、新しい秘密値生成、PolicyUpdate署名、API登録を実装する。
- Account更新TxとAPI確定を一連で実行する。
- 途中失敗時にpending状態とtx hashを明示する。

## 完了条件

- CLIでPolicy versionが増加し、新Commitmentがactiveになる。

## 検証方法

- CLI update integration test

## 検証結果

未実施。

## Blocked

なし。

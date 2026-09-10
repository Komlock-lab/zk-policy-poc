---
id: task-06-04-02
type: task
title: 型を固定したContract決済
story: story-06-04
status: pending
blocked_by: [task-06-04-01]
created: 2026-09-06
updated: 2026-09-06
---

# 型を固定したContract決済

## 目的

[story-06-04](../../stories/epic-06/story-06-04-user-pays-allowed-contract.md)の正常系操作を実現する。

## 作業

pay(bytes32) payable fixtureとAccountのkind=2経路を実装する。Accountが固定selectorを組み立て、外部入力のraw calldataを受け取らない。

## 完了条件

指定invoiceIdのイベントとnative残高増加を確認できる。

## 検証方法

pnpm test:contracts; pnpm build

既存コマンドの対象テストと同じharnessを使う。新規テストファイル・fixtureを追加した場合は実行結果に正確なコマンドを記録する。

## 検証結果

未実施。

## Blocked

実装開始はEpicのPreflight解消後。

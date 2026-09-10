---
id: task-06-03-02
type: task
title: Accountの標準ERC-20送金
story: story-06-03
status: pending
blocked_by: [task-06-03-01]
created: 2026-09-06
updated: 2026-09-06
---

# Accountの標準ERC-20送金

## 目的

[story-06-03](../../stories/epic-06/story-06-03-user-pays-allowed-erc20.md)の正常系操作を実現する。

## 作業

kind=1の型付き実行、標準ERC-20 fixture、実行イベントを追加する。assetとrecipientとamountは実transfer引数から公開入力へ渡す。

## 完了条件

Owner直接実行とEntryPoint実行で同じToken残高変化を確認できる。

## 検証方法

pnpm test:contracts; pnpm build

既存コマンドの対象テストと同じharnessを使う。新規テストファイル・fixtureを追加した場合は実行結果に正確なコマンドを記録する。

## 検証結果

未実施。

## Blocked

実装開始はEpicのPreflight解消後。

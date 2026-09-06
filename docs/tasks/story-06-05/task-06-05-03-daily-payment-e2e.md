---
id: task-06-05-03
type: task
title: 同日連続・日跨ぎ・資産別決済E2E
story: story-06-05
status: pending
blocked_by: [task-06-05-02]
created: 2026-09-06
updated: 2026-09-06
---

# 同日連続・日跨ぎ・資産別決済E2E

## 目的

[story-06-05](../../stories/epic-06/story-06-05-user-pays-with-daily-budget.md)の正常系操作を実現する。

## 作業

Anvil時刻制御と実Bundlerを使い、ACの各支払い・残高・累積を確認する。gasとprefundを累積に含めないことを観測する。

## 完了条件

各ACの累積額がreceipt後のAccount getterと一致する。

## 検証方法

pnpm test:e2e

既存コマンドの対象テストと同じharnessを使う。新規テストファイル・fixtureを追加した場合は実行結果に正確なコマンドを記録する。

## 検証結果

未実施。

## Blocked

実装開始はEpicのPreflight解消後。

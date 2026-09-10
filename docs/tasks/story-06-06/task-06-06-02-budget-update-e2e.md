---
id: task-06-06-02
type: task
title: 更新・asset再登録後の累積引継ぎE2E
story: story-06-06
status: pending
blocked_by: [task-06-06-01]
created: 2026-09-06
updated: 2026-09-06
---

# 更新・asset再登録後の累積引継ぎE2E

## 目的

[story-06-06](../../stories/epic-06/story-06-06-owner-updates-daily-budget.md)の正常系操作を実現する。

## 作業

実APIで更新・active化し、nativeとERC-20の再登録を含む正常系を確認する。

## 完了条件

ACの累積引継ぎとrecipient残高を実Proofで確認できる。

## 検証方法

pnpm test:e2e

既存コマンドの対象テストと同じharnessを使う。新規テストファイル・fixtureを追加した場合は実行結果に正確なコマンドを記録する。

## 検証結果

未実施。

## Blocked

実装開始はEpicのPreflight解消後。

---
id: task-06-06-01
type: task
title: Policy更新と支出状態の独立性を実装・確認
story: story-06-06
status: pending
blocked_by: []
created: 2026-09-06
updated: 2026-09-06
---

# Policy更新と支出状態の独立性を実装・確認

## 目的

[story-06-06](../../stories/epic-06/story-06-06-owner-updates-daily-budget.md)の正常系操作を実現する。

## 作業

Owner CLIとAPIのasset別dailyLimit更新を仕上げ、Commitment更新がlastDay/spentを初期化しないことを確認する。履歴はPolicy versionでなくAccountとassetに紐付ける。

## 完了条件

新versionのProofが更新前累積を使い、支払い後に合算される。

## 検証方法

pnpm test:unit; pnpm test:contracts

既存コマンドの対象テストと同じharnessを使う。新規テストファイル・fixtureを追加した場合は実行結果に正確なコマンドを記録する。

## 検証結果

未実施。

## Blocked

実装開始はEpicのPreflight解消後。

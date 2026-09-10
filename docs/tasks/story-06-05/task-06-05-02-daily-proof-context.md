---
id: task-06-05-02
type: task
title: 日次上限の回路と最新context取得
story: story-06-05
status: pending
blocked_by: [task-06-05-01]
created: 2026-09-06
updated: 2026-09-06
---

# 日次上限の回路と最新context取得

## 目的

[story-06-05](../../stories/epic-06/story-06-05-user-pays-with-daily-budget.md)の正常系操作を実現する。

## 作業

spentBefore+amountと秘密dailyLimitの比較を回路に追加する。APIは同じblockを指定してcontextを取得し、Clientは1 Accountにつきreceiptまで逐次処理する。

## 完了条件

最新contextと実Proofで連続決済ができ、Proofを作るだけではAccount累積が増えない。

## 検証方法

pnpm test:circuit; pnpm generate:verifier; pnpm benchmark:circuit; pnpm test:unit

既存コマンドの対象テストと同じharnessを使う。新規テストファイル・fixtureを追加した場合は実行結果に正確なコマンドを記録する。

## 検証結果

未実施。

## Blocked

実装開始はEpicのPreflight解消後。

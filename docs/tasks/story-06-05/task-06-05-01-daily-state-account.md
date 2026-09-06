---
id: task-06-05-01
type: task
title: Accountの資産別日次累積保存
story: story-06-05
status: done
blocked_by: []
created: 2026-09-06
updated: 2026-09-06
---

# Accountの資産別日次累積保存

## 目的

[story-06-05](../../stories/epic-06/story-06-05-user-pays-with-daily-budget.md)の正常系操作を実現する。

## 作業

asset別lastDay/spentと有効累積取得を実装する。実行時のdayId/spentBeforeを公開入力に使い、外部呼出し前に累積を更新する。日次条件無効時も実支出は計上する。

## 完了条件

同日・翌日・複数資産の期待累積値が取得でき、直接実行とEntryPoint経路で一貫する。

## 検証方法

pnpm test:contracts（正常値のfuzzを含む）

既存コマンドの対象テストと同じharnessを使う。新規テストファイル・fixtureを追加した場合は実行結果に正確なコマンドを記録する。

## 検証結果

2026-09-06: 既存Account実装を確認し、追加product変更なしで正本・順序を満たすと判断。`pnpm test:contracts`成功（37 tests、既存35件と同日/翌日/複数資産の正常系・fuzz各256 runs）。Owner native0.03 + EntryPoint native0.02 + Contract0.01 = native累積0.06、2 Tokenの独立枠、翌日getter0→native0.04を確認。各送金前の期待spentBeforeを含む全15公開入力hashを照合。ログ: `/private/tmp/story05-account-tests.log`。

## Blocked

なし。

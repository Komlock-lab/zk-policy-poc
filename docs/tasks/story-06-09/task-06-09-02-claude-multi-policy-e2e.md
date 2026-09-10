---
id: task-06-09-02
type: task
title: 実Claude Codeの複合Policy決済E2E
story: story-06-09
status: pending
blocked_by: [task-06-09-01]
created: 2026-09-06
updated: 2026-09-06
---

# 実Claude Codeの複合Policy決済E2E

## 目的

[story-06-09](../../stories/epic-06/story-06-09-user-pays-with-claude-code.md)の正常系操作を実現する。

## 作業

既存e2e/claude-code-payment.test.tsのfixtureを拡張し、全条件有効の3種別を実Agentで逐次確認する。

## 完了条件

Agent transcriptのTool入力・公開結果とオンチェーンの残高・累積が一致する。

## 検証方法

pnpm exec vitest run e2e/claude-code-payment.test.ts（既存harness指定の環境で実Agent実行）

既存コマンドの対象テストと同じharnessを使う。新規テストファイル・fixtureを追加した場合は実行結果に正確なコマンドを記録する。

## 検証結果

未実施。

## Blocked

実装開始はEpicのPreflight解消後。

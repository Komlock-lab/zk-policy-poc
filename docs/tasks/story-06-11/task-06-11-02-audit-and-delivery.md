---
id: task-06-11-02
type: task
title: 設計適合確認とEpic PR
story: story-06-11
status: pending
blocked_by: [task-06-11-01]
created: 2026-09-06
updated: 2026-09-06
---

# 設計適合確認とEpic PR

## 目的

[story-06-11](../../stories/epic-06/story-06-11-developer-verifies-multi-policy.md)の正常系操作を実現する。

## 作業

ship-story/run-epicに従ってStory結果を統合し、ADR適合・実行値とProofの結合・秘密境界・累積状態をレビューする。新規攻撃テストは対象外として記録し、修正・再確認後に最終PRを作成する。

## 完了条件

各Storyがdoneで、実施範囲を明示した監査・検証結果とmain向けEpic PRが存在する。mainへはmergeしない。

## 検証方法

node scripts/validate-planning.mjs; node --test scripts/validate-planning.test.mjs; git diff --check

既存コマンドの対象テストと同じharnessを使う。新規テストファイル・fixtureを追加した場合は実行結果に正確なコマンドを記録する。

## 検証結果

未実施。

## Blocked

実装開始はEpicのPreflight解消後。

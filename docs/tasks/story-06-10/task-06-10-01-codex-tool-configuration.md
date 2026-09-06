---
id: task-06-10-01
type: task
title: Codexの3決済Tool設定
story: story-06-10
status: pending
blocked_by: []
created: 2026-09-06
updated: 2026-09-06
---

# Codexの3決済Tool設定

## 目的

[story-06-10](../../stories/epic-06/story-06-10-user-pays-with-codex.md)の正常系操作を実現する。

## 作業

既存のenabled_toolsとTool単位approval_modeを3 Toolへ拡張する。現在の.codex/config.tomlとcodex-config.test.tsにはユーザー変更があるため、分離した作業場所で差分の意図を保って統合する。

## 完了条件

MCP接続と3 Tool schemaが実Codexから利用でき、既存の秘密隔離を維持する。

## 検証方法

pnpm test:unit

既存コマンドの対象テストと同じharnessを使う。新規テストファイル・fixtureを追加した場合は実行結果に正確なコマンドを記録する。

## 検証結果

未実施。

## Blocked

実装開始はEpicのPreflight解消後。

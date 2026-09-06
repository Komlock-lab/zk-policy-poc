---
id: task-06-11-01
type: task
title: 統合quality gateと実測
story: story-06-11
status: pending
blocked_by: []
created: 2026-09-06
updated: 2026-09-06
---

# 統合quality gateと実測

## 目的

[story-06-11](../../stories/epic-06/story-06-11-developer-verifies-multi-policy.md)の正常系操作を実現する。

## 作業

build/typecheck、回路、Contract unit・正常値fuzz、API/Client/MCP unit、local E2E、実両Agentの実行結果を集める。各ACに証跡を対応させる。

## 完了条件

未実行・skipを成功に数えず、全正常系ACの観測結果と最終回路サイズ・Proof時間が揃う。

## 検証方法

pnpm build; pnpm test:circuit; pnpm test:contracts; pnpm test:unit; pnpm test:e2e; pnpm benchmark:circuit; 実Agent E2E

既存コマンドの対象テストと同じharnessを使う。新規テストファイル・fixtureを追加した場合は実行結果に正確なコマンドを記録する。

## 検証結果

未実施。

## Blocked

実装開始はEpicのPreflight解消後。

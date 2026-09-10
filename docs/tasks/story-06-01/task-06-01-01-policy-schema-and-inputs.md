---
id: task-06-01-01
type: task
title: 複合Policyと公開入力の共通定義
story: story-06-01
status: pending
blocked_by: []
created: 2026-09-06
updated: 2026-09-06
---

# 複合Policyと公開入力の共通定義

## 目的

[story-06-01](../../stories/epic-06/story-06-01-owner-registers-expiring-policy.md)の正常系操作を実現する。

## 作業

packages/policyでschemaVersion 2、固定長配列・有効長・条件フラグの正規化、Commitment順序、15公開入力の変換を実装する。native上限だけを与える既存入力をv2へ正規化する。

## 完了条件

TypeScriptとNoirに渡す既知の入力が同じCommitment・公開入力配列になる。

## 検証方法

pnpm test:unit; pnpm typecheck

既存コマンドの対象テストと同じharnessを使う。新規テストファイル・fixtureを追加した場合は実行結果に正確なコマンドを記録する。

## 検証結果

未実施。

## Blocked

実装開始はEpicのPreflight解消後。

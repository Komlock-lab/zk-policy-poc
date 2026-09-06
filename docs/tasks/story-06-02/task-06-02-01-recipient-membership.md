---
id: task-06-02-01
type: task
title: recipient allowlistの回路制約
story: story-06-02
status: pending
blocked_by: []
created: 2026-09-06
updated: 2026-09-06
---

# recipient allowlistの回路制約

## 目的

[story-06-02](../../stories/epic-06/story-06-02-owner-updates-recipient-allowlist.md)の正常系操作を実現する。

## 作業

private固定長recipient配列の有効部分への所属を実recipient公開入力で拘束する。フラグfalseの既存native経路を維持する。

## 完了条件

許可recipientを使用した実Proofが生成・検証できる。

## 検証方法

pnpm test:circuit; pnpm generate:verifier; pnpm benchmark:circuit

既存コマンドの対象テストと同じharnessを使う。新規テストファイル・fixtureを追加した場合は実行結果に正確なコマンドを記録する。

## 検証結果

未実施。

## Blocked

実装開始はEpicのPreflight解消後。

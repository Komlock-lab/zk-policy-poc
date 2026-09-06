---
id: task-06-01-03
type: task
title: Account・Policy API・CLIの期限付き決済
story: story-06-01
status: pending
blocked_by: [task-06-01-02]
created: 2026-09-06
updated: 2026-09-06
---

# Account・Policy API・CLIの期限付き決済

## 目的

[story-06-01](../../stories/epic-06/story-06-01-owner-registers-expiring-policy.md)の正常系操作を実現する。

## 作業

Accountの実行引数と時刻確認、APIの暗号化payload・登録・activation・Proof response、直接実行とUserOperation Client、既存MCP adapterのnative経路をv2へ更新する。fixtureは新規DBとAccountを使う。

## 完了条件

登録からnative決済まで直接実行・Bundler両経路が成功し、旧native操作の呼出し意図を維持する。

## 検証方法

pnpm build; pnpm test:contracts; pnpm test:unit; pnpm test:e2e

既存コマンドの対象テストと同じharnessを使う。新規テストファイル・fixtureを追加した場合は実行結果に正確なコマンドを記録する。

## 検証結果

未実施。

## Blocked

実装開始はEpicのPreflight解消後。

---
id: task-06-02-02
type: task
title: allowlistのOwner更新と決済E2E
story: story-06-02
status: pending
blocked_by: [task-06-02-01]
created: 2026-09-06
updated: 2026-09-06
---

# allowlistのOwner更新と決済E2E

## 目的

[story-06-02](../../stories/epic-06/story-06-02-owner-updates-recipient-allowlist.md)の正常系操作を実現する。

## 作業

Owner CLIとAPIでrecipientAllowlistと有効化フラグを作成・更新できるようにし、AからA/Bへ更新する正常系を実Proofで確認する。

## 完了条件

更新後versionでBへの残高増加とオンチェーンCommitment一致が観測できる。

## 検証方法

pnpm test:unit; pnpm test:e2e

既存コマンドの対象テストと同じharnessを使う。新規テストファイル・fixtureを追加した場合は実行結果に正確なコマンドを記録する。

## 検証結果

未実施。

## Blocked

実装開始はEpicのPreflight解消後。

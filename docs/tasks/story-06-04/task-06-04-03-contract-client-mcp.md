---
id: task-06-04-03
type: task
title: Contract決済のAPI・Client・MCP接続
story: story-06-04
status: pending
blocked_by: [task-06-04-02]
created: 2026-09-06
updated: 2026-09-06
---

# Contract決済のAPI・Client・MCP接続

## 目的

[story-06-04](../../stories/epic-06/story-06-04-user-pays-allowed-contract.md)の正常系操作を実現する。

## 作業

pay_contract、判別union、Proof API、UserOperation encoderとCLIを接続し、Bundler経由の正常系を追加する。

## 完了条件

MCPの構造化入力から指定invoiceIdの決済が成立する。

## 検証方法

pnpm test:unit; pnpm test:e2e

既存コマンドの対象テストと同じharnessを使う。新規テストファイル・fixtureを追加した場合は実行結果に正確なコマンドを記録する。

## 検証結果

未実施。

## Blocked

実装開始はEpicのPreflight解消後。

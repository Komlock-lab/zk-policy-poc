---
id: task-06-03-03
type: task
title: ERC-20のAPI・Client・MCP接続
story: story-06-03
status: pending
blocked_by: [task-06-03-02]
created: 2026-09-06
updated: 2026-09-06
---

# ERC-20のAPI・Client・MCP接続

## 目的

[story-06-03](../../stories/epic-06/story-06-03-user-pays-allowed-erc20.md)の正常系操作を実現する。

## 作業

Proof APIの判別union、決済CLI、UserOperation encoder、pay_erc20のschemaとadapterを接続し、実Bundler送金を確認する。

## 完了条件

pay_erc20から実Proofを使ったreceiptとToken残高変化が得られる。

## 検証方法

pnpm test:unit; pnpm test:e2e

既存コマンドの対象テストと同じharnessを使う。新規テストファイル・fixtureを追加した場合は実行結果に正確なコマンドを記録する。

## 検証結果

未実施。

## Blocked

実装開始はEpicのPreflight解消後。

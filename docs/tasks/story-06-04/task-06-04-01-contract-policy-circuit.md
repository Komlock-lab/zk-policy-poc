---
id: task-06-04-01
type: task
title: Contract allowlistと請求IDの拘束
story: story-06-04
status: pending
blocked_by: []
created: 2026-09-06
updated: 2026-09-06
---

# Contract allowlistと請求IDの拘束

## 目的

[story-06-04](../../stories/epic-06/story-06-04-user-pays-allowed-contract.md)の正常系操作を実現する。

## 作業

kind=2、target、recipient、invoiceIdの2つのu128表現を回路に結び付ける。recipientとContractの両allowlistを適用する。

## 完了条件

許可ContractとinvoiceIdで作った実Proofが同じ決済内容で検証できる。

## 検証方法

pnpm test:circuit; pnpm generate:verifier; pnpm benchmark:circuit

既存コマンドの対象テストと同じharnessを使う。新規テストファイル・fixtureを追加した場合は実行結果に正確なコマンドを記録する。

## 検証結果

未実施。

## Blocked

実装開始はEpicのPreflight解消後。

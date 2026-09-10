---
id: task-06-03-01
type: task
title: assetルール選択とToken入力の拘束
story: story-06-03
status: pending
blocked_by: []
created: 2026-09-06
updated: 2026-09-06
---

# assetルール選択とToken入力の拘束

## 目的

[story-06-03](../../stories/epic-06/story-06-03-user-pays-allowed-erc20.md)の正常系操作を実現する。

## 作業

assetRulesの有効部分から実Token addressに対応する1回上限を選択する回路・Proverを実装する。nativeはzero address、金額はToken最小単位とする。

## 完了条件

nativeとERC-20で別の上限を使用した実Proofが検証できる。

## 検証方法

pnpm test:circuit; pnpm generate:verifier; pnpm benchmark:circuit

既存コマンドの対象テストと同じharnessを使う。新規テストファイル・fixtureを追加した場合は実行結果に正確なコマンドを記録する。

## 検証結果

未実施。

## Blocked

実装開始はEpicのPreflight解消後。

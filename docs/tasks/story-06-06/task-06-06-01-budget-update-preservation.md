---
id: task-06-06-01
type: task
title: Policy更新と支出状態の独立性を実装・確認
story: story-06-06
status: done
blocked_by: []
created: 2026-09-06
updated: 2026-09-06
---

# Policy更新と支出状態の独立性を実装・確認

## 目的

[story-06-06](../../stories/epic-06/story-06-06-owner-updates-daily-budget.md)の正常系操作を実現する。

## 作業

Owner CLIとAPIのasset別dailyLimit更新を仕上げ、Commitment更新がlastDay/spentを初期化しないことを確認する。履歴はPolicy versionでなくAccountとassetに紐付ける。

## 完了条件

新versionのProofが更新前累積を使い、支払い後に合算される。

## 検証方法

pnpm test:unit; pnpm test:contracts

既存コマンドの対象テストと同じharnessを使う。新規テストファイル・fixtureを追加した場合は実行結果に正確なコマンドを記録する。

## 検証結果

- 既存Owner CLI JSON入力→署名付きAPI更新→receipt→activateがasset別dailyLimitを保持することを確認。AccountのCommitment更新はdailySpend mappingへ触れず、Policy versionではなくAccount/assetに支出を保持するためproduct変更不要。
- `pnpm test:unit`: 103件成功。CLIの資産別dailyLimit読取を追加。初回は読取段階も正規化済みとしたテスト期待順序が誤っていたため、実装境界に合わせ修正後成功。
- `pnpm test:contracts`: 39件成功。native0.05/Token10→Commitment更新→native0.02/Token20で累積0.07/30、残高を照合。更新を挟む正常fuzz256 runsも成功。

## Blocked

なし。

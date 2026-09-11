---
id: task-06-05-03
type: task
title: 同日連続・日跨ぎ・資産別決済E2E
story: story-06-05
status: done
blocked_by: [task-06-05-02]
created: 2026-09-06
updated: 2026-09-06
---

# 同日連続・日跨ぎ・資産別決済E2E

## 目的

[story-06-05](../../stories/epic-06/story-06-05-user-pays-with-daily-budget.md)の正常系操作を実現する。

## 作業

Anvil時刻制御と実Bundlerを使い、ACの各支払い・残高・累積を確認する。gasとprefundを累積に含めないことを観測する。

## 完了条件

各ACの累積額がreceipt後のAccount getterと一致する。

## 検証方法

pnpm test:e2e

既存コマンドの対象テストと同じharnessを使う。新規テストファイル・fixtureを追加した場合は実行結果に正確なコマンドを記録する。

## 検証結果

- `NODE_OPTIONS=--experimental-sqlite pnpm exec vitest run e2e/daily-payment.test.ts`: 1件成功。全条件有効Policyで実Alto経由のnative 0.03+0.02、Contract 0.01、Token 10+20をreceipt待機して逐次実行。native累積0.06 ETHとToken累積30、受取残高、Account残高を照合。
- Anvilの次blockを翌UTC日へ進め、各assetのgetterが0になり、native 0.04 ETHのreceipt後に新日累積0.04、Tokenの有効累積0と残高維持を確認。
- Proof生成だけでは累積不変、AccountのETH減少は支払額より大きいがgetterは支払額だけとなりgas/prefund非計上を観測。
- `pnpm test`: build/typecheck、回路11、Contract37、単体102、E2E26成功。実Agent固有5件は既定設定でskipし成功扱いしない。

## Blocked

なし。

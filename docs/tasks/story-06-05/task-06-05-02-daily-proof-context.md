---
id: task-06-05-02
type: task
title: 日次上限の回路と最新context取得
story: story-06-05
status: done
blocked_by: [task-06-05-01]
created: 2026-09-06
updated: 2026-09-06
---

# 日次上限の回路と最新context取得

## 目的

[story-06-05](../../stories/epic-06/story-06-05-user-pays-with-daily-budget.md)の正常系操作を実現する。

## 作業

spentBefore+amountと秘密dailyLimitの比較を回路に追加する。APIは同じblockを指定してcontextを取得し、Clientは1 Accountにつきreceiptまで逐次処理する。

## 完了条件

最新contextと実Proofで連続決済ができ、Proofを作るだけではAccount累積が増えない。

## 検証方法

pnpm test:circuit; pnpm generate:verifier; pnpm benchmark:circuit; pnpm test:unit

既存コマンドの対象テストと同じharnessを使う。新規テストファイル・fixtureを追加した場合は実行結果に正確なコマンドを記録する。

## 検証結果

- `pnpm test:circuit`: 11件成功。選択assetの1回上限と日次上限をANDで拘束し、上限ちょうどのnative/Tokenを検証。
- `pnpm generate:verifier` と `pnpm benchmark:circuit`: 成功。daily有効の実Proofは8,000 bytes、生成937 ms。
- `pnpm test:unit`: 102件成功。正規化後の資産別dailyLimitとCommitment列を確認。
- `NODE_OPTIONS=--experimental-sqlite pnpm exec vitest run e2e/daily-payment.test.ts`: 1件成功。実Alto receipt後の0.03累積を次のProof公開入力に使用し、Proof生成のみでは累積不変、その後0.02支払いで0.05。
- 既存APIの同一block指定context取得とClientのreceipt待機を再確認し、変更不要と判断。

## Blocked

なし。

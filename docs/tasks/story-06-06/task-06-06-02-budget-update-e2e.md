---
id: task-06-06-02
type: task
title: 更新・asset再登録後の累積引継ぎE2E
story: story-06-06
status: done
blocked_by: [task-06-06-01]
created: 2026-09-06
updated: 2026-09-06
---

# 更新・asset再登録後の累積引継ぎE2E

## 目的

[story-06-06](../../stories/epic-06/story-06-06-owner-updates-daily-budget.md)の正常系操作を実現する。

## 作業

実APIで更新・active化し、nativeとERC-20の再登録を含む正常系を確認する。

## 完了条件

ACの累積引継ぎとrecipient残高を実Proofで確認できる。

## 検証方法

pnpm test:e2e

既存コマンドの対象テストと同じharnessを使う。新規テストファイル・fixtureを追加した場合は実行結果に正確なコマンドを記録する。

## 検証結果

- `NODE_OPTIONS=--experimental-sqlite pnpm exec vitest run e2e/daily-policy-update.test.ts`: 1件成功。実Owner CLIからAPIを5回更新・active化し、全versionと旧versionのsuperseded、オンチェーンCommitment一致を確認。
- native0.05 ETH→日次上限0.1から0.2へ更新v2→実ProofのspentBefore0.05→0.02支払いで0.07 ETH。
- native除外v3→再登録v4→0.01支払いで0.08 ETH、Token除外v5→再登録v6→20追加で累積30。Altoのreceipt後に累積・受取残高・TokenAccount残高を確認。
- 初回個別E2Eは新worktreeでNoir artifact未生成のため失敗。`pnpm build:circuit`で生成後に成功。製品コードの回避変更なし。

## Blocked

なし。

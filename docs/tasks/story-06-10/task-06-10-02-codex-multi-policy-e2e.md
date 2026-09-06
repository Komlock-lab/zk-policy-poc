---
id: task-06-10-02
type: task
title: 実Codexの複合Policy決済E2E
story: story-06-10
status: done
blocked_by: [task-06-10-01]
created: 2026-09-06
updated: 2026-09-06
---

# 実Codexの複合Policy決済E2E

## 目的

[story-06-10](../../stories/epic-06/story-06-10-user-pays-with-codex.md)の正常系操作を実現する。

## 作業

既存e2e/codex-payment.test.tsのfixtureを拡張し、全条件有効の3種別を実Agentで逐次確認する。

## 完了条件

Agent transcriptのTool入力・公開結果とオンチェーンの残高・累積が一致する。

## 検証方法

pnpm exec vitest run e2e/codex-payment.test.ts（既存harness指定の環境で実Agent実行）

既存コマンドの対象テストと同じharnessを使う。新規テストファイル・fixtureを追加した場合は実行結果に正確なコマンドを記録する。

## 検証結果

`RUN_CODEX_E2E=1 NODE_OPTIONS=--experimental-sqlite pnpm exec vitest run e2e/codex-payment.test.ts`成功（5 tests、skipなし、189.58秒）。既存4件を維持し、正常系1件を追加。Codex CLI 0.153.2、非fork Anvil chain ID 31337、実Alto、実Proofを使用。

全flags有効Policyの下で自然言語によるnative 0.01 ETH→ERC-20最小単位25→Contract 0.02 ETHを各receipt後に逐次実行。Tool入力と公開結果から取得したtransactionHashの成功receipt、recipient/Token/Contract残高、invoiceイベント、native共有累積+0.03 ETH・Token累積+25・nonce+3を確認。transcriptにOwner Key、Policy API Token、Policy秘密field、Proof、追加承認要求がないことを確認。

ログ: `/private/tmp/story-06-10-codex-e2e.log`。既存のPhase 4異常系は回帰として実行し、Phase 6の新規異常系は追加していない。

## Blocked

なし。

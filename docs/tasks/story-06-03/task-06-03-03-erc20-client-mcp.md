---
id: task-06-03-03
type: task
title: ERC-20のAPI・Client・MCP接続
story: story-06-03
status: done
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

2026-09-06: `pnpm test:unit`成功（99 tests）。`pnpm test`全体成功: build/Verifier再生成/typecheck、Circuit 7、Contract 32、unit 99、E2E 24。新規`e2e/erc20-payment.test.ts`は`NODE_OPTIONS=--experimental-sqlite pnpm exec vitest run e2e/erc20-payment.test.ts`でも成功。

実ERC-20 fixtureに対し直接実行10、実CLI `pay-erc20.ts`/Alto経由20、実stdio MCP `pay_erc20`/Alto経由30最小単位を送金し、各receipt・ERC20PaymentExecuted・Account残高1000→990→970→940・recipient残高0→10→30→60を確認。同じPolicy内のnative上限1でnative 1 weiの実Proof決済も成功。`policy:pay-erc20`コマンドを追加し、MCPからは公開receiptだけを返す。

通常E2Eで実Agent 5件はskipされ成功に含めない。Agent固有のTool許可設定はStory06-09/10で更新するため据え置き。`git diff --check`、`node scripts/validate-planning.mjs`成功。ログ: `/private/tmp/story03-full-test.log`、`/private/tmp/story03-erc20-e2e.log`。

## Blocked

なし。

---
id: task-06-04-03
type: task
title: Contract決済のAPI・Client・MCP接続
story: story-06-04
status: done
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

2026-09-06: `pnpm test:unit`成功（101 tests）。新規`e2e/contract-payment.test.ts`を`NODE_OPTIONS=--experimental-sqlite pnpm exec vitest run e2e/contract-payment.test.ts`で実行して成功。直接0.01 ETH、実CLI/Alto 0.02 ETH、実stdio MCP pay_contract/Alto 0.03 ETHを異なるinvoiceIdで決済し、receiver残高0→0.01→0.03→0.06 ETHと各InvoicePaid・ContractPaymentExecuted・successful receiptを確認。上下128bitが異なるinvoiceと全FFの32-byte invoiceも実証。

最終`pnpm test`成功: build/Verifier再生成/typecheck、Circuit 9、Contract 35、unit 101、E2E 25。native/ERC-20の既存経路も維持。通常E2Eで実Agent 5件はskipされ成功に含めない。Agent固有allow設定はStory06-09/10まで据え置き。`git diff --check`、`node scripts/validate-planning.mjs`成功。ログ: `/private/tmp/story04-full-test.log`、`/private/tmp/story04-contract-e2e.log`。

## Blocked

なし。

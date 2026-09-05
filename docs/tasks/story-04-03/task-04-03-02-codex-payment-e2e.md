---
id: task-04-03-02
type: task
title: Codex自然言語決済E2E
story: story-04-03
status: done
blocked_by: [task-04-03-01]
created: 2026-09-05
updated: 2026-09-05
---

# Codex自然言語決済E2E

## 目的

実Codexが自然言語からPolicy決済を自律実行できることを確認する。

## 作業

- local stackと0.1 ETH Policyを準備する。
- 0.01 ETH、1 ETH、不正recipientの自然言語scenarioを実行する。
- Tool承認待ちがないこと、receipt、nonce、残高、transcriptを記録する。
- transcriptとServer logへ秘密がないことをcanaryで確認する。

## 完了条件

- 正常系だけが送金され、異常系は副作用なしで拒否され、秘密が露出しない。

## 検証方法

- Codex CLI 0.153.2 E2E harness
- Anvil receipt、nonce、残高照合

## 検証結果

- `RUN_CODEX_E2E=1 NODE_OPTIONS=--experimental-sqlite pnpm vitest run e2e/codex-payment.test.ts --reporter=verbose`: 実Codex CLI 0.153.2の3 tests passed（74.34秒）。
- 0.01 ETHはreceipt成功、recipient残高`+0.01 ETH`、EntryPoint nonce`+1`。1 ETHは`PAYMENT_REJECTED`、不正recipientはMCP schema拒否となり、両異常系で残高とnonceは不変だった。
- 全Codex JSONL transcriptとstderrにOwner Key、Policy Token、Proof field、approval request eventがないことをcanary照合した。

## Blocked

なし。

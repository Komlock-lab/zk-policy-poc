---
id: task-04-02-02
type: task
title: Claude Code自然言語決済E2E
story: story-04-02
status: done
blocked_by: [task-04-02-01]
created: 2026-09-05
updated: 2026-09-05
---

# Claude Code自然言語決済E2E

## 目的

実Claude Codeが自然言語からPolicy決済を自律実行できることを確認する。

## 作業

- local stackと0.1 ETH Policyを準備する。
- 0.01 ETH、1 ETH、不正recipientの自然言語scenarioを実行する。
- Tool承認待ちがないこと、receipt、nonce、残高、transcriptを記録する。
- transcriptとServer logへ秘密がないことをcanaryで確認する。

## 完了条件

- 正常系だけが送金され、異常系は副作用なしで拒否され、秘密が露出しない。

## 検証方法

- Claude Code 2.1.260 E2E harness
- Anvil receipt、nonce、残高照合

## 検証結果

- `RUN_CLAUDE_CODE_E2E=1 NODE_OPTIONS=--experimental-sqlite pnpm vitest run e2e/claude-code-payment.test.ts`: 最新Epic統合後に1 file / 1 test passed（Claude Code 2.1.260、16.10秒）。
- `--permission-mode dontAsk --permission-prompts none`かつproject allow ruleで実行し、承認promptなしにClaude Codeが自然言語から`pay_native`を3回選択した。入力は順に0.01 ETH、1 ETH、不正recipient `not-an-address`と一致した。
- 0.01 ETHだけがreceipt `success`となり、recipient残高は0.01 ETH増加、EntryPoint nonceは1増加した。上限超過と不正recipient後には追加の残高・nonce変化がなかった。
- stream-json transcriptを検査し、Owner Key、Policy Token、Proof fieldが含まれないことを確認した。
- `pnpm test:unit`: 最新Epic統合後に18 files / 90 tests passed。

## Blocked

なし。

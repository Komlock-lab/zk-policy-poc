---
id: task-04-02-02
type: task
title: Claude Code自然言語決済E2E
story: story-04-02
status: pending
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

未実施。

## Blocked

なし。

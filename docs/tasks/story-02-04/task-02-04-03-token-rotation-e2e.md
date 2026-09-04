---
id: task-02-04-03
type: task
title: Token切り替えE2E
story: story-02-04
status: done
blocked_by: [task-02-04-02]
created: 2026-09-04
updated: 2026-09-04
---

# Token切り替えE2E

## 目的

Token再発行後の新旧Tokenの権限切り替えをProof APIで検証する。

## 作業

- 再発行後に新TokenでProof取得が成功することを確認する。
- 旧Token、不正署名、nonce replayが拒否されることを確認する。

## 完了条件

- Story 02-04の全受け入れ条件が自動testへ対応する。

## 検証方法

- Story 02-04 E2E command

## 検証結果

- `PATH="..." NODE_OPTIONS=--experimental-sqlite pnpm exec vitest run e2e/policy-token-rotation.test.ts`: 2 tests成功。
- 非fork Anvil chain ID 31337で、不正Owner署名とreplayがnonce/hash不変で拒否され、旧Token 2世代が401、新Tokenで実Proof生成が成功することを確認した。
- 初回Tokenを利用せず、Account contextだけからpending PolicyのTokenをCLI再発行し、その新Tokenでオンチェーンactive化できることを確認した。

## Blocked

なし。

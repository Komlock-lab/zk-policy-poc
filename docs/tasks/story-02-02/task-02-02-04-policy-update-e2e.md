---
id: task-02-02-04
type: task
title: Policy更新E2E
story: story-02-02
status: done
blocked_by: [task-02-02-03]
created: 2026-09-04
updated: 2026-09-04
---

# Policy更新E2E

## 目的

Policy version更新と拒否条件をlocal stack全体で検証する。

## 作業

- version 1から2への更新と旧version superseded化を検証する。
- pending置換、Unauthorized Tx、未確定・不一致Tx、nonce replayを検証する。

## 完了条件

- Story 02-02の全受け入れ条件が自動testへ対応する。

## 検証方法

- Story 02-02 E2E command

## 検証結果

固定toolchainで`pnpm test`が成功。非fork Anvil chain ID 31337上のPolicy更新E2E 1件で、v1→v2、pending置換、Unauthorized、未確定Tx、不一致Tx、nonce replay、最終active化を確認した。全体ではCircuit 4件、Contract 15件、Unit 34件、E2E 4件が成功した。

## Blocked

なし。

---
id: task-03-02-01
type: task
title: ローカルAlto harness
story: story-03-02
status: pending
blocked_by: []
created: 2026-09-05
updated: 2026-09-05
---

# ローカルAlto harness

## 目的

非fork Anvil、EntryPoint v0.8、Altoをtestから再現可能に起動・停止できるようにする。

## 作業

- Altoを`0.0.21`へ固定する。
- 既存Anvil harnessを再利用し、EntryPoint deploymentとAlto process lifecycleを追加する。
- RPC、Bundler bind、chain ID、executor key、EntryPointをローカルtest用に固定する。
- readinessを`eth_chainId`と`eth_supportedEntryPoints`で確認し、失敗時もchild processを停止する。

## 完了条件

- testがAnvilとAltoを起動し、対応EntryPointを確認して確実に停止できる。

## 検証方法

- Local Alto harness integration test

## 検証結果

未実施。

## Blocked

なし。

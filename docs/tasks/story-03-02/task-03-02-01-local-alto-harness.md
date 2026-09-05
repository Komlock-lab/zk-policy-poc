---
id: task-03-02-01
type: task
title: ローカルAlto harness
story: story-03-02
status: done
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

`pnpm exec vitest run e2e/bundler-payment.test.ts`: 10件成功。非fork AnvilとAlto 0.0.21の起動、chain ID 31337、supported EntryPoint、終了処理を実行した。

- pnpm patchで127.0.0.1 bind、明示的なローカルv0.8 address対応、top-level trace出力、同梱simulation ABIのRETURN decodeを補正した。
- safe-modeはtrueのまま。禁止TIMESTAMP opcodeと不正署名を実Bundlerが拒否することを確認した。
- Altoへ継承する環境はPATHとローカルEntryPointのみ。process出力は保存・転送しない。

## Blocked

なし。

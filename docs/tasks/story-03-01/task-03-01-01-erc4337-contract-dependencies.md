---
id: task-03-01-01
type: task
title: ERC-4337 Contract依存とFoundry設定
story: story-03-01
status: done
blocked_by: []
created: 2026-09-05
updated: 2026-09-05
---

# ERC-4337 Contract依存とFoundry設定

## 目的

ERC-4337 v0.8 interfaceとEntryPoint artifactを既存Contract buildとtestから再現可能に利用できるようにする。

## 作業

- `@account-abstraction/contracts`を`0.8.0`へ固定する。
- 必要なOpenZeppelin dependencyを固定し、Foundryからroot `node_modules`を解決できるようにする。
- EntryPoint v0.8のABI、bytecode、interfaceをContract testとローカルdeploymentから参照できるようにする。
- Solidity `0.8.30`と既存生成Verifierのbuildを維持する。

## 完了条件

- 既存ContractとEntryPoint v0.8 dependencyが同じ`forge build`で成功する。

## 検証方法

- `pnpm install --frozen-lockfile`
- `pnpm build:contracts`
- `pnpm typecheck`

## 検証結果

- `pnpm test` 成功: build/typecheck、Circuit 4件、Contract 28件（fuzz・実EntryPoint統合を含む）、unit 68件、E2E 8件。
- 既存Phase 2のPolicy登録・更新・Token再発行・Proof取得・直接決済が成功。

## Blocked

なし。

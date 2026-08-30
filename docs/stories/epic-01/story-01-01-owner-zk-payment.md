---
id: story-01-01
type: story
title: Ownerが秘密の支出上限内でnative tokenを送金する
epic: epic-01
status: done
depends_on: []
adrs: [adr-0001, adr-0002, adr-0003]
created: 2026-08-30
updated: 2026-08-30
---

# Ownerが秘密の支出上限内でnative tokenを送金する

## ユーザーアクション

Ownerは秘密の支出上限を公開せず、上限以内のnative token送金をContract Walletから実行できる。

## 背景

ZK Policy Enforcement Layerの最小PoCとして、Proof生成からオンチェーン検証、実送金までの一連の動作をローカルで確認する必要がある。

## スコープ

### 含むもの

- 1回あたりの支出上限Circuit
- Policy CommitmentとProofのローカル生成
- Owner認証を持つContract Wallet
- Solidity Verifier
- 非forkのローカルAnvilでの送金

### 含まないもの

- Policy更新、Proof生成API、ERC-4337、MCP Server、複数Policy
- public chainでのデプロイまたは送金

## 受け入れ条件

### 正常系

- AC-1 [正常系]: Given 支出上限が0.1 ETHとしてCommitmentが登録されている / When Ownerが0.01 ETH用のProofを生成して送金する / Then Proof検証に成功し、送金先の残高が0.01 ETH増える

### 異常系

- AC-2 [異常系]: Given 支出上限が0.1 ETHとしてCommitmentが登録されている / When 1 ETHの支出を証明しようとする / Then 有効なProofを生成できず、Contract Walletから送金されない

## アーキテクチャ制約

- [epic-01](../../epics/epic-01-zk-payment.md)の不変条件を維持する。
- [adr-0001](../../adr/adr-0001-amount-and-public-inputs.md)、[adr-0002](../../adr/adr-0002-authorization-and-policy-boundary.md)、[adr-0003](../../adr/adr-0003-commitment-and-proving-system.md)に従う。
- LLM Wikiの再利用可能な資料は未登録であり、このStoryはWikiページを参照しない。

## Task

| ID | Task | Status |
| --- | --- | --- |
| [task-01-01-01](../../tasks/story-01-01/task-01-01-01-toolchain-and-workspace.md) | ツールチェーンとWorkspace | done |
| [task-01-01-02](../../tasks/story-01-01/task-01-01-02-spend-limit-circuit.md) | Spend Limit Circuit | done |
| [task-01-01-03](../../tasks/story-01-01/task-01-01-03-verifier-and-account.md) | VerifierとZK Policy Account | done |
| [task-01-01-04](../../tasks/story-01-01/task-01-01-04-policy-and-prover.md) | PolicyとProof生成 | done |
| [task-01-01-05](../../tasks/story-01-01/task-01-01-05-local-payment-and-e2e.md) | ローカル決済とE2E | done |
| [task-01-01-06](../../tasks/story-01-01/task-01-01-06-completion-and-pr.md) | 完了監査とPR | done |

## 検証結果

- AC-1: `pnpm test:e2e`と`pnpm local:payment`で0.01 ETH相当の`10000000000000000 wei`送金と残高増加を確認した。
- AC-2: `pnpm test:e2e`で1 ETHが上限超過としてProof生成前に拒否され、受取人残高が変化しないことを確認した。
- `pnpm test`: Circuit 4件、Contract 11件、TypeScript 7件、E2E 2件が成功した。
- `pnpm benchmark:circuit`: ACIR Opcodes 12、Proof 7,232 bytes、生成時間332msだった。

## Blocked

なし。

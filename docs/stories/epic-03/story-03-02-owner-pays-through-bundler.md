---
id: story-03-02
type: story
title: OwnerがBundler経由でPolicy決済する
epic: epic-03
status: approved
depends_on: [story-03-01]
adrs: [adr-0008, adr-0009]
created: 2026-09-05
updated: 2026-09-05
---

# OwnerがBundler経由でPolicy決済する

## ユーザーアクション

OwnerはPolicy APIから取得したProofを使い、秘密の支出上限内のnative token決済をUserOperationとしてローカルBundler経由で実行できる。

## 背景

ERC-4337対応Accountだけでは利用者の決済フローにならない。Proof取得、UserOperation構築、Owner署名、Bundler送信、receipt確認を一続きのClientとCLIで調停し、実際のBundler経由で結果を検証する必要がある。

## スコープ

### 含むもの

- Anvil、EntryPoint v0.8、Altoのローカルharness
- Phase 2 Proof response取得・検証の再利用
- viem `2.37.3`のcustom Smart AccountとBundler Client
- Proof付き`executeUserOp` calldata、Owner署名、gas estimate、送信、receipt確認
- `policy:pay-userop` CLI
- 正常系、上限超過、不正署名、改ざん、不一致EntryPointのE2E

### 含まないもの

- Policy API schema変更またはProof Job非同期化
- public Bundler、Paymaster、Factory、EIP-7702
- Agent向けMCPまたは自然言語interface

## 受け入れ条件

### 正常系

- AC-1 [正常系]: Given 0.1 ETHのactive Policy、正しいToken、Owner署名鍵、入金済みAccount、対応EntryPointを持つAltoがある / When Ownerが0.01 ETHのProof付きUserOperation決済を実行する / Then UserOperation receiptが成功し受取人残高が0.01 ETH増え、Owner EOAのtransaction nonceは変化しない

### 異常系

- AC-2 [異常系]: Given 0.1 ETHのactive Policyがある / When Ownerが1 ETHのUserOperation決済を開始する / Then Proof APIが拒否し、UserOperationを送信せずEntryPoint nonceと受取人残高が変化しない
- AC-3 [異常系]: Given Owner以外が署名したUserOperationがある / When ClientがAltoへ送る / Then Bundlerが署名不正として拒否し受取人残高が変化しない
- AC-4 [異常系]: Given 0.01 ETH用の正しいProofがある / When UserOperationの実送金額を0.02 ETHへ改ざんしてgas estimateする / Then simulationがProof不正として失敗し、UserOperationを送信せずEntryPoint nonceと受取人残高が変化しない
- AC-5 [異常系]: Given AccountとAltoが異なるEntryPointを設定している / When OwnerがUserOperation決済を開始する / Then Clientが送信前に拒否しEntryPoint nonceと受取人残高が変化しない
- AC-6 [異常系]: Given loopbackではないRPCまたはBundler URLがある / When OwnerがUserOperation決済を開始する / Then Clientが接続前に拒否する

## アーキテクチャ制約

- [epic-03](../../epics/epic-03-erc4337.md)の不変条件を維持する。
- [adr-0008](../../adr/adr-0008-erc4337-v08-local-stack.md)、[adr-0009](../../adr/adr-0009-owner-userop-and-zk-proof-separation.md)に従う。
- [ERC-4337](../../../llm-wiki/wiki/articles/erc-4337.md)、[ERC-7769](../../../llm-wiki/wiki/articles/erc-7769.md)をRPCと実行境界の根拠として参照する。

## Task

| ID | Task | Status |
| --- | --- | --- |
| [task-03-02-01](../../tasks/story-03-02/task-03-02-01-local-alto-harness.md) | ローカルAlto harness | pending |
| [task-03-02-02](../../tasks/story-03-02/task-03-02-02-proof-backed-userop-client.md) | Proof付きUserOperation Client | pending |
| [task-03-02-03](../../tasks/story-03-02/task-03-02-03-userop-payment-cli.md) | UserOperation決済CLI | pending |
| [task-03-02-04](../../tasks/story-03-02/task-03-02-04-bundler-payment-e2e.md) | Bundler決済E2E | pending |
| [task-03-02-05](../../tasks/story-03-02/task-03-02-05-phase-3-quality-gate.md) | Phase 3品質ゲート | pending |

## 検証結果

未実施。

## Blocked

なし。

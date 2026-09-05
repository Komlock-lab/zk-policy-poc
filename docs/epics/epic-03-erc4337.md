---
id: epic-03
type: epic
title: ERC-4337対応
status: in-progress
created: 2026-09-05
updated: 2026-09-05
adrs: [adr-0008, adr-0009]
---

# ERC-4337対応

## 背景

Phase 2ではOwner EOAがPolicy APIからProofを取得し、通常Transactionで`ZkPolicyAccount`の決済を実行した。AI Agent連携へ進む前に、Owner認証、gas負担、実行をERC-4337のUserOperation、EntryPoint、Bundlerへ移し、ZK Policy検証との責務分離を確認する必要がある。

## ゴール

Ownerがactive PolicyのProofを使って署名済みUserOperationを構築し、ローカルBundler経由で支出上限内のnative token決済を実行できる。

## スコープ

### 含むもの

- ERC-4337 v0.8 `IAccount`を実装する既存`ZkPolicyAccount`
- Owner署名によるUserOperation認証とAccountによるgas prefund
- EntryPoint専用のProof付きnative token決済
- viem `2.37.3`によるProof取得、UserOperation構築、署名、送信、receipt確認
- EntryPoint v0.8、Alto、非fork Anvil chain ID `31337`のローカル実行環境
- Phase 2のOwner直接Transaction経路の維持

### 含まないもの

- Circuit、生成Verifier、Policy API requestまたはresponse schemaの変更
- Paymaster、Factory、`initCode`、counterfactual Account deployment
- EIP-7702、batch call、任意Contract call、session key、modular Account
- UserOperationによるPolicy登録または更新
- Claude Code、Codex、MCP Server接続
- public testnet、mainnet、実資産、production deployment
- 包括的な攻撃・異常系検証

## アーキテクチャ

### コンポーネントと責務

- `ZkPolicyAccount.sol`は`IAccount`、Owner署名、EntryPoint caller、prefund、Policy Proof、実送金を検証する。
- `apps/policy-api`と`packages/prover`はPhase 2の同期Proof APIを変更せず提供する。
- `apps/policy-cli`はProof response検証を再利用し、Proof付きUserOperation ClientとCLIを提供する。
- viemはEntryPoint nonce、gas estimate、UserOperation hashと署名、ERC-7769 RPCを扱う。
- AltoはUserOperationをsimulation、受理し、EntryPointへbundle transactionを送る。
- AnvilはEntryPoint、Verifier、Account、受取人のローカル実行状態を保持する。

### データフロー

1. OwnerがPolicy ID、Token、Account、recipient、`valueWei`をClientへ渡す。
2. ClientがPhase 2 Proof APIからProofを取得し、Policy ID、実送金額、Accountの現在CommitmentとPublic Inputを照合する。
3. Clientが`executeUserOp(recipient,valueWei,proof)`のcalldataを構築し、EntryPoint nonceとBundler gas estimateを取得する。
4. Ownerがchain IDとEntryPointへ結び付いた`userOpHash`へ署名する。
5. ClientがUserOperationをAltoへ送り、Altoがsimulation後にEntryPointへbundleする。
6. EntryPointがAccountの`validateUserOp`を呼び、Accountがcaller、Owner署名、prefundを検証する。
7. EntryPointが`executeUserOp`を呼び、Accountが実送金額と現在CommitmentからPublic Inputを再構築してProofを検証する。
8. Accountがnative tokenを送り、ClientがUserOperation receiptと受取人残高を確認する。

### On-chain / Off-chain境界

- `maxAmount`、`salt`、暗号鍵、API TokenはUserOperationまたはオンチェーンへ渡さない。
- UserOperationにはrecipient、実送金額、Proof、Owner署名を含める。
- AccountはOwner、Verifier、EntryPoint、Policy設定状態、Commitmentだけを保持する。
- CircuitとProof APIはUserOperation、EntryPoint、Bundler、gas fieldを扱わない。

### 認証・権限・秘密情報

- `validateUserOp`はimmutableなEntryPointからの呼出しだけを受け付ける。
- UserOperationの実行権限はOwnerによる`userOpHash`署名で検証する。
- ZK Proofは実行権限ではなく、実送金額が秘密Policyを満たすことだけを検証する。
- Phase 2の`execute`と`updatePolicyCommitment`はOwner直接Transactionだけを許可する。
- Owner秘密鍵とPolicy秘密値をAccount、API log、Bundler logへ保存しない。

### インターフェース

- Account constructor: `owner`、`verifier`、`entryPoint`
- ERC-4337: `validateUserOp(PackedUserOperation,bytes32,uint256) returns (uint256)`
- EntryPoint getter: `entryPoint() returns (IEntryPoint)`
- UserOperation execution: `executeUserOp(address,uint256,bytes)`
- Phase 2互換: `execute(address,uint256,bytes)`、`updatePolicyCommitment(bytes32)`
- Bundler RPC: `eth_supportedEntryPoints`、`eth_estimateUserOperationGas`、`eth_sendUserOperation`、`eth_getUserOperationReceipt`
- CLI: `policy:pay-userop RECIPIENT VALUE_WEI`

### Storyをまたぐ不変条件

- UserOperation署名をchain ID、EntryPoint、Account、nonce、calldata、gas fieldへ結び付ける。
- Owner認証とZK Policy検証を別の検証として維持する。
- EntryPoint経路とOwner直接経路の両方で、実送金額と現在Commitmentから同じPublic Inputを再構築する。
- Proof取得またはresponse検証に失敗した場合はUserOperationを作成・送信しない。
- EntryPoint、Bundler、execution RPC、Policy APIはchain ID `31337`と`127.0.0.1`に限定する。
- AccountのEntryPointとBundlerが対応するEntryPointが一致しない場合は送信しない。
- Phase 2のPolicy lifecycle、Token認証、Proof freshness、直接決済を壊さない。

## Story

| ID | Story | Depends on | Status |
| --- | --- | --- | --- |
| [story-03-01](../stories/epic-03/story-03-01-developer-deploys-erc4337-account.md) | DeveloperがERC-4337対応Accountをデプロイする | なし | done |
| [story-03-02](../stories/epic-03/story-03-02-owner-pays-through-bundler.md) | OwnerがBundler経由でPolicy決済する | story-03-01 | approved |

## 依存グラフ

- Layer 0: `story-03-01`
- Layer 1: `story-03-02`

## 成功条件

- DeveloperがEntryPoint v0.8、Verifier、ERC-4337対応Account、Altoを非fork Anvil上で起動できる。
- 0.1 ETHのactive Policyと正しいTokenで0.01 ETHのUserOperation決済が成功し、受取人残高が正確に増える。
- UserOperation receiptが成功し、Owner EOAのtransaction nonceを消費しない。
- 上限超過、不正Owner署名、改ざんされた送金額またはCommitment、不一致EntryPointでは送金されない。
- Phase 2のPolicy登録・更新・Token再発行・Proof取得・Owner直接決済が回帰しない。
- Contract、TypeScript、CLI、Bundler、E2Eの全テストが成功する。

## 安全境界

- BlockchainとBundlerの実行は非forkのローカルAnvil、chain ID `31337`だけを許可する。
- API、RPC、Bundlerは`127.0.0.1`へbindし、外部interfaceへ公開しない。
- testnet、mainnet、実資産、productionへの操作は禁止する。
- 外部networkは依存関係とGitHub操作だけに使用する。

## ペンディング

なし。

## Delivery

- Epic PR: 未作成

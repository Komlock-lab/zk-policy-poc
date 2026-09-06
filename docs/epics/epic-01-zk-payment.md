---
id: epic-01
type: epic
title: 1回あたりの支出上限を使ったZK決済
status: done
created: 2026-08-30
updated: 2026-09-07
adrs: [adr-0001, adr-0002, adr-0003, adr-0016]
---

# 1回あたりの支出上限を使ったZK決済

## 背景

AIエージェントが提案した送金を実行する前に、秘密の支出上限を公開せず、実際の送金額が上限以内であることをオンチェーンで検証できる最小構成が必要である。

## ゴール

Ownerが秘密の支出上限に対するZK Proofをローカルで生成し、Contract WalletがProofを検証した場合だけnative tokenを送金できる。

## スコープ

### 含むもの

- native tokenの単一送金
- 1回あたりの秘密の支出上限
- ローカルでのProof生成
- Solidity Verifierによるオンチェーン検証
- Owner EOAから呼び出すContract Wallet
- 非forkのローカルAnvilでのE2E検証

### 含まないもの

- Proof生成APIとPolicy永続化
- ユーザーによるPolicyの作成・更新
- ERC-4337とUserOperation
- MCP Server
- 複数ポリシー
- testnetまたはmainnetでの実行
- 包括的な攻撃・異常系テスト

## アーキテクチャ

### コンポーネントと責務

- `spend-limit` Circuitは送金額、上限、salt、Commitmentの関係を拘束する。
- `policy` packageはwei金額、Field、salt、Poseidon2 Commitmentを扱う。
- `prover` packageはCircuit witnessとUltraHonk Proofを生成し、Public Inputの順序を検証する。
- `SpendLimitVerifier.sol`は生成されたProofをEVM上で検証する。
- `ZkPolicyAccount.sol`はOwner認証、Proof検証、native token送金を順番に実行する。
- local payment scriptは非forkのAnvilでデプロイ、入金、Proof生成、送金を行う。

### データフロー

1. Off-chainで`Poseidon2(maxAmount, salt)`から`policyCommitment`を生成する。
2. `value`と`policyCommitment`をPublic Input、`maxAmount`と`salt`をPrivate InputとしてProofを生成する。
3. Owner EOAが`recipient`、`value`、`proof`を指定してAccountを呼び出す。
4. Accountが実際に送金する`value`とconstructorで固定した`policyCommitment`をVerifierへ渡す。
5. Proofが有効な場合だけAccountがrecipientへnative tokenを送金する。

### On-chain / Off-chain境界

- `maxAmount`と`salt`はOff-chainだけで扱い、Contractやログへ渡さない。
- `value`と`policyCommitment`はPublic Inputとしてオンチェーンへ渡す。
- ETH表記からweiへの変換はスクリプト境界だけで行う。

### 認証・権限・秘密情報

- EOAトランザクション署名と`msg.sender == owner`で実行主体を認証する。
- ZK Proofは認証ではなく支出ポリシーの検証だけを担当する。
- Owner、Verifier、Commitmentはconstructorで固定し、Phase 1では更新しない。
- ローカル既知鍵は非forkのAnvilだけで使用し、外部RPCを受け付けない。

### インターフェース

- Circuit Public Input: `value: u128`、`policyCommitment: Field`
- Circuit Private Input: `maxAmount: u128`、`salt: Field`
- Account: `execute(address payable recipient, uint256 value, bytes proof)`
- Verifier: `verify(bytes proof, bytes32[] publicInputs) -> bool`

### Storyをまたぐ不変条件

- Proof検証に使用する金額と実際に送金する金額を一致させる。
- Contract外部入力の`uint256`はVerifierへ渡す前に`u128`範囲を検証する。
- 認証とPolicy検証を別責務として維持する。
- CircuitとProverをERC-4337固有実装へ依存させない。
- public chainを実行対象にしない。

## Story

| ID | Story | Depends on | Status |
| --- | --- | --- | --- |
| [story-01-01](../stories/epic-01/story-01-01-owner-zk-payment.md) | Ownerが秘密の支出上限内でnative tokenを送金する | なし | done |

## 依存グラフ

- Layer 0: `story-01-01`

## 成功条件

- 0.1 ETHの秘密上限に対する0.01 ETH送金で、受取人の残高が0.01 ETH増える。
- 0.1 ETHの秘密上限に対する1 ETH送金ではProofを生成できず、残高が変化しない。
- Circuit、Contract、TypeScript、E2Eの全テストが成功する。

## 安全境界

- 外部ネットワークは依存関係とGitHub操作だけに使用する。
- Blockchain実行は非forkのローカルAnvil、chain ID `31337`だけを許可する。
- testnet、mainnet、実資産、productionへの操作は禁止する。

## ペンディング

なし。

## Delivery

- Epic PR: https://github.com/Komlock-lab/zk-policy-poc/pull/2

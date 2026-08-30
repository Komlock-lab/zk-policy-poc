# Phase 1: 1回あたりの支出上限を使ったZK決済

## ゴール

秘密の支出上限に対するZK Proofをローカルで生成し、Contract WalletがProofを検証した後にnative tokenを送金できることを確認する。

## スコープ

- native tokenの単一送金
- 1回あたりの支出上限
- ローカルでのProof生成
- Solidity Verifierによるオンチェーン検証
- Owner EOAから呼び出すContract Wallet
- ローカルチェーンでのE2Eテスト

## ZK Circuit

```text
Public Inputs:
  value: u128              # 実際の送金額、wei
  policyCommitment: Field

Private Inputs:
  maxAmount: u128          # 支出上限、wei
  salt: Field

Constraints:
  value <= maxAmount
  Poseidon2(maxAmount, salt) == policyCommitment
```

Contractの外部入力はEVM標準の`uint256`とし、Verifierへ渡す前に`u128`の範囲内で
あることを検証する。ETH表記への変換はスクリプト境界だけで行い、Contract、Circuit、
Proofではweiの整数を使用する。

## Contract Wallet

`ZkPolicyAccount.sol`は、実際に送金する`value`と登録済み`policyCommitment`をPublic InputとしてSolidity Verifierへ渡す。Proofが有効な場合だけnative tokenを送金する。

Phase 1ではOwner、Verifier、`policyCommitment`をconstructorで登録して変更不可とする。
Policy更新はPhase 2で実装する。

Owner EOAの署名を認証に使用し、ZK Proofは支出ポリシーの検証にだけ使用する。

## 実装タスク

1. Noirで`spend-limit` Circuitを作成する
2. 上限以内と上限超過のCircuitテストを作成する
3. BarretenbergでProofとVerification Keyを生成する
4. Solidity Verifierを生成する
5. `ZkPolicyAccount.sol`を実装する
6. FoundryでAccountとVerifierのテストを作成する
7. TypeScriptでProof生成スクリプトを作成する
8. viemでデプロイと送金を実行するスクリプトを作成する
9. Proof生成から送金までのE2Eテストを作成する

## 受け入れ条件

- AC-1 [正常系]: Given 支出上限が0.1 ETHとしてCommitmentが登録されている / When Ownerが0.01 ETH用のProofを生成して送金する / Then Proof検証に成功し、送金先の残高が0.01 ETH増える
- AC-2 [異常系]: Given 支出上限が0.1 ETHとしてCommitmentが登録されている / When 1 ETHの支出を証明しようとする / Then 有効なProofを生成できず、Contract Walletから送金されない

## 対象外

- Proof生成API
- ユーザーによるPolicyの作成・更新
- ERC-4337
- MCP Server
- 複数ポリシー
- 包括的な攻撃・異常系テスト

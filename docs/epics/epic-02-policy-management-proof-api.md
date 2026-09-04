---
id: epic-02
type: epic
title: Policy管理・Proof生成API
status: review
created: 2026-09-04
updated: 2026-09-04
adrs: [adr-0004, adr-0005, adr-0006, adr-0007]
---

# Policy管理・Proof生成API

## 背景

Phase 1では秘密の支出上限、salt、Proofをローカルスクリプトが直接扱っていた。OwnerがPolicyを安全に更新し、秘密値をAIや決済Clientへ渡さずにProofを取得できるOff-chain境界が必要である。

## ゴール

Ownerが1回あたりの支出上限PolicyをCLIから登録・更新でき、認証済みClientがactive PolicyのProofをAPIから取得してローカルAccount決済を実行できる。

## スコープ

### 含むもの

- 1 Accountにつき1つの支出上限Policyとversion履歴
- OwnerのEIP-712署名によるPolicy更新認可
- Account単位のAPI nonceとdeadline
- SQLiteへの暗号化Policy保存
- Policy単位のProof API Token
- OwnerによるオンチェーンCommitment登録・更新
- 同期Proof生成API
- 非forkのローカルAnvilでのAPI経由決済

### 含まないもの

- Circuitまたは生成Verifierの変更
- ERC-4337、UserOperation、Bundler
- Claude Code、Codex、MCP Server接続
- 複数ルールまたは複数Policy
- 公開testnet、mainnet、任意RPC、production deployment
- KMS、鍵rotation、backup、水平分散、PostgreSQL
- 包括的なrate limit、攻撃・異常系検証

## アーキテクチャ

### コンポーネントと責務

- `apps/policy-cli`はPolicy生成、EIP-712署名、Account更新Tx、APIへの確定通知、Token再発行を行う。
- `apps/policy-api`はFastify HTTP境界、署名・Token認証、状態遷移、暗号化、永続化、オンチェーン確認、Proof生成を調停する。
- `packages/policy`はwei金額、salt、Poseidon2 Commitmentを扱う。
- `packages/prover`は既存Circuitから同期的にUltraHonk Proofを生成する。
- `ZkPolicyAccount.sol`はOwnerだけにCommitment登録・更新を許可し、未設定Policyでの送金を拒否する。
- SQLiteはPolicy version、API nonce、暗号化秘密値、Token hashを保持する。

### データフロー

1. CLIが`maxAmount`、`salt`、`policyCommitment`を生成し、APIから取得したPolicy IDとnonceを含む`PolicyUpdate`へOwnerが署名する。
2. APIがAccount Owner、nonce、deadline、Commitmentを検証し、新versionを`pending`で暗号化保存する。
3. OwnerがAPIのcalldataを使ってAccountのCommitmentを更新する。
4. CLIがtx hashをAPIへ送り、APIがreceipt、送信者、Account、Commitment、現在のオンチェーン値を検証して新versionを`active`にする。
5. ClientがPolicy ID、`valueWei`、Bearer TokenでProofを要求する。
6. APIがactive状態とオンチェーンCommitmentを確認し、秘密値を復号してProofとPublic Inputを返す。
7. OwnerがProofをAccountへ渡し、Accountが実際の送金額と登録済みCommitmentを再構築して検証後に送金する。

### On-chain / Off-chain境界

- `maxAmount`、`salt`、暗号鍵、平文Tokenはオンチェーンへ渡さない。
- Accountには`policyCommitment`と設定状態だけを保持する。
- オンチェーンCommitmentをactive状態の正本とし、不一致時はProofを生成しない。
- CircuitのPublic InputとPrivate InputはPhase 1から変更しない。

### 認証・権限・秘密情報

- Policy更新とToken再発行はOwnerのEIP-712署名で認可する。
- EIP-712認可にはAccount単位の単調増加nonceとdeadlineを使用する。
- Proof APIはPolicy単位の高entropy Bearer Tokenを要求し、DBにはSHA-256 hashだけを保存する。
- `maxAmount`と`salt`はAES-256-GCMで暗号化し、`policyId`と`version`をAADにする。
- 32-byte暗号鍵はbase64環境変数から取得し、Owner秘密鍵とともにAPIへ保存しない。

### インターフェース

- EIP-712 Domain: `ZkPolicy`、version `1`、chain ID `31337`、`verifyingContract = account`
- `PolicyUpdate`: `string policyId`、`address account`、`bytes32 policyCommitment`、`uint256 nonce`、`uint64 deadline`
- `PolicyAccessTokenRotation`: `string policyId`、`address account`、`uint256 nonce`、`uint64 deadline`
- `GET /v1/accounts/:account/policy-context`: API生成UUIDまたは既存Policy IDと現在nonceを返す。
- `PUT /v1/policies/:policyId`: 秘密値、Commitment、deadline、nonce、Owner署名からpending versionを作る。
- `POST /v1/policies/:policyId/activate`: Bearer Tokenとtx hashからオンチェーン反映を確定する。
- `POST /v1/policies/:policyId/proofs`: Bearer Tokenと`valueWei`から同期的にProofを生成する。
- `POST /v1/policies/:policyId/token`: Owner署名でTokenを再発行する。
- Proof request: `policyId`、decimal stringの`valueWei`、Bearer Token
- Proof response: `policyId`、`policyVersion`、`proof`、順序検証済み`publicInputs`
- Account: `updatePolicyCommitment(bytes32)`と既存`execute(address,uint256,bytes)`

### Storyをまたぐ不変条件

- 1 Accountに1つの論理Policy、最大1つのactive version、最大1つのpending versionだけを許可する。
- nonce検証・消費とpending version保存を同じSQLite transactionで行う。
- active化前に対象Txと現在のオンチェーンCommitmentを検証する。
- Proof生成時にもオンチェーンCommitmentとの一致を再確認する。
- 実送金額とVerifierへ渡すPublic Inputを一致させる。
- 認証、Policy検証、Proof生成、Transaction実行を別責務として維持する。
- 秘密値、暗号鍵、Owner秘密鍵、平文Tokenをlogへ出力しない。

## Story

| ID | Story | Depends on | Status |
| --- | --- | --- | --- |
| [story-02-01](../stories/epic-02/story-02-01-owner-registers-policy.md) | Ownerが初回Policyを登録する | なし | done |
| [story-02-02](../stories/epic-02/story-02-02-owner-updates-policy.md) | OwnerがPolicyを更新する | story-02-01 | done |
| [story-02-03](../stories/epic-02/story-02-03-client-requests-proof.md) | Clientがactive PolicyのProofを取得する | story-02-01 | done |
| [story-02-04](../stories/epic-02/story-02-04-owner-rotates-proof-token.md) | OwnerがProof API Tokenを再発行する | story-02-03 | done |
| [story-02-05](../stories/epic-02/story-02-05-owner-pays-with-api-proof.md) | OwnerがAPI生成Proofで送金する | story-02-02, story-02-03, story-02-04 | done |

## 依存グラフ

- Layer 0: `story-02-01`
- Layer 1: `story-02-02`、`story-02-03`
- Layer 2: `story-02-04`
- Layer 3: `story-02-05`

## 成功条件

- Ownerが0.1 ETHのPolicyを登録し、APIとAccountのCommitmentが一致したactive versionを確認できる。
- Ownerが同じPolicy IDの上限を更新し、旧versionがProof生成に使われない。
- 正しいTokenによる0.01 ETHのProof取得と送金で受取人残高が0.01 ETH増える。
- 上限超過、不正Token、署名replay、未確定または不一致PolicyではProof生成または送金が拒否される。
- Token再発行後は旧Tokenが拒否され、新Tokenだけが利用できる。
- Contract、TypeScript、API、CLI、E2Eの全テストが成功する。

## 安全境界

- Blockchain実行は非forkのローカルAnvil、chain ID `31337`だけを許可する。
- APIは`127.0.0.1`へbindし、外部interfaceへ公開しない。
- testnet、mainnet、実資産、productionへの操作は禁止する。
- 外部networkは依存関係とGitHub操作だけに使用する。

## ペンディング

なし。

## Delivery

- Epic PR: https://github.com/Komlock-lab/zk-policy-poc/pull/8

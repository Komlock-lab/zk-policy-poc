---
id: epic-05
type: epic
title: 送金先Addressのallowlistを使ったZK決済
status: in-progress
created: 2026-09-06
updated: 2026-09-06
adrs: [adr-0012, adr-0013]
---

# 送金先Addressのallowlistを使ったZK決済

## 背景

Phase 1-4は1回あたりの支出上限だけをZK Proofで検証しており、送金先は制約していない。上限内であれば任意の送金先へ送金できるため、Prompt Injectionで送金先だけを差し替える提案があっても、金額が上限内であればオンチェーンで拒否できない。roadmap Phase 6「複数ポリシー対応」は送金先Addressのallowlistをexpiryに次ぐ2番目の項目として計画しており、本Epicはこれを独立に着手する。expiryとの依存関係はなく、既存Phase 1-4の正常系を壊さずに追加できるため、Phase 6内の順序を入れ替えてallowlistを先行させる。

## ゴール

Ownerが秘密の送金先1件をPolicyに含めて登録・更新でき、許可された送金先への送金は上限内で成功し、許可されていない送金先への送金は上限内でもオンチェーンで拒否される。

## スコープ

### 含むもの

- Private Policyへの`allowedTarget`(単一address)の追加
- `policyCommitment`への`allowedTarget`の反映(3入力Poseidon2)
- CircuitでのTarget一致制約とTarget Public Inputの追加
- `ZkPolicyAccount`(`execute`・`executeUserOp`)からVerifierへ渡すPublic Inputへの`target`追加
- Policy API・CLIでの`allowedTarget`の登録・更新
- Proof生成APIでの`target`受け渡し
- Payment Client(policy-cli、payment-mcp)でのtarget配線
- 許可先送金の成功と許可外送金先の拒否のE2E検証

### 含まないもの

- expiry、token/contractのallowlist、一定期間の累積支出上限、Risk Score(roadmap Phase 6の他項目)
- 複数送金先のallowlist(本Epicは単一送金先)
- chain_id・nonceのProofバインディング(adr-0002のOwner限定authorizationモデルでは追加のreplayリスクがないため対象外)
- Safe Module等、本リポジトリと異なる実行境界を持つ他プロジェクトの機構の統合
- 包括的な攻撃・異常系検証(roadmap Phase 5の範囲)

## アーキテクチャ

### コンポーネントと責務

- `spend-limit` Circuitは送金額、送金先、上限、許可送金先、salt、Commitmentの関係を拘束する。
- `packages/policy`はwei金額、Field、送金先、salt、3入力Poseidon2 Commitmentを扱う。
- `packages/prover`はCircuit witnessと`target`を含むPublic InputでUltraHonk Proofを生成する。
- `SpendLimitVerifier.sol`は3つのPublic InputでProofを検証する(再生成のみ、ロジック変更なし)。
- `ZkPolicyAccount.sol`は実際の送金先をFieldへ変換してVerifierへ渡す。
- `apps/policy-api`はEIP-712検証、暗号化Policy secretへの`allowedTarget`追加、Proof生成時の`target`受け渡しを行う。
- `apps/policy-cli`・`apps/payment-mcp`は送金先を選ぶ既存の`recipient`をそのままProof要求の`target`として使う。

### データフロー

1. Off-chainで`Poseidon2(maxAmount, allowedTarget, salt)`から`policyCommitment`を生成する。
2. `value`・`target`・`policyCommitment`をPublic Input、`maxAmount`・`allowedTarget`・`salt`をPrivate InputとしてProofを生成する。
3. Owner EOAが`recipient`・`value`・`proof`を指定してAccountを呼び出す(既存のABIから変更なし)。
4. AccountがVerifierへ渡すPublic Inputへ`recipient`をFieldとして含める。
5. Proofが有効な場合だけAccountがrecipientへnative tokenを送金する。許可されていない送金先の場合、Circuitの制約によりそもそも有効なProofを生成できない。

### On-chain / Off-chain境界

- `maxAmount`・`allowedTarget`・`salt`はOff-chainだけで扱う。
- `value`・`target`・`policyCommitment`はPublic Inputとしてオンチェーンへ渡す。実送金先(`recipient`)とCircuitへ渡した`target`の一致はAccountが強制する。

### 認証・権限・秘密情報

- 認証はadr-0002のOwner EOA署名モデルを維持し、本Epicでは変更しない。
- `allowedTarget`は`maxAmount`・`salt`と同じ暗号化Policy secretとして保存し、平文でログや応答へ出さない。

### インターフェース

- Circuit Public Input: `value: Field`、`target: Field`、`policyCommitment: Field`
- Circuit Private Input: `maxAmount: Field`、`allowedTarget: Field`、`salt: Field`
- `PolicyUpdate` EIP-712: `policyId`、`account`、`allowedTarget`、`policyCommitment`、`nonce`、`deadline`
- Proof request: `policyId`、`valueWei`、`target`、Bearer Token
- Proof response: `policyId`、`policyVersion`、`proof`、`publicInputs`(3要素)
- Account: 既存の`execute(address payable,uint256,bytes)`・`executeUserOp(address payable,uint256,bytes)`(ABI変更なし)

### Storyをまたぐ不変条件

- Proof検証に使用する`target`と実際の送金先(`recipient`)を一致させる。
- `allowedTarget`はCircuitのPrivate Inputに留め、オンチェーンやAPI応答へ平文で出さない。
- 認証とPolicy検証(金額・送金先)を別責務として維持する(adr-0002)。
- CircuitとProverをERC-4337固有実装へ依存させない(既存方針の継続)。
- public chainを実行対象にしない。

## Story

| ID | Story | Depends on | Status |
| --- | --- | --- | --- |
| [story-05-01](../stories/epic-05/story-05-01-owner-registers-policy-with-allowed-target.md) | Ownerが送金先を含むPolicyを新規登録する | なし | in-progress |
| [story-05-02](../stories/epic-05/story-05-02-owner-updates-allowed-target.md) | Ownerが送金先を含むPolicyを更新する | story-05-01 | in-progress |
| [story-05-03](../stories/epic-05/story-05-03-owner-pays-allowed-target-only.md) | Ownerが許可された送金先へ支払い、許可外送金先への支払いが拒否される | story-05-01 | in-progress |

## 依存グラフ

- Layer 0: `story-05-01`
- Layer 1: `story-05-02`、`story-05-03`

## 成功条件

- 許可送金先0xAAAA・上限0.1 ETHのPolicyを登録し、AccountとAPIのCommitmentが一致する。
- 0xAAAAへの0.05 ETH送金がProof検証に成功し、受取人残高が0.05 ETH増える。
- 上限内(0.05 ETH)でも許可外送金先0xBBBBへの送金はProof生成またはオンチェーン検証で拒否され、残高が変化しない。
- Claude Code・Codex経由のpay_nativeが許可外送金先への送金を提案しても、MCP Toolが決済を拒否し秘密のallowedTargetを応答へ含めない。
- Circuit、Contract、TypeScript、E2Eの全テストが成功する。

## 安全境界

- 外部ネットワークは依存関係とGitHub操作だけに使用する。
- Blockchain実行は非forkのローカルAnvil、chain ID `31337`だけを許可する。
- testnet、mainnet、実資産、productionへの操作は禁止する。

## ペンディング

- このセッションのegressポリシーがBarretenberg CRS(crs.aztec-labs.com)とsolc(binaries.soliditylang.org)へのアクセスを403拒否するため、`pnpm generate:verifier`、`forge test`、`pnpm test:e2e`が実行できていない。circuits/packages/policy-api/policy-cliのコードとunit testは全て完了・検証済みだが、Verifier再生成とオンチェーン統合の実行確認はネットワーク制限のない別環境で行う必要がある(story-05-01のtask-05-01-04を参照)。
- story-05-03のAC-3(Claude Code・Codex経由で許可外送金先を提案した場合の拒否確認)は、実CLIを要する既存e2eテストの型変更のみ反映しており、新規シナリオは未実装。

## Delivery

- Epic PR: 未作成

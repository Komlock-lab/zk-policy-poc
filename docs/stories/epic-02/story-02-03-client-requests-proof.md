---
id: story-02-03
type: story
title: Clientがactive PolicyのProofを取得する
epic: epic-02
status: in-progress
depends_on: [story-02-01]
adrs: [adr-0004, adr-0006, adr-0007]
created: 2026-09-04
updated: 2026-09-04
---

# Clientがactive PolicyのProofを取得する

## ユーザーアクション

認証済みClientはPolicy IDと送金額を指定し、秘密Policyを受け取らずにProofとPublic Inputを取得できる。

## 背景

将来のAI ClientからOwner鍵、上限、saltを分離し、決済に必要なProofだけを提供するAPI境界が必要である。

## スコープ

### 含むもの

- Policy単位Bearer Token認証
- active状態とオンチェーンCommitmentの確認
- 秘密Policyの復号と同期Proof生成
- Proof、Policy version、Public Inputの返却

### 含まないもの

- 非同期Job、rate limit、決済Tx送信、ERC-4337

## 受け入れ条件

### 正常系

- AC-1 [正常系]: Given 0.1 ETHのactive Policyと正しいTokenがある / When Clientが0.01 ETHのProofを要求する / Then APIは検証可能なProofと金額・Commitmentに一致するPublic Inputを返す

### 異常系

- AC-2 [異常系]: Given 不正なBearer Tokenがある / When Proofを要求する / Then APIは秘密値を復号せず認証エラーで拒否する
- AC-3 [異常系]: Given Policy versionがpendingである / When Proofを要求する / Then APIは非activeとして拒否する
- AC-4 [異常系]: Given active metadataとAccountのCommitmentが異なる / When Proofを要求する / Then APIはProofを生成せず状態不一致で拒否する
- AC-5 [異常系]: Given 0.1 ETHのactive Policyがある / When Clientが1 ETHのProofを要求する / Then APIは上限超過として拒否する
- AC-6 [異常系]: Given 暗号化Policyが改ざんされている / When Proofを要求する / Then APIは認証tag検証失敗としてProofを返さない

## アーキテクチャ制約

- [epic-02](../../epics/epic-02-policy-management-proof-api.md)と[adr-0004](../../adr/adr-0004-policy-lifecycle-and-commitment-update.md)、[adr-0006](../../adr/adr-0006-encrypted-policy-storage-and-proof-token.md)、[adr-0007](../../adr/adr-0007-local-synchronous-policy-proof-api.md)に従う。
- [Noir Public and Private Inputs](../../../llm-wiki/wiki/concepts/noir-public-and-private-inputs.md)を維持する。

## Task

| ID | Task | Status |
| --- | --- | --- |
| [task-02-03-01](../../tasks/story-02-03/task-02-03-01-bearer-token-authentication.md) | Bearer Token認証 | done |
| [task-02-03-02](../../tasks/story-02-03/task-02-03-02-active-policy-chain-check.md) | active Policy読込とオンチェーン確認 | done |
| [task-02-03-03](../../tasks/story-02-03/task-02-03-03-synchronous-proof-api.md) | 同期Proof生成API | done |
| [task-02-03-04](../../tasks/story-02-03/task-02-03-04-proof-api-tests.md) | Proof APIテスト | done |

## 検証結果

- AC-1: `e2e/policy-proof.test.ts`で0.1 ETHのactive Policyへ0.01 ETHを要求し、同期生成したUltraHonk Proofのlocal backend検証と、`publicInputs = [value, active commitment]`を確認。
- AC-2: service/API testで不正・欠落・形式不正Tokenを`401 INVALID_POLICY_TOKEN`へ統一し、暗号化version取得前に拒否することを確認。
- AC-3: service testでpendingのみのPolicyを`409 POLICY_NOT_ACTIVE`としてProof生成前に拒否。
- AC-4: service testで未設定またはCommitment不一致を`409 ONCHAIN_POLICY_MISMATCH`として復号・Proof生成前に拒否。
- AC-5: service testで上限100に対する101を`422 POLICY_LIMIT_EXCEEDED`としてProof生成前に拒否。
- AC-6: service testでauthentication tag改ざんを`500 POLICY_SECRET_INVALID`へ変換し、秘密値をresponseへ含めずProofを返さないことを確認。
- 品質gate: `pnpm test`成功（Circuit 4、Contract 15、unit 31、E2E 4）、`pnpm benchmark:circuit`成功（ACIR 12、Brillig 8、Proof 7,232 bytes、327 ms）。

## Blocked

なし。

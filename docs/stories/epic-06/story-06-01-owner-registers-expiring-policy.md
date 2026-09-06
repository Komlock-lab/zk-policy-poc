---
id: story-06-01
type: story
title: Ownerが有効期限付きPolicyを登録して決済する
epic: epic-06
status: in-progress
depends_on: []
adrs: [adr-0012]
created: 2026-09-06
updated: 2026-09-06
---

# Ownerが有効期限付きPolicyを登録して決済する

## ユーザーアクション

Ownerが有効期限付きPolicyを登録して決済する。

## 背景

承認済み[epic-06](../../epics/epic-06-multi-policy.md)の複合条件を、観測可能な操作として実現する。

## スコープ

### 含むもの

- 複合Policyと公開入力の共通定義
- 有効期間を証明する回路・Prover・Verifier
- Account・Policy API・CLIの期限付き決済

### 含まないもの

- 新規の異常系・攻撃検証、同時送信、Risk Score全体、本番配置、実資産
- EpicおよびADRにない決済種別・PolicyのOR選択

## 受け入れ条件

### 正常系

- AC-1 [正常系]: Given 新しいローカルAccountとnative上限0.1 ETH・有効期間300秒のPolicy / When Ownerが作成CLIで登録する / Then 暗号化保存、Commitment更新、active化が完了する
- AC-2 [正常系]: Given active Policy / When Ownerが期限内に0.01 ETHを直接実行またはBundler経由で支払う / Then recipient残高が0.01 ETH増え、APIとAccountが同じ公開入力で実Proofを検証する

### 異常系

2026-09-06のユーザー指定により延期する。根拠はEpicのerror_acceptance_authorizationに記録済み。実施済み・成功とは扱わない。

## アーキテクチャ制約

- Epicの「Storyをまたぐ不変条件」と15公開入力の順序・型を維持する。
- [adr-0012](../../adr/adr-0012-composite-policy-schema.md)
- [公開・秘密入力](../../../llm-wiki/wiki/concepts/noir-public-and-private-inputs.md)
- [ERC-4337決済境界](../../../llm-wiki/wiki/concepts/erc-4337-zk-policy-payment.md)
- Owner Key・Policy・TokenをAgentへ公開しない。local chain ID 31337のみ使用する。

## Task

| ID | Task | Status |
| --- | --- | --- |
| [task-06-01-01](../../tasks/story-06-01/task-06-01-01-policy-schema-and-inputs.md) | 複合Policyと公開入力の共通定義 | done |
| [task-06-01-02](../../tasks/story-06-01/task-06-01-02-expiry-circuit-and-verifier.md) | 有効期間を証明する回路・Prover・Verifier | done |
| [task-06-01-03](../../tasks/story-06-01/task-06-01-03-expiry-account-api-cli.md) | Account・Policy API・CLIの期限付き決済 | done |

## 検証結果

2026-09-06: 実装・ship-story検証完了。StoryはEpic統合待ちのためin-progressを維持する。

- AC-1: `e2e/policy-registration.test.ts`が新DB・新Accountに対して実CLI `index.ts 100000000000000000 300`を実行。暗号化されたv2 Policyのnative上限0.1 ETH、有効期間300秒、active version 1とAccount Commitment一致を確認。
- AC-2: `e2e/policy-payment.test.ts`と`e2e/zk-payment.test.ts`で直接実行のrecipient残高+0.01 ETH、`e2e/bundler-payment.test.ts`で実AltoとCLIによるrecipient残高+0.01 ETHを確認。API・Clientは15公開入力を照合し、Accountが実行引数とオンチェーン状態から再構築した同じ公開入力で実Proofを検証。`e2e/payment-mcp.test.ts`のnative経路も成功。
- 共通定義: 65 Fieldの既知CommitmentをTypeScriptとNoirで照合。公開入力15要素の順序をunit testで確認。
- `pnpm test`成功: build/Verifier再生成/typecheck、Circuit 4、Contract 29（既存fuzz各256 runs）、unit 95、E2E 22。実Agent 5件のskipは成功に数えない。
- `pnpm benchmark:circuit`成功: 1,119 ACIR opcodes、Proof 7,616 bytes、実Proof生成とローカル検証585 ms。Verifier runtime 15,728 bytes。
- `forge fmt --check contracts/src/ZkPolicyAccount.sol contracts/test/ZkPolicyAccount.t.sol`、`git diff --check`、`node scripts/validate-planning.mjs`成功。
- Account/API/Clientと独立したCircuit/ProverレビューでCRITICAL/HIGH残件なし。Owner署名・activation・Token再確認・秘密隔離を維持。新規異常系、recipient/contract/daily条件の有効化は本Storyでは実装・検証しない。
- ログ: `/private/tmp/story01-full-test.log`、`/private/tmp/story01-benchmark.log`。
- Knowledge feedback: 新しい設計判断・外部資料由来の知識はなく、Wiki/ADR変更なし。

## Blocked

なし。Story PR作成後のEpicへのmergeとdone遷移はrun-epicが担当する。

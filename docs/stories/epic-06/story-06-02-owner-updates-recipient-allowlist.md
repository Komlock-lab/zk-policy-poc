---
id: story-06-02
type: story
title: Ownerが許可送金先を更新して決済する
epic: epic-06
status: done
depends_on: [story-06-01]
adrs: [adr-0012]
created: 2026-09-06
updated: 2026-09-06
---

# Ownerが許可送金先を更新して決済する

## ユーザーアクション

Ownerが許可送金先を更新して決済する。

## 背景

承認済み[epic-06](../../epics/epic-06-multi-policy.md)の複合条件を、観測可能な操作として実現する。

## スコープ

### 含むもの

- recipient allowlistの回路制約
- allowlistのOwner更新と決済E2E

### 含まないもの

- 新規の異常系・攻撃検証、同時送信、Risk Score全体、本番配置、実資産
- EpicおよびADRにない決済種別・PolicyのOR選択

## 受け入れ条件

### 正常系

- AC-1 [正常系]: Given recipient Aを許可したactive Policy / When Ownerがrecipient Bを追加して更新・active化する / Then 同じPolicy IDでversionが増え、新CommitmentでBへの期限内決済が成功する

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
| [task-06-02-01](../../tasks/story-06-02/task-06-02-01-recipient-membership.md) | recipient allowlistの回路制約 | done |
| [task-06-02-02](../../tasks/story-06-02/task-06-02-02-recipient-policy-update.md) | allowlistのOwner更新と決済E2E | done |

## 検証結果

2026-09-06: 実装・ship-story検証完了。Epicへの統合待ちのためin-progressを維持。

- AC-1: `e2e/recipient-policy-update.test.ts`が実Owner CLI `policy:create --policy-file`でAを許可したPolicyを作成しAへ支払い、`policy:update --policy-file`でBを追加。同じPolicy IDのversion 2、新CommitmentとAccount一致、暗号化されたallowlistの正規化を確認。新versionの実ProofでBへ支払いrecipient残高が0.01 ETH増加。
- `pnpm test`成功: build/Verifier再生成/typecheck、Circuit 6、Contract 29（既存fuzz各256 runs）、unit 97、E2E 23。既存のrecipient条件false・numeric CLIも維持。実Agent 5件はskipされ成功に数えない。
- `pnpm benchmark:circuit`成功: 2,606 ACIR opcodes、main Brillig 87、Proof 8,000 bytes、生成・ローカル検証746 ms。`forge inspect --root contracts HonkVerifier deployedBytecode`でruntime 15,939 bytes。
- `git diff --check`、`node scripts/validate-planning.mjs`成功。ログ: `/private/tmp/story02-full-test.log`、`/private/tmp/story02-benchmark.log`。
- scope/architecture/security review: recipientフラグのboolean、有効長16以下、有効部分のみの所属、160bit域・昇順一意性・zero paddingを同じ65 FieldのCommitmentへ拘束。15公開入力順序・Owner認証・暗号化保存を維持。rootの独立レビューもCRITICAL/HIGH残件なし。
- 新規異常系はユーザー指定どおり延期。新しい設計判断・外部資料由来の知識がないためWiki/ADR変更なし。

## Blocked

なし。Story PRのmergeとdone遷移はrun-epicが担当。

統合: Story PR #22をEpicへmerge。Epic上の`pnpm test`も成功（Circuit 6 / Contract 29 / unit 97 / E2E 23）。ログ: `/private/tmp/epic-06-layer1-tests.log`。

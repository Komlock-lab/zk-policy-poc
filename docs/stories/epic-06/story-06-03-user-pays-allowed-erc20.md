---
id: story-06-03
type: story
title: 利用者が許可ERC-20を送金する
epic: epic-06
status: done
depends_on: [story-06-02]
adrs: [adr-0012, adr-0013]
created: 2026-09-06
updated: 2026-09-06
---

# 利用者が許可ERC-20を送金する

## ユーザーアクション

利用者が許可ERC-20を送金する。

## 背景

承認済み[epic-06](../../epics/epic-06-multi-policy.md)の複合条件を、観測可能な操作として実現する。

## スコープ

### 含むもの

- assetルール選択とToken入力の拘束
- Accountの標準ERC-20送金
- ERC-20のAPI・Client・MCP接続

### 含まないもの

- 新規の異常系・攻撃検証、同時送信、Risk Score全体、本番配置、実資産
- EpicおよびADRにない決済種別・PolicyのOR選択

## 受け入れ条件

### 正常系

- AC-1 [正常系]: Given recipientと標準ERC-20がPolicyに登録されAccountがTokenを保有する / When 利用者がToken addressと最小単位amountを指定して送金する / Then AccountのToken残高減少とrecipientの同額増加を確認できる

### 異常系

2026-09-06のユーザー指定により延期する。根拠はEpicのerror_acceptance_authorizationに記録済み。実施済み・成功とは扱わない。

## アーキテクチャ制約

- Epicの「Storyをまたぐ不変条件」と15公開入力の順序・型を維持する。
- [adr-0012](../../adr/adr-0012-composite-policy-schema.md)
- [adr-0013](../../adr/adr-0013-typed-multi-asset-payments.md)
- [公開・秘密入力](../../../llm-wiki/wiki/concepts/noir-public-and-private-inputs.md)
- [ERC-4337決済境界](../../../llm-wiki/wiki/concepts/erc-4337-zk-policy-payment.md)
- Owner Key・Policy・TokenをAgentへ公開しない。local chain ID 31337のみ使用する。

## Task

| ID | Task | Status |
| --- | --- | --- |
| [task-06-03-01](../../tasks/story-06-03/task-06-03-01-asset-policy-circuit.md) | assetルール選択とToken入力の拘束 | done |
| [task-06-03-02](../../tasks/story-06-03/task-06-03-02-erc20-execution.md) | Accountの標準ERC-20送金 | done |
| [task-06-03-03](../../tasks/story-06-03/task-06-03-03-erc20-client-mcp.md) | ERC-20のAPI・Client・MCP接続 | done |

## 検証結果

2026-09-06: 実装・ship-story検証完了。Epic統合待ちのためin-progressを維持。

- AC-1: `e2e/erc20-payment.test.ts`がrecipientと標準PolicyTokenを登録した新DB・新Accountで、直接実行10、実CLI/Alto 20、実stdio MCP `pay_erc20`/Alto 30最小単位を送金。Account残高1000→990→970→940とrecipient残高0→10→30→60、各successful receiptとERC20PaymentExecutedを確認。
- 同じPolicyでnative上限1・Token上限100を選択し、native 1 weiとERC-20の10/20/30最小単位を別の上限で実Proof検証。API/Client/Accountの15公開入力と型付きcalldataが一致。
- `pnpm test`成功: build/Verifier再生成/typecheck、Circuit 7、Contract 32（既存29＋ERC-20正常系3、fuzz各256 runs）、unit 99、E2E 24。実Agent 5件はskipされ成功に数えない。
- `pnpm benchmark:circuit`成功: 2,619 ACIR opcodes、main Brillig 87、Proof 8,000 bytes、生成・ローカル検証747 ms。`forge inspect --root contracts HonkVerifier deployedBytecode`でruntime 15,938 bytes。
- `forge fmt --check contracts/src/ZkPolicyAccount.sol contracts/src/fixtures/PolicyToken.sol contracts/test/ZkPolicyAccount.t.sol`、`git diff --check`、`node scripts/validate-planning.mjs`成功。
- Scope/architecture/securityの独立レビューとrootの最終レビューでCRITICAL/HIGH残件なし。Owner認証とPolicy検証の分離、標準transferのみ、秘密非露出、検証・累積更新→外部呼出し順を維持。
- Agent固有allow設定はStory06-09/10まで据え置き。新規異常系はユーザー指定どおり延期。新設計・外部資料由来の知識はなくWiki/ADR変更なし。
- ログ: `/private/tmp/story03-full-test.log`、`/private/tmp/story03-erc20-e2e.log`、`/private/tmp/story03-benchmark.log`。

## Blocked

なし。Story PRのmergeとdone遷移はrun-epicが担当。

統合: Story PR #23をEpicへmerge。Epic上の`pnpm test`も成功（Circuit 7 / Contract 32 / unit 99 / E2E 24）。ログ: `/private/tmp/epic-06-layer2-tests.log`。

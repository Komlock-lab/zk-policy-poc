---
id: story-06-04
type: story
title: 利用者が許可Contractへ請求ID付きで支払う
epic: epic-06
status: in-progress
depends_on: [story-06-03]
adrs: [adr-0012, adr-0013]
created: 2026-09-06
updated: 2026-09-06
---

# 利用者が許可Contractへ請求ID付きで支払う

## ユーザーアクション

利用者が許可Contractへ請求ID付きで支払う。

## 背景

承認済み[epic-06](../../epics/epic-06-multi-policy.md)の複合条件を、観測可能な操作として実現する。

## スコープ

### 含むもの

- Contract allowlistと請求IDの拘束
- 型を固定したContract決済
- Contract決済のAPI・Client・MCP接続

### 含まないもの

- 新規の異常系・攻撃検証、同時送信、Risk Score全体、本番配置、実資産
- EpicおよびADRにない決済種別・PolicyのOR選択

## 受け入れ条件

### 正常系

- AC-1 [正常系]: Given pay(bytes32) payableに対応する許可Contractとactive Policy / When 利用者がinvoiceIdとnative金額を指定する / Then ContractがそのinvoiceIdと受領額をイベントへ記録し残高が増える

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
| [task-06-04-01](../../tasks/story-06-04/task-06-04-01-contract-policy-circuit.md) | Contract allowlistと請求IDの拘束 | done |
| [task-06-04-02](../../tasks/story-06-04/task-06-04-02-contract-execution.md) | 型を固定したContract決済 | done |
| [task-06-04-03](../../tasks/story-06-04/task-06-04-03-contract-client-mcp.md) | Contract決済のAPI・Client・MCP接続 | done |

## 検証結果

2026-09-06: 実装・ship-story検証完了。Epic統合待ちのためin-progressを維持。

- AC-1: `e2e/contract-payment.test.ts`が新DB・新Account・許可Contractで、直接0.01 ETH、実CLI/Alto 0.02 ETH、実stdio MCP pay_contract/Alto 0.03 ETHを3つのinvoiceで決済。receiver残高0→0.01→0.03→0.06 ETH、各InvoicePaid(invoiceId,payer=Account,value)とContractPaymentExecuted、successful receiptを確認。
- invoice上下128bitが異なる値と全FFのbytes32を実Proof検証。recipient/Contractの両allowlistを有効にし、同じPolicyでcontract allowlist外の許可native EOAへの1 wei決済も成功（Contract条件はkind=2へ適用）。
- `pnpm test`成功: build/Verifier再生成/typecheck、Circuit 9、Contract 35（既存32＋正常系3、fuzz各256 runs）、unit 101、E2E 25。実Agent 5件はskipされ成功に数えない。
- `pnpm benchmark:circuit`成功: 4,113 ACIR opcodes、main Brillig 87、Proof 8,000 bytes、生成・ローカル検証915 ms。`forge inspect --root contracts HonkVerifier deployedBytecode`でruntime 15,938 bytes。
- `forge fmt --check contracts/src/ZkPolicyAccount.sol contracts/src/interfaces/IPolicyPaymentReceiver.sol contracts/src/fixtures/PolicyPaymentReceiver.sol contracts/test/ZkPolicyAccount.t.sol`、`git diff --check`、`node scripts/validate-planning.mjs`成功。
- 独立scope/architecture/security reviewとrootのClient確認でCRITICAL/HIGH残件なし。kind=2とinvoice、実呼出し先、native共有枠を結合し、Owner認証・秘密隔離・固定pay selector・状態更新後の外部呼出しを維持。
- 新規異常系はユーザー指定どおり延期。Agent固有allow設定はStory06-09/10で更新。新設計・外部資料由来の知識はなくWiki/ADR変更なし。
- ログ: `/private/tmp/story04-full-test.log`、`/private/tmp/story04-contract-e2e.log`、`/private/tmp/story04-benchmark.log`。

## Blocked

なし。Story PRのmergeとdone遷移はrun-epicが担当。

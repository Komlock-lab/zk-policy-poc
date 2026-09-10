---
id: audit-06
type: audit
title: 複数ポリシー対応の統合監査
epic: epic-06
status: passed
date: 2026-09-06
---

# 複数ポリシー対応の統合監査

## 実行した検証

全9 Story doneの `41761a4` で4分野を最終確認。差分は計画文書・Contractの整形と単独revertへの波括弧追加のみで意味変更なし。最終実Agent gateも成功し、判定を確定した。

| Story/AC | 実検証 | 観測結果 |
| --- | --- | --- |
| story-06-01 AC-1 | `e2e/policy-registration.test.ts` | 実作成CLI、暗号化保存、Commitment更新、active化 |
| story-06-01 AC-2 | `e2e/policy-payment.test.ts / e2e/bundler-payment.test.ts` | 15公開入力の実Proofで直接実行とAlto決済、recipient +0.01 ETH |
| story-06-02 AC-1 | `e2e/recipient-policy-update.test.ts` | Owner実CLIでA→A/B、同じID/version2でB +0.01 ETH |
| story-06-03 AC-1 | `e2e/erc20-payment.test.ts` | 直接10/CLI20/MCP30最小単位、Account1000→940、recipient0→60、実行イベント |
| story-06-04 AC-1 | `e2e/contract-payment.test.ts` | 直接.01/CLI.02/MCP.03 ETH、invoice両128bitとpayer/valueイベント、受領残高.06 ETH |
| story-06-05 AC-1 | `e2e/daily-payment.test.ts` | native .03+.02=.05 ETH、Proofのみ生成では累積不変 |
| story-06-05 AC-2 | `e2e/daily-payment.test.ts` | Contract .01 ETHでnative共有枠.06 ETH |
| story-06-05 AC-3 | `e2e/daily-payment.test.ts` | Token10+20=30、native累積.06 ETH維持 |
| story-06-05 AC-4 | `e2e/daily-payment.test.ts` | 翌UTC日getter0、新規決済.04 ETH、Token残高実績維持 |
| story-06-06 AC-1 | `e2e/daily-policy-update.test.ts` | Owner実CLI更新v2、Proof spentBefore .05 ETH、支払後.07 ETH |
| story-06-06 AC-2 | `e2e/daily-policy-update.test.ts` | native除外v3/再登録v4、Token除外v5/再登録v6で当日実績引継ぎ |
| story-06-09 AC-1 | `e2e/claude-code-payment.test.ts` | 全条件有効で3 Tool各1回、receipt順、native累積+.03 ETH、Token累積+10、秘密非露出 |
| story-06-10 AC-1 | `e2e/codex-payment.test.ts` | 全条件有効で3 Tool各1回、nonce+3、native .01/Contract .02 ETH、Token25、invoiceイベント、秘密非露出 |
| story-06-11 AC-1 | `pnpm test`、`pnpm benchmark:circuit`、実Agent E2E | 下記quality gateの実行結果へ対応 |

Epicの成功条件は上記の順に01/02（期限・recipient）、03/04（Token・Contract）、05（日次）、06（Policy更新引継ぎ）、09/10（実両Agent）へ対応する。

## Quality gate

- `pnpm test`成功: build/typecheck、Circuit 11、Contract 39（正常値fuzz各256 runs）、unit/API/Client/MCP 103、local E2E 27。通常コマンドの実Agent 7件skipは成功に含めない。ログ `/private/tmp/story11-full-test.log`。
- 同一実装`63d0383`で `RUN_CLAUDE_CODE_E2E=1 RUN_CODEX_E2E=1 NODE_OPTIONS=--experimental-sqlite pnpm exec vitest run apps/payment-mcp/src e2e/claude-code-payment.test.ts e2e/codex-payment.test.ts`成功: Claude 2、Codex 5、MCP unit 22（全29件、skipなし）。ログ `/private/tmp/epic06-layer6-tests.log`。以後の変更は計画・監査文書のみ。
- `pnpm benchmark:circuit`成功: main ACIR 4314、Brillig 87、Proof 8000 bytes、生成940 ms（単発実測）。ログ `/private/tmp/story11-benchmark.log`。
- 固定版: Node 23.3.0、pnpm 10.18.1、nargo 1.0.0-beta.26、bb 5.2.0、forge 1.5.1、Claude Code 2.1.260、Codex 0.153.2。専用PATHで実行。
- 非fork Anvil chain ID 31337、実Alto、新規fixture資産でreceipt・残高・invoiceイベント・日次累積を確認。AC対応は上記AC表に集約。

## 監査範囲と根拠

以下のfile:lineは初回レビューcommit `63d0383` を参照（後続はContractのformatのみ）。ADR-0012/0013/0014、Epicの不変条件を対象に4担当で独立静的レビュー。新規の異常系・攻撃試験、Phase 5、Risk Scoreは対象外。既存回帰テストは維持し、延期範囲を成功として数えない。非fork Anvil chain ID 31337とfixture資産のみ使用。

| 分野 | 確認した根拠 |
| --- | --- |
| ADR・アーキテクチャ | `packages/policy/src/schema.ts:30,50,77`の65秘密Field/15公開入力、`apps/policy-cli/src/pay-with-policy.ts:62`の全15照合、`apps/payment-mcp/src/server.ts:109`以降の3 Toolと公開結果 |
| ZK | `circuits/spend-limit/src/main.nr:14,28,43,58,63,67,71`の正規化・AND・kind/target/invoice・期限・日次加算・Commitment、`packages/prover/src/spend-limit.ts:72,80,91`の入力照合と実Proof検証 |
| Contract | `contracts/src/ZkPolicyAccount.sol:68,84,95,107,119,131,143,183,201,202,204`のPolicy更新時支出維持、Owner/EntryPoint共通処理、実状態から15入力再構築、検証→累積更新→固定送金 |
| API・秘密・信頼性 | `apps/policy-api/src/service.ts:269,318,336,353,369,387`のOwner署名/Token認可、暗号化Policy読出し、固定blockの累積参照、全15照合、完了直前のPolicy/Token再確認。`server.ts`のlogger無効・定型error、Clientのlocalhost限定・receipt確認 |

## 実Agentの診断履歴

Story09の初期試行では複数依頼の一部Toolが呼ばれない事象と、system tool一覧に対する文字列位置検査による誤検出があった。構造化tool_use検査に修正し、3つの自然言語依頼にTool名を明記した最終入力で成功した。失敗試行を成功に数えず、同一原因を無制限に再試行しない。最終テストは各Tool1回、3 receipt、順序、残高・累積、秘密非露出をすべて検査する。診断は秘密値を除いた最終結果metadataのみ任意保存し、全文は保持しない。詳細はStory09とTask06-09-02を参照。

## Knowledge feedback

今回の発見は実装から導ける事項と個別診断のためWikiへ追加しない。承認済みADRを変更する設計差分、追加の共通開発規約なし。

## Findings

| ID | Severity | Area | Finding | Remediation | Status |
| --- | --- | --- | --- | --- | --- |
| — | — | 全4分野 | 全Story統合後の静的レビューで指摘なし | 不要 | 確認済み |

## 再監査

- 初回レビュー対象: `63d0383`。全Story done後の `41761a4` でADR/ZK/Contract/API担当が最終差分を確認。意味変更なし。
- 修正・再監査iteration: 0。

## 最終結果

- CRITICAL/HIGH残件: 0
- MEDIUM/LOW残件: 0
- 判定: passed

## 最終gateの実測

- `41761a4`で`pnpm test`再実行成功: Circuit 11、Contract 39、unit 103、local E2E 27。Agent 7 skipを成功に含めない。build/typecheckも成功。ログ `/private/tmp/epic06-final-full-test.log`。
- `pnpm benchmark:circuit`再実行: ACIR 4314、Brillig 87、Proof 8000 bytes、生成936 ms（単発実測）。ログ `/private/tmp/epic06-final-benchmark.log`。
- `bash scripts/check-toolchain.sh`、対象Solidityの`forge fmt --check`、planning validator、validatorテスト9件、`git diff --check`成功。
- 元worktreeの計画40ファイルは最初に保存したcommit `30f6873` とbyte単位で一致し、既存Codexの2変更も維持。元mainは `29ab9e3` のまま。

- 最終実Agent gate: `RUN_CLAUDE_CODE_E2E=1 RUN_CODEX_E2E=1 NODE_OPTIONS=--experimental-sqlite pnpm exec vitest run e2e/claude-code-payment.test.ts e2e/codex-payment.test.ts`成功。Claude 2・Codex 5、全7件skipなし。ログ `/private/tmp/epic06-final-agent-tests.log`。

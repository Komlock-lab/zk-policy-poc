---
id: epic-06
type: epic
title: 複数ポリシー対応
status: review
error_acceptance: deferred
error_acceptance_reason: Phase 5を飛ばし正常系の複数条件決済を優先する
error_acceptance_authorization: 2026-09-06 ユーザー指定「異常系は今考えなくていい」「いまの案でプランニング、実装して」
created: 2026-09-06
updated: 2026-09-06
adrs: [adr-0012, adr-0013, adr-0014]
---

# 複数ポリシー対応

## 背景

Phase 4のStoryはすべてdoneで、native tokenの自然言語決済経路が存在する。Roadmap上のPhase 4のapproved表記とEpic本文のreviewには差があるが、本計画ではユーザー指定どおりPhase 4実装済みを前提とする。Phase 5は開始条件にしない。

既存CircuitはvalueとpolicyCommitmentだけを公開入力に取り、Accountは1つのCommitmentを保持する。Policy APIは1 Accountにつき1 Policy IDとversionを管理する。この構造を複数条件へ拡張する。

## ゴール

Ownerが設定した複数条件をすべて満たす決済を、Claude CodeとCodexから既存のBundler経路で実行できる。

## スコープ

### 含むもの

Roadmapの順に、有効期限、recipient allowlist、Token・Contract allowlist、期間累積上限を追加する。具体的な設計案は以下のADRを正本とする。

- [adr-0012: 条件合成とPolicy schema](../adr/adr-0012-composite-policy-schema.md)
- [adr-0013: 決済種別と実行境界](../adr/adr-0013-typed-multi-asset-payments.md)
- [adr-0014: 日次累積支出](../adr/adr-0014-onchain-daily-spend.md)

### 含まないもの

- Phase 5、攻撃シナリオ、新規の異常系受け入れ条件・異常系テスト設計
- 複数PolicyのOR選択、AgentごとのPolicy選択、汎用ルールエンジン
- 任意calldata、approve、swap、batch、NFT、特殊なERC-20
- ローリング期間、為替換算した資産横断予算、gas費の予算計上
- Risk Score全体（Registry・Owner設定・外部評価を含む）
- public network、実資産、本番配置、既存デプロイの移行

既存の認可・秘密隔離は維持する。今回の異常系省略はユーザーによる明示的なスコープ指定であり、異常系を検証済みとは記録しない。

## アーキテクチャ

### コンポーネントと責務

- Owner CLI: 複合Policy作成・更新、署名、オンチェーン反映、API activation。
- packages/policy: schema、整数・address表現、Commitment計算。
- Circuit / Prover: 同じCommitmentに固定した全条件のAND証明。
- Policy API: 暗号化保存、active Policy確認、Accountの公開状態取得、同期Proof生成。
- Account: 実行引数とオンチェーン状態から公開入力を再構築し、期限確認、Proof検証、累積額更新、決済を行う。
- 決済Client: ProofとIntentを照合し、UserOperationを署名・送信する。
- MCP: 型付きIntentだけを受け取り、公開receiptだけを返す。

### データフロー

1. Ownerが複合Policyを暗号化保存し、CommitmentをAccountへ登録してactive化する。
2. Agentが決済種別、recipient、asset、金額などのIntentをMCPへ渡す。
3. Clientが期限の省略値を補完し、APIが累積額・日付を読み取る。
4. APIが秘密Policyと公開contextからProofを生成する。
5. ClientがOwner署名済みUserOperationをBundlerへ送る。
6. Accountが現在の公開状態からProofを検証し、予算を計上して決済する。
7. receipt確認後にAgentへ成功結果を返す。

### On-chain / Off-chain境界

秘密: 金額上限、allowlist全体、日次上限、salt。
公開: 実送金内容、期限、Commitment、UTC日番号、資産別累積額。
有効期限と日次区切りはAccountがblock.timestampを使って確認する。APIの時計だけには依存しない。

### 認証・権限・秘密情報

Owner EIP-712認可、pending / active / superseded、Token認証、暗号化DBを継続する。
AgentへPolicy本文、Owner Key、API Token、Proofを公開しない。MCPの決済ごとの追加承認を導入しない。

### インターフェース

- Policy: schemaVersion、maxValiditySeconds、recipientEnabled、recipientAllowlist、assetRules、contractEnabled、contractAllowlist、dailyEnabled、salt。1回上限はassetRules内にだけ保持する。
- assetRules: asset、maxAmount、dailyLimit。nativeのasset識別子はzero address。
- Intent: kind、recipient、asset、amount、target、invoiceId、issuedAt、validUntil。種別ごとの判別unionとする。Clientが最新block timestampからissuedAtを作り、validUntilの省略値はissuedAt + 300秒とする。より短いPolicyには明示したvalidUntilを使う。
- Proof API: Policy IDとIntentを受け、Proof・順序固定のpublicInputs・policyVersionを返す。Bundler型は持ち込まない。
- MCP: pay_native、pay_erc20、pay_contract。詳細はadr-0013。
- 公開入力は15要素。順序と型は[adr-0012](../adr/adr-0012-composite-policy-schema.md)で固定する。Accountが現在の状態からdayId・spentBeforeを取得し、呼出し元の自己申告値は使用しない。

### Storyをまたぐ不変条件

- 条件はすべて同じPolicy Commitmentに結合する。
- Proofが参照する送金額・送金先・Token・Contract・期限は実行内容と一致する。
- 累積支出の正本はAccountであり、Policy APIでのProof生成では支出を増やさない。
- Policy更新で当日の累積支出をリセットしない。
- Owner直接実行とEntryPoint実行は同じ条件検証と累積計上を通る。
- 新規の正常系確認を中心とし、既存テストは互換性確認として維持する。
- 既存pinを維持し、新しい外部サービス依存を導入しない。

## Story

| ID | Story | Depends on | Status |
| --- | --- | --- | --- |
| [story-06-01](../stories/epic-06/story-06-01-owner-registers-expiring-policy.md) | Ownerが有効期限付きPolicyを登録して決済する | なし | done |
| [story-06-02](../stories/epic-06/story-06-02-owner-updates-recipient-allowlist.md) | Ownerが許可送金先を更新して決済する | story-06-01 | done |
| [story-06-03](../stories/epic-06/story-06-03-user-pays-allowed-erc20.md) | 利用者が許可ERC-20を送金する | story-06-02 | done |
| [story-06-04](../stories/epic-06/story-06-04-user-pays-allowed-contract.md) | 利用者が許可Contractへ請求ID付きで支払う | story-06-03 | done |
| [story-06-05](../stories/epic-06/story-06-05-user-pays-with-daily-budget.md) | 利用者が日次予算内で続けて支払う | story-06-04 | done |
| [story-06-06](../stories/epic-06/story-06-06-owner-updates-daily-budget.md) | Ownerが当日の支出を維持して日次上限を更新する | story-06-05 | done |
| [story-06-09](../stories/epic-06/story-06-09-user-pays-with-claude-code.md) | 利用者がClaude Codeから複合Policyで支払う | story-06-06 | done |
| [story-06-10](../stories/epic-06/story-06-10-user-pays-with-codex.md) | 利用者がCodexから複合Policyで支払う | story-06-06 | done |
| [story-06-11](../stories/epic-06/story-06-11-developer-verifies-multi-policy.md) | Developerがフェーズ6全体の正常系を再現する | story-06-09, story-06-10 | done |

## 依存グラフ

- Layer 0〜5: story-06-01 → story-06-02 → story-06-03 → story-06-04 → story-06-05 → story-06-06
- Layer 6: story-06-09（Claude Code）、story-06-10（Codex）。個別worktreeと個別local fixtureで実行する。
- Layer 7: story-06-11（統合確認・監査・PR）

全9 Story、22 Task。各Story内Taskは表の順に依存する。
Storyのdepends_onはepic-06内に限定し、Phase 5への依存を作らない。

## 成功条件

- 期限内のnative決済が許可recipientへ成立する。
- 許可ERC-20送金と許可Contract決済の残高・イベントを確認できる。
- 同じ日の複数決済で累積額が増え、翌日の最初の決済で新しい日次枠を使える。
- Policy更新後も当日の累積額を引き継いで決済できる。
- 全条件を有効にした正常系を、実Claude Code・実Codexから確認できる。

## 安全境界

chain ID 31337、非forkのローカル環境、fixture資産を使用する。異常系を後回しにするための認可迂回や常にtrueを返すVerifierは導入しない。

## 承認と実装開始条件

2026-09-06のユーザー指示「いまの案でプランニング、実装して」を現在案の承認および計画詳細化・実装の指示として記録する。2026-09-06の追加指定「Risk Score不要」「PoCだから正常系だけでOK」「他に懸念なければ実装して」を反映。実装対象ADRは3件accepted、Risk Score ADRはrejected。承認時点でStoryはapproved、Taskはpending。追加の設計判断はない。

正常系のみの計画はEpicの明示的な延期理由・承認根拠をvalidate-planningで検証する。既存Epicの異常系AC要件は維持する。

## Preflight

2026-09-06のrun-epic再開でGit権限制限を権限昇格により解消。

- 元worktreeの未コミット変更はすべて保持。承認済み計画40ファイルをEpic専用worktreeへコピーしcommit。
- 最新mainはlocal/remoteとも29ab9e31f3c915472d0a7c9a83d1790f32d09c1e。
- Epic branch/worktree/commit/push成功。GitHub認証正常。
- 作業場所: /private/tmp/zk-policy-epic-06。計画保存後のworktreeはclean。
- Node 23.3.0をPATHで明示し、bash scripts/check-toolchain.sh成功。pnpm install --frozen-lockfile成功。
- Nargo依存キャッシュ書込は権限昇格で許可。pnpm test成功: Circuit 4、Contract 28、unit 93、E2E 22。実Agent E2E 5件は通常コマンドでskip、成功には含めない。
- localhostのPolicy API・非fork Anvil（chain ID 31337）・実Altoで既存E2E成功。
- baselineログ: /private/tmp/epic-06-preflight-tests.log。
- 固定CLI（Claude Code 2.1.260、Codex 0.153.2）を専用PATHで使用し、RUN_CLAUDE_CODE_E2E=1 RUN_CODEX_E2E=1 NODE_OPTIONS=--experimental-sqlite pnpm exec vitest run e2e/claude-code-payment.test.ts e2e/codex-payment.test.ts成功（既存5 tests、skipなし）。ログ: /private/tmp/epic-06-baseline-agent-tests.log。

## Delivery

- 全9 Story・22 Task done。Story PR #21〜#29をEpicへ統合済み。
- [統合監査](../audits/epic-06-multi-policy.md): passed、CRITICAL/HIGH 0、MEDIUM/LOW 0。
- 最終quality gate（`41761a4`）: build/typecheck、Circuit 11、Contract 39、unit 103、local E2E 27、実Claude 2・実Codex 5成功。実Agentの通常skipは別実行で確認。
- 回路ACIR 4314 / Brillig 87、Proof 8000 bytes、生成936 ms（単発実測）。
- planning validator 113 documents、validator test 9件、相対リンク33文書、対象Solidity format、diff check成功。
- 元worktreeの未コミット計画40ファイルとCodex既存2変更を保持。mainは29ab9e3のまま。
- 保持worktree: `/private/tmp/zk-policy-epic-06`、`/private/tmp/zk-policy-story-06-*`。support用detached worktreeも保持。
- 最終Epic PR: [#30](https://github.com/Komlock-lab/zk-policy-poc/pull/30)（base main、未merge）。

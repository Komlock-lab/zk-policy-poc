---
id: epic-06
type: epic
title: 複数ポリシー対応
status: approved
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
| [story-06-01](../stories/epic-06/story-06-01-owner-registers-expiring-policy.md) | Ownerが有効期限付きPolicyを登録して決済する | なし | approved |
| [story-06-02](../stories/epic-06/story-06-02-owner-updates-recipient-allowlist.md) | Ownerが許可送金先を更新して決済する | story-06-01 | approved |
| [story-06-03](../stories/epic-06/story-06-03-user-pays-allowed-erc20.md) | 利用者が許可ERC-20を送金する | story-06-02 | approved |
| [story-06-04](../stories/epic-06/story-06-04-user-pays-allowed-contract.md) | 利用者が許可Contractへ請求ID付きで支払う | story-06-03 | approved |
| [story-06-05](../stories/epic-06/story-06-05-user-pays-with-daily-budget.md) | 利用者が日次予算内で続けて支払う | story-06-04 | approved |
| [story-06-06](../stories/epic-06/story-06-06-owner-updates-daily-budget.md) | Ownerが当日の支出を維持して日次上限を更新する | story-06-05 | approved |
| [story-06-09](../stories/epic-06/story-06-09-user-pays-with-claude-code.md) | 利用者がClaude Codeから複合Policyで支払う | story-06-06 | approved |
| [story-06-10](../stories/epic-06/story-06-10-user-pays-with-codex.md) | 利用者がCodexから複合Policyで支払う | story-06-06 | approved |
| [story-06-11](../stories/epic-06/story-06-11-developer-verifies-multi-policy.md) | Developerがフェーズ6全体の正常系を再現する | story-06-09, story-06-10 | approved |

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

2026-09-06のユーザー指示「いまの案でプランニング、実装して」を現在案の承認および計画詳細化・実装の指示として記録する。2026-09-06の追加指定「Risk Score不要」「PoCだから正常系だけでOK」「他に懸念なければ実装して」を反映。実装対象ADRは3件accepted、Risk Score ADRはrejected。Storyはapproved、Taskはpending。追加の設計判断はない。

正常系のみの計画はEpicの明示的な延期理由・承認根拠をvalidate-planningで検証する。既存Epicの異常系AC要件は維持する。

## Preflight

2026-09-06に実施し、明示的run-epic指定後にも再確認。ユーザーの通常ターミナルではGitHub接続・認証が正常。このセッション内のGit書込制限で停止している。製品実装は未開始。

- ローカルmain HEAD: 29ab9e3（Phase 4 Epic PR #19のmerge）。
- bash scripts/check-toolchain.sh: 成功。
- .git書込確認: fs.access(W_OK)がEPERM。現在の環境ではGitメタデータが読み取り専用。
- ユーザーの通常ターミナルでgit ls-remote origin refs/heads/main成功。remote mainは29ab9e31f3c915472d0a7c9a83d1790f32d09c1eでローカルHEADと一致する。
- ユーザーの通常ターミナルでgh auth status成功（takupeso）。このセッション内の認証エラーからトークン失効とは判断しない。
- 実操作git branch epic/epic-06-multi-policy mainは失敗。refs/heads/epic/epic-06-multi-policy.lock作成がOperation not permitted。ブランチは作成されていない。
- このセッションで利用可能な実行ツールにはGit操作の権限昇格を要求する引数がない。
- 既存ユーザー変更: .codex/config.toml、apps/payment-mcp/src/codex-config.test.ts。変更・破棄していない。
- 作業ツリーに計画変更があり、clean preflightは未達。Git書込回復後、計画変更だけをcommitし、既存ユーザー変更を保持した別worktreeで実装する。
- Git/ネットワーク事前条件で停止したため、localhostサービス起動・全テスト・push/PR作成は未確認。

再開条件: Git書込とGitHub通信・認証が利用可能な環境で、計画を保存し最新mainを確認してから、run-epicの残りのPreflightを行う。権限を回避する目的のコード変更は行わない。

再開時の実行指定: `run-epic docs/epics/epic-06-multi-policy.md`。

## Delivery

- Epic PR: 未作成
- 計画確定。製品コードは未変更。実装はPreflight解消待ち。
- 計画検証: node scripts/validate-planning.mjs成功（112 documents）。
- 計画検証ルールのテスト: node --test scripts/validate-planning.test.mjs成功（9 tests）。
- Phase 6の36文書の相対リンク確認成功。git diff --check成功。

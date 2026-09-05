---
id: epic-04
type: epic
title: Claude Code・Codex接続
status: in-progress
created: 2026-09-05
updated: 2026-09-05
adrs: [adr-0010, adr-0011]
---

# Claude Code・Codex接続

## 背景

Phase 3でOwnerはProof付きUserOperationを決定論的なClientからBundlerへ送れる。次にClaude CodeとCodexが自然言語からTransaction Intentを生成し、Owner Keyや秘密Policyを受け取らず同じ決済経路を自律的に利用できることを確認する。

## ゴール

利用者がClaude CodeまたはCodexへ自然言語で依頼すると、Agentが構造化Intentを共通MCP Toolへ渡し、人間の決済承認なしに支出上限内のnative token決済をローカルBundler経由で完了できる。

## スコープ

### 含むもの

- `@modelcontextprotocol/server` 2.0.0によるlocal stdio MCP Server
- `pay_native`のrecipientとdecimal `valueWei`からなるTransaction Intent
- Phase 3 UserOperation Clientの直接再利用
- Claude Code 2.1.260とCodex CLI 0.153.2のproject-scoped接続
- Tool単位の自動許可と実Agent自然言語E2E
- 秘密情報をMCP messageとAgent transcriptへ出さない境界

### 含まないもの

- Circuit、Verifier、Account、Policy API、UserOperation schemaの変更
- 決済ごとの人間承認、preview、dry-run、confirmation UI
- remote MCP、HTTP transport、OAuth、public Agent service
- 任意Contract call、batch、Token送金、Policy管理Tool、raw署名Tool
- recipient name解決、為替換算、自然言語parser service
- 複数Agentからの同時送金、idempotency、retry queue
- Prompt Injectionの包括検証、累積支出上限
- public testnet、mainnet、実資産、production deployment

## アーキテクチャ

### コンポーネントと責務

- Claude CodeとCodexは自然言語から`recipient`と`valueWei`を抽出してMCP Toolを選択する。
- `apps/payment-mcp`はTool schema、設定、秘密出力境界を検証しPhase 3 Clientを呼ぶ。
- Phase 3 ClientはProof取得、response検証、UserOperation構築、Owner署名、Bundler送信、receipt確認を決定論的に行う。
- Policy API、Account、EntryPoint、Bundlerは既存のPolicyと実行境界を強制する。

### データフロー

1. 利用者がAgentへrecipientと送金額を自然言語で依頼する。
2. Agentが`pay_native`へaddressとdecimal wei stringを渡す。
3. MCP Serverが入力とlocal-only設定を検証しPhase 3 Clientへ渡す。
4. ClientがProofを取得・照合し、Owner署名済みUserOperationをAltoへ送る。
5. AccountがOwner署名とZK Proofを検証して送金する。
6. MCP Serverが公開receipt識別子だけをAgentへ返す。

### On-chain / Off-chain境界

- On-chain境界とUserOperation内容はEpic 03から変更しない。
- AgentとMCPにはrecipient、実送金額、公開receiptだけを見せる。
- `maxAmount`、`salt`、暗号鍵、Policy Token、Owner KeyをオンチェーンまたはMCP dataへ渡さない。

### 認証・権限・秘密情報

- Agent Tool呼出しは自動許可し、ZK PolicyとOwner署名を決済認可の正本とする。
- 秘密credentialはMCP Server processへ限定して環境変数で渡す。
- Serverは任意署名や任意callを公開せず、秘密をstdoutまたはerrorへ出さない。

### インターフェース

- MCP Tool: `pay_native({ recipient: address, valueWei: decimal-string })`
- 成功結果: `policyId`、`policyVersion`、`userOperationHash`、`transactionHash`、`status`
- Claude Code: `.mcp.json`とTool限定allow rule
- Codex: `.codex/config.toml`、`enabled_tools`、`tools.pay_native.approval_mode = "approve"`

### Storyをまたぐ不変条件

- 両Agentが同じMCP Server、Tool schema、決済Clientを使用する。
- Agentの非決定的処理はIntent生成までとし、Proof取得以降を決定論的にする。
- Tool呼出しごとの人間承認を要求しない。
- MCP ServerはPolicyまたはAccountの拒否を迂回しない。
- 秘密値、credential、ProofをTool data、stdout、log、transcriptへ出さない。
- chain ID 31337とloopback endpointだけを許可する。
- Phase 1から3の全経路を壊さない。

## Story

| ID | Story | Depends on | Status |
| --- | --- | --- | --- |
| [story-04-01](../stories/epic-04/story-04-01-developer-starts-payment-mcp.md) | DeveloperがPolicy決済MCP Serverを起動する | なし | done |
| [story-04-02](../stories/epic-04/story-04-02-user-pays-with-claude-code.md) | 利用者がClaude CodeからPolicy決済する | story-04-01 | done |
| [story-04-03](../stories/epic-04/story-04-03-user-pays-with-codex.md) | 利用者がCodexからPolicy決済する | story-04-01 | done |
| [story-04-04](../stories/epic-04/story-04-04-developer-verifies-agent-compatibility.md) | Developerが両Agentの決済互換性を検証する | story-04-02, story-04-03 | done |

## 依存グラフ

- Layer 0: `story-04-01`
- Layer 1: `story-04-02`、`story-04-03`
- Layer 2: `story-04-04`

## 成功条件

- Claude CodeとCodexの自然言語依頼で0.01 ETHの決済が追加承認なしに成功する。
- 両Agentが同じ`pay_native`とPhase 3 Clientを使用する。
- 上限超過と不正入力はUserOperation送信前に拒否される。
- Agent transcriptとMCP出力へ秘密情報が現れない。
- Phase 1から3を含む全quality gateが成功する。

## 安全境界

- Blockchain、API、Bundlerは非forkのlocal環境だけを使用する。
- Toolはnative token単一送金だけを許可する。
- 連続送金の総額は制限されないことを明示し、実資産を使用しない。

## ペンディング

なし。

## Delivery

- Epic PR: 未作成

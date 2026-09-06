---
id: story-05-03
type: story
title: Ownerが許可された送金先へ支払い、許可外送金先への支払いが拒否される
epic: epic-05
status: approved
depends_on: [story-05-01]
adrs: [adr-0012, adr-0013]
created: 2026-09-06
updated: 2026-09-06
---

# Ownerが許可された送金先へ支払い、許可外送金先への支払いが拒否される

## ユーザーアクション

Ownerは許可された送金先へPolicy上限内で送金でき、Claude Code・Codex経由のAgentが許可外送金先への送金を提案しても、上限内であってもオンチェーンで拒否される。

## 背景

roadmap Phase 5が計画するPrompt Injection検証(送金先の差し替え)を、Phase 6のallowlist機能そのものによって恒常的に防げることを確認する。Proof API・Payment Client(policy-cli、payment-mcp)が新しい`target`受け渡しを正しく配線しないと、送金先制約はCircuitにあっても実運用経路で機能しない。

## スコープ

### 含むもの

- Proof生成APIへの`target`パラメータ追加とPublic Inputへの反映
- policy-cli(`execute`・`executeUserOp`経路)・payment-mcpでの`target`配線
- 許可送金先への支払い成功、許可外送金先への支払い拒否のE2E
- Claude Code・Codex経由のpay_nativeが許可外送金先を提案した場合の拒否とallowedTarget非露出の確認

### 含まないもの

- 複数送金先のallowlist、累積上限、Risk Score

## 受け入れ条件

### 正常系

- AC-1 [正常系]: Given 許可送金先0xAAAA・上限0.1 ETHのactive Policyがある / When Ownerが0xAAAAへ0.05 ETHを送金する / ThenProof検証に成功し受取人残高が0.05 ETH増える

### 異常系

- AC-2 [異常系]: Given 許可送金先0xAAAA・上限0.1 ETHのactive Policyがある / When Ownerが上限内の0.05 ETHを許可外の0xBBBBへ送金しようとする / ThenProof生成またはオンチェーン検証が拒否し受取人残高が変化しない
- AC-3 [異常系]: Given 許可送金先0xAAAAのactive Policyがある / When Claude Code・Codex経由のpay_nativeが許可外送金先0xBBBBへの送金を提案する / ThenMCP Toolが決済を拒否し、応答・ログに秘密の`allowedTarget`を含めない

## アーキテクチャ制約

- [epic-05](../../epics/epic-05-target-allowlist-payment.md)、[adr-0012](../../adr/adr-0012-policy-commitment-and-target-public-input.md)、[adr-0013](../../adr/adr-0013-policy-update-api-target-allowlist.md)に従う。
- [Agent Policy Payment Boundary](../../../llm-wiki/wiki/concepts/agent-policy-payment-boundary.md)の秘密境界を維持する。
- story-05-01で確立したCircuit・Prover・Account・API基盤を前提とする。
- Blockchain実行は非forkのローカルAnvil、chain ID `31337`だけに限定する。

## Task

| ID | Task | Status |
| --- | --- | --- |
| [task-05-03-01](../../tasks/story-05-03/task-05-03-01-proof-api-target-input.md) | Proof生成APIのtarget対応 | pending |
| [task-05-03-02](../../tasks/story-05-03/task-05-03-02-payment-client-target-wiring.md) | Payment Client(CLI/MCP)のtarget配線 | pending |
| [task-05-03-03](../../tasks/story-05-03/task-05-03-03-allowed-target-payment-e2e.md) | 許可済み/許可外送金先のE2E検証 | pending |

## 検証結果

未実施。

## Blocked

なし。

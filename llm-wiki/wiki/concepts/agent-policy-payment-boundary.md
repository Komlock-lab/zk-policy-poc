---
title: Agent Policy Payment Boundary
type: concept
tags: [agent, mcp, zk-policy, secrets, autonomous-payment]
sources: [claude-code-mcp, codex-mcp, mcp-typescript-sdk-v2, erc-4337-zk-policy-payment]
updated: 2026-09-05
---

# Agent Policy Payment Boundary

Claude CodeとCodexは自然言語を`recipient`とdecimal `valueWei`からなるTransaction Intentへ変換する。MCP Serverより後ろのProof取得、UserOperation構築、Owner署名、送信、receipt確認は決定論的な処理とし、Agentへ任意署名や任意calldataの能力を公開しない。

## Authorization boundary

- `pay_native`の呼出しには決済ごとの人間承認を要求しない。
- Owner署名は実行権限を、ZK Proofは秘密の支出Policyを満たすことを検証する。
- MCP Toolの自動許可はZK Policy検証を迂回せず、Proof生成またはオンチェーン検証に失敗した支払いは成立しない。
- 1回あたりの上限だけでは連続送金の総額を制限しない。Prompt Injection検証はPhase 5、累積上限はPhase 6の境界とする。

## Secret boundary

- Owner KeyとPolicy Tokenはstdio Server processの環境変数と決済Client内部だけで扱う。
- 秘密値をTool input schema、MCP message、structured output、stdout、診断logへ含めない。
- Toolはreceiptに必要な公開識別子だけを返す。

## Sources

- [[claude-code-mcp]]
- [[codex-mcp]]
- [[mcp-typescript-sdk-v2]]
- [[erc-4337-zk-policy-payment]]

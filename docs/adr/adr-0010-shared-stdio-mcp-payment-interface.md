---
id: adr-0010
type: adr
title: Claude Code・Codex共通stdio MCP決済interface
epic: epic-04
status: accepted
date: 2026-09-05
---

# Claude Code・Codex共通stdio MCP決済interface

## Context

Phase 4ではClaude CodeとCodexの自然言語要求をPhase 3の決定論的UserOperation決済へ接続する。Hostごとの実装差を決済ロジックへ持ち込まず、Agentへ任意署名や任意callを与えない共通境界が必要である。

## Decision

- `apps/payment-mcp`にlocal stdio MCP Serverを1つ実装し、両Hostから利用する。
- `@modelcontextprotocol/server`を`2.0.0`へ固定し、`serveStdio`とZod schemaを使用する。
- 公開Toolは`pay_native(recipient,valueWei)`だけとし、`valueWei`はJSON精度損失を避けるdecimal stringとする。
- Agentは自然言語から構造化Intentを作り、ServerはPhase 3 UserOperation Clientを直接呼ぶ。CLI subprocessや追加の自然言語parserは挟まない。
- ToolはPolicy ID、Policy version、UserOperation hash、bundle transaction hash、成功状態だけを返し、Proofは返さない。
- `.mcp.json`と`.codex/config.toml`で同じServer entrypointをproject scopeへ接続する。

## Alternatives

- Payment CLIをAgentに実行させる案は、引数・出力契約と許可境界がHostのshell判断へ依存するため採用しない。
- Hostごとに別adapterを作る案は、schemaと決済動作がdriftするため採用しない。
- Streamable HTTP Serverは認証、port、process lifecycleが増え、単一machineのPoCに不要なため採用しない。
- free-form intentをServerへ渡す案は、Server内に非決定的解釈を持ち込むため採用しない。

## Consequences

- 両Agentが同一の狭い決済能力と検証済みschemaを利用できる。
- Agentから見える操作はnative token単一送金に限定される。
- 各Host固有のproject設定と実Client smoke testが必要になる。
- remote Agent、HTTP MCP、複数同時送金は対象外となる。

## References

- [[mcp-typescript-sdk-v2]]
- [[claude-code-mcp]]
- [[codex-mcp]]
- [[agent-policy-payment-boundary]]

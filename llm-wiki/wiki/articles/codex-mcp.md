---
title: Codex MCP
author: OpenAI
published: unknown
type: article
source: https://developers.openai.com/codex/mcp
retrieved: 2026-09-05
tags: [codex, mcp, stdio, approvals]
---

# Codex MCP

## TL;DR

Codexはtrusted projectの`.codex/config.toml`からstdio MCP Serverを起動し、公開ToolとTool単位のapproval behaviorを設定できる。

## Key claims

- local stdio Serverとproject-scoped設定をサポートする。
- `enabled_tools`で利用可能なToolを絞れる。
- `approval_mode = "approve"`で対象Toolを自動許可できる。

## Technical details

- `env_vars`は変数名を列挙し、Codexのlocal environmentからServerへ値を転送する。
- Server instructionsでTool横断の制約をHostへ提示できる。
- Phase 4では支出上限内の自律実行を目的に`pay_native`だけを自動許可する。

## Limitations and caveats

- approval設定はTool呼出しを許可するだけで、入力やオンチェーンPolicyを検証しない。
- Phase 4はCodex CLI 0.153.2を検証baselineとする。

## Project relevance

[[agent-policy-payment-boundary]]に従い、CodexへOwner KeyやPolicy TokenをTool dataとして渡さず決済能力だけを公開する。

## Related concepts

- [[agent-policy-payment-boundary]]

## Source

- [Raw clipping](../../raw/articles/codex-mcp.md)
- https://developers.openai.com/codex/mcp

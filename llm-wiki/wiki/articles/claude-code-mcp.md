---
title: Claude Code MCP
author: Anthropic
published: unknown
type: article
source: https://code.claude.com/docs/en/mcp
retrieved: 2026-09-05
tags: [claude-code, mcp, stdio, permissions]
---

# Claude Code MCP

## TL;DR

Claude Codeはproject-scopedなlocal stdio MCP Serverを利用でき、特定Toolをallow ruleへ登録して呼出しごとの確認なしに実行できる。

## Key claims

- `.mcp.json`でTeam共有するstdio Serverを定義できる。
- MCP Toolの使用許可とproject MCP Serverへのworkspace trustは別の境界である。
- stdio Serverは標準入出力をprotocol通信に使用する。

## Technical details

- project scopeのServerは初回に利用者がworkspaceをtrustしてServer登録を受け入れる必要がある。
- `permissions.allow`にはMCP Server名とTool名を限定したruleを設定できる。
- credentialは`.mcp.json`へ直接記録せず環境変数を使用する。

## Limitations and caveats

- allow ruleはAgentがToolを呼ぶ権限を与えるため、Server側のPolicy検証を代替しない。
- Phase 4はClaude Code 2.1.260を検証baselineとする。

## Project relevance

[[agent-policy-payment-boundary]]に従い、Claude Codeは構造化Intentだけを渡し、決済認可はZK Policyへ委ねる。

## Related concepts

- [[agent-policy-payment-boundary]]

## Source

- [Raw clipping](../../raw/articles/claude-code-mcp.md)
- https://code.claude.com/docs/en/mcp

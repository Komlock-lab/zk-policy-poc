---
title: Connect Claude Code to tools via MCP
source: https://code.claude.com/docs/en/mcp
publisher: Anthropic
published: unknown
retrieved: 2026-09-05
---

# Claude Code MCP

## Preserved material

- Claude Codeはlocal stdio MCP Serverをcommandから起動できる。
- project scopeのServerはrepository rootの`.mcp.json`で共有できる。
- `permissions.allow`で特定MCP Toolを通常の呼出しごとの確認なしに許可できる。
- project MCP Server自体の初回承認はworkspace trust境界であり、Tool呼出しの許可とは別である。
- stdio Serverの標準出力はMCP通信専用にする必要がある。

## Capture note

Phase 4のClaude Code接続に必要な仕様をClaude Code 2.1.260で確認した。全文はsourceを参照する。

---
title: MCP TypeScript SDK v2
author: Model Context Protocol
published: unknown
type: article
source: https://ts.sdk.modelcontextprotocol.io/v2/
retrieved: 2026-09-05
tags: [mcp, typescript, stdio, tools]
---

# MCP TypeScript SDK v2

## TL;DR

公式TypeScript SDK v2はZodで検証されるToolとstdio transportを提供し、同一ServerをClaude CodeとCodexから利用できる。

## Key claims

- `registerTool`がTool名、説明、入力schema、handlerを結び付ける。
- `serveStdio`がlocal MCP Hostとのprotocol通信を担当する。
- v2は2026-07-28 specificationのstable lineである。

## Technical details

- Phase 4では`@modelcontextprotocol/server`を`2.0.0`へ固定する。
- Zod schemaでaddressとdecimal wei stringをhandler実行前に検証する。
- stdoutはMCP protocol専用とし、診断は秘密を除去してstderrへ出す。

## Limitations and caveats

- SDKのschema検証だけではchain、EntryPoint、Policy、Proofを検証できない。
- Host固有の設定とTool許可は各Client側で必要になる。

## Project relevance

[[agent-policy-payment-boundary]]の共通Agent adapterを1実装に保つ基盤となる。

## Related concepts

- [[agent-policy-payment-boundary]]

## Source

- [Raw clipping](../../raw/articles/mcp-typescript-sdk-v2.md)
- https://ts.sdk.modelcontextprotocol.io/v2/

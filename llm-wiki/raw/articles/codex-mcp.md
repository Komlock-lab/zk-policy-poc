---
title: Model Context Protocol
source: https://developers.openai.com/codex/mcp
publisher: OpenAI
published: unknown
retrieved: 2026-09-05
---

# Codex MCP

## Preserved material

- Codex CLIはlocal stdio MCP Serverをcommandから起動できる。
- trusted projectでは`.codex/config.toml`にproject-scoped MCP設定を置ける。
- `env_vars`で名前を指定した環境変数だけをstdio Serverへ転送できる。
- `enabled_tools`でToolを限定し、`tools.<tool>.approval_mode = "approve"`でTool単位に自動許可できる。
- MCP ServerのinstructionsはTool横断の制約をHostへ伝える。

## Capture note

Phase 4のCodex接続に必要な仕様をCodex CLI 0.153.2で確認した。全文はsourceを参照する。

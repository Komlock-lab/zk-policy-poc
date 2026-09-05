---
id: task-04-03-01
type: task
title: Codex project設定と自動許可
story: story-04-03
status: done
blocked_by: []
created: 2026-09-05
updated: 2026-09-05
---

# Codex project設定と自動許可

## 目的

Codexが共有Serverの決済Toolだけを追加承認なしに利用できるようにする。

## 作業

- `.codex/config.toml`へproject-scoped stdio Serverを追加する。
- credentialは`env_vars`で名前だけを列挙する。
- `enabled_tools`を`pay_native`へ限定し、Toolの`approval_mode`を`approve`にする。
- Codex CLI 0.153.2で接続状態とTool discoveryを確認する。

## 完了条件

- trusted projectでServerが接続し、決済Tool呼出しで追加承認が発生しない。

## 検証方法

- `codex mcp list`
- Codex Tool discovery smoke test

## 検証結果

- Codex CLI `0.153.2`と公式Config Referenceで`env_vars`、`enabled_tools`、`mcp_servers.payment.tools.pay_native.approval_mode = "approve"`を照合した。
- `codex mcp get payment`: direct Node stdio command、`pay_native`だけのallowlist、credential名だけの転送、startup timeout 30秒、Tool timeout 120秒を表示し、設定読込に成功した。
- `NODE_OPTIONS=--experimental-sqlite pnpm vitest run apps/payment-mcp`: Codex設定検証を含む6 files、18 tests passed。
- 実Codex CLI E2Eで3回ともapproval request eventなしに`pay_native`が実行され、各runは`turn.completed`で完了した。

## Blocked

なし。

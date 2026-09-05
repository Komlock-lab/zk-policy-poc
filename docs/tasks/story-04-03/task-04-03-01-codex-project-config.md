---
id: task-04-03-01
type: task
title: Codex project設定と自動許可
story: story-04-03
status: pending
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

未実施。

## Blocked

なし。

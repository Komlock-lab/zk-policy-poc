---
id: task-04-02-01
type: task
title: Claude Code project設定と自動許可
story: story-04-02
status: pending
blocked_by: []
created: 2026-09-05
updated: 2026-09-05
---

# Claude Code project設定と自動許可

## 目的

Claude Codeが共有Serverの決済Toolだけを追加承認なしに利用できるようにする。

## 作業

- `.mcp.json`へproject-scoped stdio Serverを追加する。
- credential値をcommitせず環境変数参照だけを設定する。
- Claude設定で`pay_native`だけをallowし、他のToolを許可しない。
- Claude Code 2.1.260で接続状態とTool discoveryを確認する。

## 完了条件

- workspace trust後にServerが接続し、決済Tool呼出しで追加承認が発生しない。

## 検証方法

- `claude mcp get zk-policy-payment`
- Claude Code Tool discovery smoke test

## 検証結果

未実施。

## Blocked

なし。

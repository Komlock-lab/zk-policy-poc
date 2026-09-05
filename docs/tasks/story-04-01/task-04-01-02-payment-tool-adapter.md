---
id: task-04-01-02
type: task
title: Policy決済Tool adapter
story: story-04-01
status: pending
blocked_by: [task-04-01-01]
created: 2026-09-05
updated: 2026-09-05
---

# Policy決済Tool adapter

## 目的

構造化IntentをPhase 3決済へ変換する唯一のMCP Toolを提供する。

## 作業

- `pay_native`のaddressとdecimal wei schema、説明、instructionsを定義する。
- Phase 3 UserOperation Clientを直接呼ぶadapterを実装する。
- 公開receiptだけのstructured outputへ変換する。
- raw signing、Proof、任意callを公開しないことをtestする。

## 完了条件

- 有効IntentがPhase 3 Clientへ同値で渡り、公開結果だけを返す。

## 検証方法

- Tool schema unit test
- adapter unit test

## 検証結果

未実施。

## Blocked

なし。

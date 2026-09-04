---
id: task-02-05-01
type: task
title: API接続型Payment Client
story: story-02-05
status: pending
blocked_by: []
created: 2026-09-04
updated: 2026-09-04
---

# API接続型Payment Client

## 目的

Proof APIのresponseを使って既存Account決済を実行できるClientを提供する。

## 作業

- Policy ID、Token、recipient、wei金額を検証してProof APIを呼ぶ。
- responseのPublic Inputとrequest金額を検証する。
- Owner署名TxでAccountの`execute()`を呼ぶ。
- Proof取得失敗時はTxを作成・送信しない。

## 完了条件

- Clientが秘密Policyを扱わず、API Proofで直接Account決済を実行できる。

## 検証方法

- Payment client integration test

## 検証結果

未実施。

## Blocked

なし。

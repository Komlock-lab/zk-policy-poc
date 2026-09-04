---
id: task-02-01-05
type: task
title: EIP-712 Policy登録API
story: story-02-01
status: pending
blocked_by: [task-02-01-02, task-02-01-04]
created: 2026-09-04
updated: 2026-09-04
---

# EIP-712 Policy登録API

## 目的

Owner署名を検証して初回Policyをpending保存し、active化できるAPIを提供する。

## 作業

- Policy context、upsert、activation routeとZod schemaを実装する。
- viemでEIP-712署名者とオンチェーンOwnerを照合する。
- deadline、nonce、Commitment再計算、receipt、calldata、現在値を検証する。
- 初回Tokenをresponseで一度だけ返す。

## 完了条件

- 正しい要求だけがpendingからactiveへ遷移し、各異常系が状態を変更せず拒否される。

## 検証方法

- API unit・integration test

## 検証結果

未実施。

## Blocked

なし。

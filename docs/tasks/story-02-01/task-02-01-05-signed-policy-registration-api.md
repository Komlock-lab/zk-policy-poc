---
id: task-02-01-05
type: task
title: EIP-712 Policy登録API
story: story-02-01
status: done
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

- Service test 6件とHTTP route test 1件が成功した。
- Owner署名、未設定Account、deadline、nonce replay、Commitment、Tx receipt/calldata/current stateの検証と、失敗時の非更新を確認した。

## Blocked

なし。

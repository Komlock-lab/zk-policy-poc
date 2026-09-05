---
id: task-02-05-01
type: task
title: API接続型Payment Client
story: story-02-05
status: done
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

- `pnpm typecheck`: 成功。
- `pnpm test:unit`: 12 files、63 testsが成功した。Payment Client 4 testsでloopback URL制約、zero recipient拒否、strict Zod response検証、Policy ID・送金額・Account Commitmentの照合を確認した。
- `pnpm exec vitest run e2e/policy-payment.test.ts apps/policy-cli/src/pay-with-policy.test.ts apps/policy-cli/src/create-policy.test.ts`: 3 files、9 testsが成功した。Owner署名の`execute()`と、Proof取得拒否時にOwner nonceが変わらずTxが未送信であることを確認した。
- Token再発行がAPI nonceを消費するため、API nonceからPolicy versionを導出せず、署名済みCommitmentから再構築したcalldataを使用するよう既存更新Clientを修正した。

## Blocked

なし。

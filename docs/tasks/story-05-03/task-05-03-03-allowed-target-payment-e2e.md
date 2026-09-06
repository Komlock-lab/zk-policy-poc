---
id: task-05-03-03
type: task
title: 許可済み/許可外送金先のE2E検証
story: story-05-03
status: pending
blocked_by: [task-05-03-02]
created: 2026-09-06
updated: 2026-09-06
---

# 許可済み/許可外送金先のE2E検証

## 目的

許可送金先への送金成功と、上限内であっても許可外送金先への送金が拒否されることを、実際の決済経路とAgent経由の経路で確認する。

## 作業

- `e2e/policy-payment.test.ts`を拡張し、許可送金先0xAAAAへの0.05 ETH送金成功と、許可外0xBBBBへの0.05 ETH送金拒否を確認する。
- `e2e/claude-code-payment.test.ts`または`e2e/codex-payment.test.ts`に、許可外送金先を提案するケースを追加し、`PAYMENT_REJECTED`になり応答へ`allowedTarget`が含まれないことを確認する。

## 完了条件

- AC-1からAC-3(story-05-03)がE2Eで確認できる。

## 検証方法

- `pnpm test:e2e`

## 検証結果

未実施。

## Blocked

なし。

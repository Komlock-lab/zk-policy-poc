---
id: task-05-03-03
type: task
title: 許可済み/許可外送金先のE2E検証
story: story-05-03
status: blocked
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

- `e2e/policy-payment.test.ts`に許可送金先への送金成功に加えて、上限内・許可外送金先(`UNAUTHORIZED_RECIPIENT`)への送金がProof発行段階で422拒否され、残高・nonceが変化しないケースを追加した。
- Claude Code・Codex実agent経由の許可外送金先ケース(`e2e/claude-code-payment.test.ts`/`codex-payment.test.ts`)は、実行に`claude`/`codex` CLIとネットワーク接続が必要で環境変数ゲート(`RUN_CLAUDE_CODE_E2E`/`RUN_CODEX_E2E`)により既定でskipされており、本セッションでは追加のシナリオ実装を見送った。既存の型変更(`allowedTarget`配線)のみ反映し、`pnpm exec tsc --noEmit`でエラーがないことを確認した。
- `pnpm test:e2e`はtask-05-01-04と同じ理由(solc・CRSの取得先が403拒否)で実行できず、追加したシナリオを含め未検証。

## Blocked

- task-05-01-04と同じCRS・solcのネットワーク制限により`pnpm test:e2e`が実行できない。別環境でtask-05-01-04・05-01-07・05-02-02とあわせて実行し、結果を追記する必要がある。

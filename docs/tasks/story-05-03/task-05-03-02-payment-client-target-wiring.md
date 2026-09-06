---
id: task-05-03-02
type: task
title: Payment Client(CLI/MCP)のtarget配線
story: story-05-03
status: done
blocked_by: [task-05-03-01]
created: 2026-09-06
updated: 2026-09-06
---

# Payment Client(CLI/MCP)のtarget配線

## 目的

既存の`recipient`をProof要求の`target`としてそのまま使い、送金先制約を実運用経路に反映する。

## 作業

- `apps/policy-cli/src/pay-with-policy.ts`の`preparePolicyPayment`・`validatePolicyPaymentProof`を3要素Public Inputに更新し、Proof要求へ`recipient`を`target`として渡す。
- `apps/policy-cli/src/pay-with-userop.ts`の`executeUserOp`呼び出しとPublic Input検証を同様に更新する。
- `apps/payment-mcp/src/server.ts`の`pay_native`が失敗時に秘密の`allowedTarget`を応答・ログへ含めないことを確認する(既存の`PAYMENT_REJECTED`方針を維持)。
- 関連するunit test(`pay-with-policy.test.ts`、`pay-with-userop.test.ts`、`server.test.ts`)を更新する。

## 完了条件

- CLI・MCP経由の決済が許可送金先でのみ成功し、許可外送金先では秘密値を露出せずに失敗する。

## 検証方法

- `pnpm exec vitest run apps/policy-cli apps/payment-mcp`

## 検証結果

- `pnpm exec vitest run apps/policy-cli apps/payment-mcp`: 全テスト成功。`pay-with-policy.test.ts`に送金先不一致(`does not match the requested recipient`)のテストを追加した。
- `pnpm exec tsc --noEmit`: エラーなし。
- `pay-with-userop.ts`は`pay-with-policy.ts`の`preparePolicyPayment`を再利用しており、`recipient`をtargetとして渡す配線は共通化されているため個別の追加テストは不要と判断した。
- `payment-mcp`の`pay_native`はproof生成の詳細に関与しないため`server.ts`のコード変更は不要だったが、依存する型変更後も既存テストが全て成功することを確認した。

## Blocked

なし。

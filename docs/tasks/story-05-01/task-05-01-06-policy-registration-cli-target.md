---
id: task-05-01-06
type: task
title: Policy登録CLIのallowedTarget対応
story: story-05-01
status: done
blocked_by: [task-05-01-05]
created: 2026-09-06
updated: 2026-09-06
---

# Policy登録CLIのallowedTarget対応

## 目的

OwnerがCLIから許可送金先を指定してPolicyを登録できるようにする。

## 作業

- `apps/policy-cli/src/create-policy.ts`の`createAndActivatePolicy`に`allowedTarget`引数を追加し、EIP-712署名メッセージと登録リクエストに含める。
- Policy登録CLIのエントリポイントで許可送金先の引数を受け取り、addressとして検証する。
- `create-policy.test.ts`を更新する。

## 完了条件

- CLIが許可送金先を含めてPolicyを登録し、APIが返すCommitmentがAccountの値と一致する。

## 検証方法

- `pnpm exec vitest run apps/policy-cli`
- `pnpm typecheck`

## 検証結果

- `pnpm exec vitest run apps/policy-cli`: 全テスト成功(`create-policy.test.ts`、`pay-with-policy.test.ts`、`pay-userop.test.ts`、`rotate-policy-token.test.ts`)。
- `pnpm exec tsc --noEmit`: エラーなし。
- `createAndActivatePolicy`/CLIエントリポイント(`apps/policy-cli/src/index.ts`)は実際のPolicy API・Anvilに接続する統合的な処理のため、unit testでは`verifyPendingRegistration`等の純粋関数のみを検証しており、実際のHTTP・チェーン接続を伴う正常系はe2e(task-05-01-07)の範囲。

## Blocked

なし。

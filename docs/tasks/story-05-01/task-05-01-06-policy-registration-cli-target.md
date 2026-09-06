---
id: task-05-01-06
type: task
title: Policy登録CLIのallowedTarget対応
story: story-05-01
status: pending
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

未実施。

## Blocked

なし。

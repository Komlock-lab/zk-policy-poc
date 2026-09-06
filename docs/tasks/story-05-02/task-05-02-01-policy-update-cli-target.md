---
id: task-05-02-01
type: task
title: Policy更新CLIのallowedTarget対応
story: story-05-02
status: done
blocked_by: []
created: 2026-09-06
updated: 2026-09-06
---

# Policy更新CLIのallowedTarget対応

## 目的

Ownerが既存Policyの許可送金先(または上限)を更新できるようにする。

## 作業

- `apps/policy-cli/src/update-policy.ts`・`updateAndActivatePolicy`に`allowedTarget`引数を追加する。
- 更新時のEIP-712署名メッセージと登録リクエストに`allowedTarget`を含める。
- `pay-with-policy.test.ts`など関連するCLI unit testを更新する。

## 完了条件

- CLIが許可送金先を変更してPolicyを更新し、新versionのCommitmentがAccountの値と一致する。

## 検証方法

- `pnpm exec vitest run apps/policy-cli`

## 検証結果

- `pnpm exec vitest run apps/policy-cli`: 全テスト成功。
- `pnpm exec tsc --noEmit`: エラーなし。
- `updateAndActivatePolicy`/`apps/policy-cli/src/update-policy.ts`のCLIエントリポイントは実際のPolicy API・Anvil接続を伴うため、正常系の実接続確認はe2e(task-05-02-02、blocked)の範囲。

## Blocked

なし。

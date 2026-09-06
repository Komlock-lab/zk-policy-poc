---
id: task-05-01-05
type: task
title: Policy APIのEIP-712・登録スキーマ拡張
story: story-05-01
status: pending
blocked_by: [task-05-01-02]
created: 2026-09-06
updated: 2026-09-06
---

# Policy APIのEIP-712・登録スキーマ拡張

## 目的

Policy登録APIが`allowedTarget`を署名対象・保存対象として扱い、再計算したCommitmentと照合できるようにする。

## 作業

- `apps/policy-api/src/eip712.ts`の`PolicyUpdate`型に`allowedTarget: address`を追加する。
- `apps/policy-api/src/service.ts`の`RegisterPolicyInput`・`validatePolicyUpdate`に`allowedTarget`を追加し、3引数Commitmentで再計算・照合する。
- `apps/policy-api/src/repository.ts`が扱う暗号化Policy secretへ`allowedTarget`を含める(既存のAES-256-GCM・AAD構成を流用)。
- 関連するAPI unit test(`service.test.ts`、`repository.test.ts`)を更新する。

## 完了条件

- `allowedTarget`を含む署名だけが受理され、値の不一致・zero addressはPolicy状態を変更せずに拒否される。

## 検証方法

- `pnpm exec vitest run apps/policy-api`

## 検証結果

未実施。

## Blocked

なし。

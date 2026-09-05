---
id: task-03-01-02
type: task
title: UserOperation認証とprefund
story: story-03-01
status: done
blocked_by: [task-03-01-01]
created: 2026-09-05
updated: 2026-09-05
---

# UserOperation認証とprefund

## 目的

`ZkPolicyAccount`がEntryPoint v0.8からのOwner署名済みUserOperationだけを認証し、必要なgasをprefundできるようにする。

## 作業

- `IAccount`を直接実装し、immutable EntryPointとconstructor validationを追加する。
- `validateUserOp`をEntryPoint callerだけに制限する。
- `userOpHash`に対するOwner ECDSA署名を検証し、不正署名はrevertせず`SIG_VALIDATION_FAILED`を返す。
- `missingAccountFunds`をEntryPointへ支払う。
- 正常署名、不正署名、caller、prefund、constructor境界のContract testを追加する。

## 完了条件

- Story 03-01のUserOperation validationに関するAC-1、AC-2、AC-5、AC-6、AC-7をContract testで確認できる。

## 検証方法

- `pnpm test:contracts`

## 検証結果

- `pnpm test` 成功: build/typecheck、Circuit 4件、Contract 28件（fuzz・実EntryPoint統合を含む）、unit 68件、E2E 8件。
- 既存Phase 2のPolicy登録・更新・Token再発行・Proof取得・直接決済が成功。

## Blocked

なし。

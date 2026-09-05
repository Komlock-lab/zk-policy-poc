---
id: task-03-01-04
type: task
title: EntryPoint統合とPhase 2回帰
story: story-03-01
status: done
blocked_by: [task-03-01-03]
created: 2026-09-05
updated: 2026-09-05
---

# EntryPoint統合とPhase 2回帰

## 目的

Mock callerだけでなく実EntryPoint v0.8を通したvalidationとexecutionが成立し、Phase 2機能が回帰しないことを確認する。

## 作業

- 実EntryPoint v0.8とAccountを使うContract integration testを追加する。
- PackedUserOperation、Owner署名、nonce、prefund、`handleOps`、Payment eventを検証する。
- Phase 2で追加された全Account deploymentへEntryPoint constructor引数を反映する。
- Policy登録・更新・Owner直接決済の既存Contract、unit、E2Eを実行する。

## 完了条件

- Story 03-01の全受け入れ条件とPhase 2の既存受け入れ条件が自動testで成功する。

## 検証方法

- `pnpm test:contracts`
- `pnpm test:unit`
- `pnpm test:e2e`

## 検証結果

- `pnpm test` 成功: build/typecheck、Circuit 4件、Contract 28件（fuzz・実EntryPoint統合を含む）、unit 68件、E2E 8件。
- 既存Phase 2のPolicy登録・更新・Token再発行・Proof取得・直接決済が成功。

## Blocked

なし。

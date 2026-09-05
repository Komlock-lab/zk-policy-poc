---
id: task-04-04-01
type: task
title: Phase 4品質ゲート
story: story-04-04
status: pending
blocked_by: []
created: 2026-09-05
updated: 2026-09-05
---

# Phase 4品質ゲート

## 目的

両Agentの互換性、秘密境界、architecture、全Phase回帰を確認する。

## 作業

- MCP、Claude Code、Codexの正常系と異常系証跡を照合する。
- schema、Client、Tool自動許可、secret canary、local-only境界を監査する。
- Phase 1から3のbuild、test、benchmarkを再実行する。
- Epic auditを作成しCRITICAL/HIGHを解消する。
- planning validator、Wiki lint、差分検査を実行する。

## 完了条件

- 全quality gateが成功し、auditのCRITICAL/HIGH残件が0件になる。

## 検証方法

- `pnpm test`
- `pnpm benchmark:circuit`
- `node scripts/validate-planning.mjs`
- Wiki lint
- `git diff --check`

## 検証結果

未実施。

## Blocked

なし。

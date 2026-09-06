---
id: task-05-01-07
type: task
title: 初回Policy登録(送金先付き)E2E
story: story-05-01
status: pending
blocked_by: [task-05-01-04, task-05-01-06]
created: 2026-09-06
updated: 2026-09-06
---

# 初回Policy登録(送金先付き)E2E

## 目的

送金先を含むPolicyの初回登録が、非forkのローカルAnvil上でCircuitからAccountまで一貫して動くことを確認する。

## 作業

- `e2e/policy-registration.test.ts`を拡張し、許可送金先を含むPolicyを登録してversion 1がactiveになり、AccountのCommitmentと一致することを確認する。
- 秘密値からの再計算不一致、zero address、非Owner署名の拒否ケースを追加する。

## 完了条件

- AC-1からAC-5(story-05-01)がE2Eまたは対応するunit/contract testで再現・確認できる。

## 検証方法

- `pnpm test:e2e`

## 検証結果

未実施。

## Blocked

なし。

---
id: task-02-03-04
type: task
title: Proof APIテスト
story: story-02-03
status: done
blocked_by: [task-02-03-03]
created: 2026-09-04
updated: 2026-09-04
---

# Proof APIテスト

## 目的

Proof APIの正常系と各拒否境界を自動testで固定する。

## 作業

- 正常Proofをlocal backendで検証する。
- 不正Token、pending、chain不一致、上限超過、ciphertext改ざんを検証する。
- responseへ秘密値や内部errorが含まれないことを確認する。

## 完了条件

- Story 02-03の全受け入れ条件が自動testへ対応する。

## 検証方法

- Story 02-03 API test command

## 検証結果

- `pnpm test`: build・typecheck、Circuit 4、Contract 15（各fuzz 256 runs）、unit 31、E2E 4 testsがすべて成功。
- Story固有testで正常Proof、不正Token、pending、chain不一致、上限超過、ciphertext改ざん、Prover失敗、Public Input不一致を確認。
- API error responseとProof responseを厳密に検証し、秘密値・内部error fieldを返さないことを確認。
- `pnpm benchmark:circuit`: ACIR 12、Brillig 8、Proof 7,232 bytes、生成327 ms。

## Blocked

なし。

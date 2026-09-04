---
id: task-02-03-03
type: task
title: 同期Proof生成API
story: story-02-03
status: pending
blocked_by: [task-02-03-02]
created: 2026-09-04
updated: 2026-09-04
---

# 同期Proof生成API

## 目的

Policy IDとwei金額から検証可能なProofを同期responseで返す。

## 作業

- decimal stringの`valueWei`をZodと`u128`境界で検証する。
- 既存Proverを呼び出してProofを生成する。
- Public Inputの金額、Commitment、順序を再検証してresponseを構築する。
- 上限超過と内部Proof失敗を明示的に処理する。

## 完了条件

- 正常要求へProofとPublic Inputを返し、不正要求ではProofを返さない。

## 検証方法

- Proof route integration test
- local proof verification

## 検証結果

未実施。

## Blocked

なし。

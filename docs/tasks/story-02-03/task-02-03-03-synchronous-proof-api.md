---
id: task-02-03-03
type: task
title: 同期Proof生成API
story: story-02-03
status: done
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

- `pnpm build:circuit`: Noir artifact生成成功。
- `NODE_OPTIONS=--experimental-sqlite pnpm exec vitest run e2e/policy-proof.test.ts`: 1 test成功。0.1 ETHの暗号化Policyから0.01 ETHのUltraHonk Proofを同期生成し、local backend検証成功。
- Unit・API testで`valueWei`のdecimal/u128境界、上限超過、Prover失敗、返却Public Inputの順序・金額・active Commitment再検証を確認。

## Blocked

なし。

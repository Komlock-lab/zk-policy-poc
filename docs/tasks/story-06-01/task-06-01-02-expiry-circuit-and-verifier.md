---
id: task-06-01-02
type: task
title: 有効期間を証明する回路・Prover・Verifier
story: story-06-01
status: done
blocked_by: [task-06-01-01]
created: 2026-09-06
updated: 2026-09-06
---

# 有効期間を証明する回路・Prover・Verifier

## 目的

[story-06-01](../../stories/epic-06/story-06-01-owner-registers-expiring-policy.md)の正常系操作を実現する。

## 作業

circuits/spend-limitとpackages/proverを更新し、v2 Commitment、asset別1回上限、issuedAtからvalidUntilまでの期間を拘束する。他条件のフラグはこのStoryではfalseとして正常系を通す。Verifierを再生成し、サイズと生成時間を計測する。

## 完了条件

秘密Policyとv2公開入力を使う実Proofが検証でき、生成物が再生成可能である。

## 検証方法

pnpm test:circuit; pnpm generate:verifier; pnpm benchmark:circuit

既存コマンドの対象テストと同じharnessを使う。新規テストファイル・fixtureを追加した場合は実行結果に正確なコマンドを記録する。

## 検証結果

2026-09-06: `pnpm test:circuit`成功（既存4 tests、固定65 FieldのTS/Noir既知ベクトル照合を含む）。`pnpm generate:verifier`成功、生成Solidityは手動編集なし。`pnpm benchmark:circuit`成功: 1,119 ACIR opcodes、main Brillig 87、Proof 7,616 bytes、実Proof生成とローカル検証585 ms。`forge inspect --root contracts HonkVerifier deployedBytecode`のbyte数は15,728。`pnpm test`内の再生成・build・回路テストも成功。ログ: `/private/tmp/story01-benchmark.log`、`/private/tmp/story01-full-test.log`。

## Blocked

なし。

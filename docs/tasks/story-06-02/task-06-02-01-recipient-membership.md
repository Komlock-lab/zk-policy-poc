---
id: task-06-02-01
type: task
title: recipient allowlistの回路制約
story: story-06-02
status: done
blocked_by: []
created: 2026-09-06
updated: 2026-09-06
---

# recipient allowlistの回路制約

## 目的

[story-06-02](../../stories/epic-06/story-06-02-owner-updates-recipient-allowlist.md)の正常系操作を実現する。

## 作業

private固定長recipient配列の有効部分への所属を実recipient公開入力で拘束する。フラグfalseの既存native経路を維持する。

## 完了条件

許可recipientを使用した実Proofが生成・検証できる。

## 検証方法

pnpm test:circuit; pnpm generate:verifier; pnpm benchmark:circuit

既存コマンドの対象テストと同じharnessを使う。新規テストファイル・fixtureを追加した場合は実行結果に正確なコマンドを記録する。

## 検証結果

2026-09-06: `pnpm test:circuit`成功（既存4件とrecipient追加・最大16件末尾所属の正常系2件、計6件）。`pnpm generate:verifier`成功。`pnpm benchmark:circuit`成功: 2,606 ACIR opcodes、main Brillig 87、Proof 8,000 bytes、生成・ローカル検証746 ms。`NODE_OPTIONS=--experimental-sqlite pnpm exec vitest run e2e/recipient-policy-update.test.ts`成功（1 test、Aおよび更新後Bに対する実Proofを生成・検証）。秘密recipientの有効長・address域・昇順・重複なし・zero paddingを拘束し、false経路も維持。ログ: `/private/tmp/story02-benchmark.log`、`/private/tmp/story02-recipient-e2e.log`。

## Blocked

なし。

---
id: task-06-03-01
type: task
title: assetルール選択とToken入力の拘束
story: story-06-03
status: done
blocked_by: []
created: 2026-09-06
updated: 2026-09-06
---

# assetルール選択とToken入力の拘束

## 目的

[story-06-03](../../stories/epic-06/story-06-03-user-pays-allowed-erc20.md)の正常系操作を実現する。

## 作業

assetRulesの有効部分から実Token addressに対応する1回上限を選択する回路・Proverを実装する。nativeはzero address、金額はToken最小単位とする。

## 完了条件

nativeとERC-20で別の上限を使用した実Proofが検証できる。

## 検証方法

pnpm test:circuit; pnpm generate:verifier; pnpm benchmark:circuit

既存コマンドの対象テストと同じharnessを使う。新規テストファイル・fixtureを追加した場合は実行結果に正確なコマンドを記録する。

## 検証結果

2026-09-06: `pnpm test:circuit`成功（7 tests）。ERC-20のkind=1、asset=target=Token、invoice=0、recipient所属、選択asset上限を拘束。`pnpm generate:verifier`成功、生成Solidityは手動編集なし。`pnpm benchmark:circuit`成功: 2,619 ACIR opcodes、main Brillig 87、Proof 8,000 bytes、生成・ローカル検証747 ms。

`NODE_OPTIONS=--experimental-sqlite pnpm exec vitest run e2e/erc20-payment.test.ts`成功（1 test）。同じPolicyのnative上限1・Token上限100でnative 1 weiとERC-20 10/20/30最小単位の実Proofを生成し、直接実行・CLI/Alto・MCP/Altoで検証。ログ: `/private/tmp/story03-benchmark.log`、`/private/tmp/story03-erc20-e2e.log`。

## Blocked

なし。

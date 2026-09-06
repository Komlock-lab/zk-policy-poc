---
id: task-06-04-01
type: task
title: Contract allowlistと請求IDの拘束
story: story-06-04
status: done
blocked_by: []
created: 2026-09-06
updated: 2026-09-06
---

# Contract allowlistと請求IDの拘束

## 目的

[story-06-04](../../stories/epic-06/story-06-04-user-pays-allowed-contract.md)の正常系操作を実現する。

## 作業

kind=2、target、recipient、invoiceIdの2つのu128表現を回路に結び付ける。recipientとContractの両allowlistを適用する。

## 完了条件

許可ContractとinvoiceIdで作った実Proofが同じ決済内容で検証できる。

## 検証方法

pnpm test:circuit; pnpm generate:verifier; pnpm benchmark:circuit

既存コマンドの対象テストと同じharnessを使う。新規テストファイル・fixtureを追加した場合は実行結果に正確なコマンドを記録する。

## 検証結果

2026-09-06: `pnpm test:circuit`成功（9 tests）。kind=2でrecipient=target・asset=0を拘束し、recipientとContractの有効なallowlistを同時適用。invoice high/lowはそれぞれu128に拘束し、32 bytesを公開入力9/10へ対応。native/ERC-20はinvoice=0を維持し、Contract条件はkind=2のみへ適用。

`pnpm generate:verifier`成功。`pnpm benchmark:circuit`成功: 4,113 ACIR opcodes、main Brillig 87、Proof 8,000 bytes、生成・ローカル検証915 ms。`NODE_OPTIONS=--experimental-sqlite pnpm exec vitest run e2e/contract-payment.test.ts`成功（1 test、異なる3つのinvoiceを直接・実CLI・実MCP/Altoで実Proof検証）。ログ: `/private/tmp/story04-benchmark.log`、`/private/tmp/story04-contract-e2e.log`。

## Blocked

なし。

---
id: task-06-04-02
type: task
title: 型を固定したContract決済
story: story-06-04
status: done
blocked_by: [task-06-04-01]
created: 2026-09-06
updated: 2026-09-06
---

# 型を固定したContract決済

## 目的

[story-06-04](../../stories/epic-06/story-06-04-user-pays-allowed-contract.md)の正常系操作を実現する。

## 作業

pay(bytes32) payable fixtureとAccountのkind=2経路を実装する。Accountが固定selectorを組み立て、外部入力のraw calldataを受け取らない。

## 完了条件

指定invoiceIdのイベントとnative残高増加を確認できる。

## 検証方法

pnpm test:contracts; pnpm build

既存コマンドの対象テストと同じharnessを使う。新規テストファイル・fixtureを追加した場合は実行結果に正確なコマンドを記録する。

## 検証結果

2026-09-06: `pnpm test`内の`pnpm build`と`pnpm test:contracts`成功。Contract 35 tests（既存32件とContract直接実行・EntryPoint実行・uint128/bytes32 fuzz各256 runs）で15公開入力、invoice両limb、InvoicePaid、receiver残高、native累積枠の共有を確認。

固定interfaceのpay(bytes32) selectorをAccountが構築し、公開raw calldataは受け取らない。Owner認証・Proof検証・状態更新後の外部呼出しを維持。`forge fmt --check contracts/src/ZkPolicyAccount.sol contracts/src/interfaces/IPolicyPaymentReceiver.sol contracts/src/fixtures/PolicyPaymentReceiver.sol contracts/test/ZkPolicyAccount.t.sol`成功。ログ: `/private/tmp/story04-full-test.log`。

## Blocked

なし。

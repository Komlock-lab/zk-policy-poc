---
id: task-02-02-01
type: task
title: Policy version状態遷移
story: story-02-02
status: done
blocked_by: []
created: 2026-09-04
updated: 2026-09-04
---

# Policy version状態遷移

## 目的

同じPolicy IDで新versionを作り、activeとpendingの一意性を維持する。

## 作業

- version採番、pending置換、active切替、superseded化をrepositoryへ追加する。
- 状態遷移とnonce消費をtransactionで実行する。
- 不正遷移と競合をtestする。

## 完了条件

- どの時点でもactiveとpendingがそれぞれ最大1件に保たれる。

## 検証方法

- Repository state-transition test

## 検証結果

`pnpm test:unit`でRepository 6件が成功。versionを`MAX(version)+1`で採番し、nonce消費・旧pendingのsuperseded化・新pending保存を同一transactionで実行すること、active維持、activation時の切替、nonce競合時のrollbackを確認した。

## Blocked

なし。

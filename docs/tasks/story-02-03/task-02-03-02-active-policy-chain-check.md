---
id: task-02-03-02
type: task
title: active Policy読込とオンチェーン確認
story: story-02-03
status: pending
blocked_by: [task-02-03-01]
created: 2026-09-04
updated: 2026-09-04
---

# active Policy読込とオンチェーン確認

## 目的

Proof生成対象を現在のAccount Commitmentと一致するactive versionへ限定する。

## 作業

- active version取得と秘密値復号をserviceへ実装する。
- Account設定状態とCommitmentをRPCで確認する。
- pending、未設定、不一致、復号失敗を分類して拒否する。

## 完了条件

- active metadataとオンチェーン値が一致するときだけ秘密値がProof serviceへ渡る。

## 検証方法

- Active policy service integration test

## 検証結果

未実施。

## Blocked

なし。

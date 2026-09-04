---
id: task-02-03-01
type: task
title: Bearer Token認証
story: story-02-03
status: pending
blocked_by: []
created: 2026-09-04
updated: 2026-09-04
---

# Bearer Token認証

## 目的

Policyに対応するTokenを持つClientだけがProof処理へ進めるようにする。

## 作業

- Authorization headerを厳密にparseする。
- Token hashを一定時間比較し、認証前に秘密値を読み込まない。
- 欠落、不正形式、不一致のresponseを統一する。

## 完了条件

- 正しいTokenだけが認証され、認証失敗からPolicy情報が漏れない。

## 検証方法

- Authentication unit・API test

## 検証結果

未実施。

## Blocked

なし。

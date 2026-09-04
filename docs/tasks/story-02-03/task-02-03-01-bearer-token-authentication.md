---
id: task-02-03-01
type: task
title: Bearer Token認証
story: story-02-03
status: done
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

- `pnpm test:unit`: 10 files、44 tests成功。正しいTokenだけを通し、不正Tokenでは`getActive`、chain照会、Proof生成が呼ばれないことを確認。
- API testでAuthorization欠落、不正scheme、長さ不正をすべて`401 INVALID_POLICY_TOKEN`へ統一したことを確認。

## Blocked

なし。

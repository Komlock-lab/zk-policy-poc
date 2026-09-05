---
id: task-02-01-04
type: task
title: Policy暗号化とToken管理
story: story-02-01
status: done
blocked_by: [task-02-01-03]
created: 2026-09-04
updated: 2026-09-04
---

# Policy暗号化とToken管理

## 目的

秘密PolicyとProof取得権限を平文で永続化せず保存する。

## 作業

- AES-256-GCM暗号化・復号とAADを実装する。
- 256-bit random Tokenを生成しSHA-256 hashだけを保存する。
- tag改ざん、鍵長、AAD不一致、Token照合をtestする。
- 秘密値を含まないerrorとlog境界を定義する。

## 完了条件

- DBに`maxAmount`、`salt`、平文Tokenがなく、改ざんされたciphertextを復号できない。

## 検証方法

- Crypto・Token unit test

## 検証結果

- Crypto・Token unit test 3件が成功し、AES-256-GCM round trip、AAD不一致、ciphertext改ざん、Token hash照合を確認した。
- file-backed DBのbytesを検査し、`maxAmountWei`、`salt`、平文Tokenが含まれないことを確認した。

## Blocked

なし。

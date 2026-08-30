---
id: task-01-01-05
type: task
title: ローカル決済とE2E
story: story-01-01
status: done
blocked_by: [task-01-01-03, task-01-01-04]
created: 2026-08-30
updated: 2026-08-30
---

# ローカル決済とE2E

## 目的

ローカルAnvil上でProof生成からnative token送金までを確認する。

## 作業

- VerifierとAccountをviemでデプロイする。
- Accountへローカルテスト資金を入金する。
- 0.1 ETH上限に対する0.01 ETHのProofを生成して送金する。
- 上限超過時にProofを生成できず送金されないことを確認する。
- 送金先残高の差分を検証する。
- localhost以外のRPC URLとchain ID 31337以外を拒否する。

## 完了条件

- E2Eテストが非forkのローカルAnvilだけを使用して成功する。
- 正常系とStory記載の異常系を検証できる。

## 検証方法

- `pnpm test:e2e`
- `pnpm local:payment`

## 検証結果

- E2E 2件が成功した。
- ローカル決済で受取人残高が`10000000000000000 wei`増加した。
- 上限超過時はProofを生成できず、残高が変化しなかった。

## Blocked

なし。

---
id: task-02-04-01
type: task
title: Token再発行署名とAPI
story: story-02-04
status: done
blocked_by: []
created: 2026-09-04
updated: 2026-09-04
---

# Token再発行署名とAPI

## 目的

Owner署名でProof API Tokenを安全に置換できるようにする。

## 作業

- `PolicyAccessTokenRotation`署名検証を実装する。
- nonce消費とToken hash置換を同じtransactionで行う。
- 新しい平文Tokenを一度だけresponseで返す。
- 不正署名、deadline、replayをtestする。

## 完了条件

- 正しいOwner署名だけがTokenを置換し、失敗時は旧Tokenを維持する。

## 検証方法

- Token rotation API test

## 検証結果

- `PATH="..." pnpm typecheck`: 成功。
- `PATH="..." pnpm test:unit`: 11 files、59 tests成功。正しいOwner署名、期限切れ、不正Owner、nonce replay、pending Policyからの回復、nonceとToken hashの原子的置換を確認した。
- deferred chain/proverを使うservice testで、rotationと競合した旧Tokenによるactive化はcommit時再照合で拒否され、生成中のProofも返却直前再照合で拒否されることを確認した。

## Blocked

なし。

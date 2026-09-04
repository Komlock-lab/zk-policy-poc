---
id: task-02-02-02
type: task
title: Policy更新・確定API
story: story-02-02
status: done
blocked_by: [task-02-02-01]
created: 2026-09-04
updated: 2026-09-04
---

# Policy更新・確定API

## 目的

Owner署名によるPolicy更新とTx確定によるactive切替をAPIで提供する。

## 作業

- Policy upsertを既存Policyの新versionへ対応させる。
- tx receipt、from、to、calldata、status、現在Commitmentを検証する。
- 未確定または不一致Txでは状態を変更しない。
- API errorとintegration testを追加する。

## 完了条件

- 正しいOwner Txだけが新versionをactiveにできる。

## 検証方法

- Policy update API integration test

## 検証結果

`pnpm test:unit`でPolicy Service 12件とAPI route 1件が成功。Owner署名、uint256 nonce、最新pending、receipt status、from、to、calldata、現在Commitmentを検証し、wrong token・未確定・revert・各不一致ではactive/pending状態が変わらないことを確認した。想定Repository conflictだけを409へ変換し、予期しないDB errorは伝播することも確認した。

## Blocked

なし。

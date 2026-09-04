---
id: story-02-04
type: story
title: OwnerがProof API Tokenを再発行する
epic: epic-02
status: approved
depends_on: [story-02-03]
adrs: [adr-0005, adr-0006, adr-0007]
created: 2026-09-04
updated: 2026-09-04
---

# OwnerがProof API Tokenを再発行する

## ユーザーアクション

OwnerはProof API Tokenを再発行し、旧Tokenの利用権限を失効できる。

## 背景

Bearer Tokenの紛失や漏えいに対して、Owner鍵をAPIへ預けずアクセス権限を切り替える手段が必要である。

## スコープ

### 含むもの

- `PolicyAccessTokenRotation`のEIP-712署名
- 新Tokenの一度だけの返却
- Token hashの原子的な置換
- 旧Tokenの即時無効化

### 含まないもの

- 複数同時Token、Token権限種別、定期rotation

## 受け入れ条件

### 正常系

- AC-1 [正常系]: Given active Policyと正しいOwner署名がある / When Tokenを再発行する / Then 新Tokenが一度だけ返され、新TokenでProofを取得できる

### 異常系

- AC-2 [異常系]: Given Token再発行後の旧Tokenがある / When Proofを要求する / Then APIは認証エラーで拒否する
- AC-3 [異常系]: Given Owner以外のToken再発行署名がある / When 再発行を要求する / Then APIはToken hashとnonceを変更せず拒否する
- AC-4 [異常系]: Given 使用済みnonceのToken再発行署名がある / When 同じ要求を再送する / Then APIはreplayとして拒否する

## アーキテクチャ制約

- [epic-02](../../epics/epic-02-policy-management-proof-api.md)と[adr-0005](../../adr/adr-0005-eip712-owner-authorization-and-api-nonce.md)、[adr-0006](../../adr/adr-0006-encrypted-policy-storage-and-proof-token.md)に従う。
- 平文Tokenを永続化またはlog出力しない。

## Task

| ID | Task | Status |
| --- | --- | --- |
| [task-02-04-01](../../tasks/story-02-04/task-02-04-01-token-rotation-api.md) | Token再発行署名とAPI | pending |
| [task-02-04-02](../../tasks/story-02-04/task-02-04-02-token-rotation-cli.md) | Token再発行CLI | pending |
| [task-02-04-03](../../tasks/story-02-04/task-02-04-03-token-rotation-e2e.md) | Token切り替えE2E | pending |

## 検証結果

未実施。

## Blocked

なし。

---
id: story-02-04
type: story
title: OwnerがProof API Tokenを再発行する
epic: epic-02
status: done
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
| [task-02-04-01](../../tasks/story-02-04/task-02-04-01-token-rotation-api.md) | Token再発行署名とAPI | done |
| [task-02-04-02](../../tasks/story-02-04/task-02-04-02-token-rotation-cli.md) | Token再発行CLI | done |
| [task-02-04-03](../../tasks/story-02-04/task-02-04-03-token-rotation-e2e.md) | Token切り替えE2E | done |

## 検証結果

- AC-1: `e2e/policy-token-rotation.test.ts`でOwner署名による再発行responseから新Tokenを1回だけ受け取り、新Tokenで実Proof生成が成功した。初回Token紛失を想定したpending PolicyもAccount contextからCLIで回復・active化できた。
- AC-2: 同E2Eで再発行前の2世代の旧TokenによるProof requestがともに401 `INVALID_POLICY_TOKEN`となった。unit race testで、再発行と競合したactive化・Proof返却も旧Tokenでは拒否された。
- AC-3: 同E2Eとservice unit testでOwner以外の署名が401 `INVALID_OWNER_SIGNATURE`となり、nonceとToken hashが不変であることを確認した。
- AC-4: 同じOwner署名を再送すると409 `POLICY_OR_NONCE_CONFLICT`となり、最初の再発行後のnonceとToken hashが不変であることをE2Eとunit testで確認した。

### Quality gates

- `PATH="..." pnpm test`: 成功。Circuit 4、Contract 15（fuzz各256 runs）、unit 59、非fork Anvil E2E 7 tests。
- `PATH="..." pnpm benchmark:circuit`: 成功。ACIR 12、Brillig 8、Proof 7,232 bytes、生成324 ms。
- `node scripts/validate-planning.mjs`: 43 documents valid。
- `git diff --check`: 成功。

## Blocked

なし。

---
id: story-02-05
type: story
title: OwnerがAPI生成Proofで送金する
epic: epic-02
status: done
depends_on: [story-02-02, story-02-03, story-02-04]
adrs: [adr-0004, adr-0005, adr-0006, adr-0007]
created: 2026-09-04
updated: 2026-09-04
---

# OwnerがAPI生成Proofで送金する

## ユーザーアクション

OwnerはPolicy APIから取得したProofを使い、秘密の支出上限内でAccountからnative tokenを送金できる。

## 背景

Policy登録、更新、秘密保存、Proof APIがPhase 1のオンチェーン決済と一貫して動くことを利用者の操作として検証する必要がある。

## スコープ

### 含むもの

- API接続型Payment Client
- 更新済みactive Policyと再発行済みTokenの利用
- Proof取得、Owner Tx、残高変化のローカルE2E
- Phase 2全体のbuild、test、audit

### 含まないもの

- UserOperation、Bundler、AI Agent、public chain

## 受け入れ条件

### 正常系

- AC-1 [正常系]: Given 0.1 ETHのactive Policyと正しいTokenがある / When OwnerがAPIで0.01 ETHのProofを取得して送金する / Then AccountのProof検証に成功し受取人残高が0.01 ETH増える

### 異常系

- AC-2 [異常系]: Given 0.1 ETHのactive Policyがある / When 1 ETHを送金しようとする / Then APIがProof生成を拒否し受取人残高が変化しない
- AC-3 [異常系]: Given Account更新前のCommitmentに対するProofがある / When Account更新後にそのProofで送金する / Then オンチェーン検証が失敗し受取人残高が変化しない
- AC-4 [異常系]: Given APIのactive CommitmentとAccountが一致しない / When Clientが決済を開始する / Then Proof取得段階で拒否され送金Txを送らない

## アーキテクチャ制約

- [epic-02](../../epics/epic-02-policy-management-proof-api.md)と全ADRに従う。
- Accountは実際の`value`と保存済みCommitmentからPublic Inputを再構築する。
- Blockchain実行は非forkのAnvil chain ID `31337`だけに限定する。

## Task

| ID | Task | Status |
| --- | --- | --- |
| [task-02-05-01](../../tasks/story-02-05/task-02-05-01-api-backed-payment-client.md) | API接続型Payment Client | done |
| [task-02-05-02](../../tasks/story-02-05/task-02-05-02-local-api-payment-e2e.md) | ローカルAnvil統合E2E | done |
| [task-02-05-03](../../tasks/story-02-05/task-02-05-03-phase-2-quality-gate.md) | Phase 2全体の品質ゲート | done |

## 検証結果

- AC-1: `e2e/policy-payment.test.ts`で0.1 ETHの更新済みactive Policyと再発行済みTokenを使い、0.01 ETHのProof取得、Owner署名`execute()`、受取人残高の0.01 ETH増加を確認した。
- AC-2: 同E2Eで1 ETHのProof要求がHTTP 422で拒否され、Owner nonceと受取人残高が不変であることを確認した。
- AC-3: 同E2Eで更新前CommitmentのProofをAccount更新後に送信し、receiptが`reverted`、受取人残高が不変であることを確認した。
- AC-4: 同E2EでAPIのactive CommitmentとAccountを不一致にし、Proof取得がHTTP 409で拒否され、Owner nonceと受取人残高が不変であることを確認した。
- Epic監査修正後の`pnpm test`: Circuit 4、Contract 15、TypeScript unit 68、E2E 8 testsが成功した。
- Epic監査修正後の`pnpm benchmark:circuit`: ACIR 12、Brillig 8、Proof 7,232 bytes、生成322ms。
- `node scripts/validate-planning.mjs`と`git diff --check`: 成功。

## Blocked

なし。

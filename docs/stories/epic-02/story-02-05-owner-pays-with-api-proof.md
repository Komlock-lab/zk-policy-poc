---
id: story-02-05
type: story
title: OwnerがAPI生成Proofで送金する
epic: epic-02
status: approved
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
| [task-02-05-01](../../tasks/story-02-05/task-02-05-01-api-backed-payment-client.md) | API接続型Payment Client | pending |
| [task-02-05-02](../../tasks/story-02-05/task-02-05-02-local-api-payment-e2e.md) | ローカルAnvil統合E2E | pending |
| [task-02-05-03](../../tasks/story-02-05/task-02-05-03-phase-2-quality-gate.md) | Phase 2全体の品質ゲート | pending |

## 検証結果

未実施。

## Blocked

なし。

---
id: story-03-01
type: story
title: DeveloperがERC-4337対応Accountをデプロイする
epic: epic-03
status: in-progress
depends_on: []
adrs: [adr-0008, adr-0009]
created: 2026-09-05
updated: 2026-09-05
---

# DeveloperがERC-4337対応Accountをデプロイする

## ユーザーアクション

DeveloperはOwner、Verifier、EntryPointを指定し、Phase 2互換の決済とERC-4337 UserOperation認証を持つ`ZkPolicyAccount`をローカルへデプロイできる。

## 背景

Bundler経由の決済を実行する前に、既存Accountへ最小のERC-4337 interfaceを追加し、Owner直接Transactionを壊さずにEntryPoint経由の認証と実行を成立させる必要がある。

## スコープ

### 含むもの

- ERC-4337 v0.8 contractsとFoundry dependency
- `IAccount`直接実装、immutable EntryPoint、Owner署名、prefund
- EntryPoint専用`executeUserOp`と共通Policy決済処理
- Account単体testと実EntryPoint統合test
- Phase 2 Contract、deployment、直接決済の回帰確認

### 含まないもの

- Bundler process、ERC-7769 Client、CLI
- Factory、Paymaster、EIP-7702、任意call、batch call
- Policy登録・更新のUserOperation化

## 受け入れ条件

### 正常系

- AC-1 [正常系]: Given EntryPoint v0.8、Verifier、Ownerがある / When Developerが3つをconstructorへ渡す / Then Accountがデプロイされ、Owner、Verifier、EntryPointを正しく返す
- AC-2 [正常系]: Given Accountにgas prefund可能な残高とOwner署名済みUserOperationがある / When EntryPointが`validateUserOp`を呼ぶ / Then signature successを返し、要求されたprefundをEntryPointへ支払う
- AC-3 [正常系]: Given 0.1 ETHのPolicyと0.01 ETHのProofがある / When OwnerがPhase 2の`execute`を通常Transactionで呼ぶ / Then Proof検証に成功し受取人残高が0.01 ETH増える
- AC-4 [正常系]: Given 0.1 ETHのPolicyと0.01 ETHのProofを含むOwner署名済みUserOperationがある / When EntryPointが`executeUserOp`を呼ぶ / Then 実送金額でProofを検証し受取人残高が0.01 ETH増える

### 異常系

- AC-5 [異常系]: Given EntryPoint以外のcallerがある / When `validateUserOp`を呼ぶ / Then Accountがcaller errorでrevertする
- AC-6 [異常系]: Given Owner以外が署名したUserOperationがある / When EntryPointが`validateUserOp`を呼ぶ / Then `SIG_VALIDATION_FAILED`を返し実行されない
- AC-7 [異常系]: Given codeを持たないEntryPoint addressがある / When DeveloperがAccountをデプロイする / Then constructorが拒否する
- AC-8 [異常系]: Given EntryPoint以外のcallerがProof付き決済を持つ / When `executeUserOp`を呼ぶ / Then Accountがcaller errorでrevertし送金しない

## アーキテクチャ制約

- [epic-03](../../epics/epic-03-erc4337.md)の不変条件を維持する。
- [adr-0008](../../adr/adr-0008-erc4337-v08-local-stack.md)、[adr-0009](../../adr/adr-0009-owner-userop-and-zk-proof-separation.md)に従う。
- [ERC-4337 ZK Policy Payment Boundary](../../../llm-wiki/wiki/concepts/erc-4337-zk-policy-payment.md)を技術的根拠として参照する。

## Task

| ID | Task | Status |
| --- | --- | --- |
| [task-03-01-01](../../tasks/story-03-01/task-03-01-01-erc4337-contract-dependencies.md) | ERC-4337 Contract依存とFoundry設定 | done |
| [task-03-01-02](../../tasks/story-03-01/task-03-01-02-userop-validation-and-prefund.md) | UserOperation認証とprefund | done |
| [task-03-01-03](../../tasks/story-03-01/task-03-01-03-entrypoint-policy-execution.md) | EntryPoint専用Policy決済 | done |
| [task-03-01-04](../../tasks/story-03-01/task-03-01-04-entrypoint-contract-integration.md) | EntryPoint統合とPhase 2回帰 | done |

## 検証結果

- `pnpm test`: build/typecheck、Circuit 4件、Contract 28件、unit 68件、E2E 8件が成功。
- AC-1/AC-7: constructorの依存保持とcodeなしEntryPoint拒否をContract testで確認。
- AC-2/AC-5/AC-6: Owner署名・prefund・caller制限・不正署名をContract testで確認。実handleOpsでも不正署名時の送金とnonce更新を拒否。
- AC-3: Phase 2 E2Eで実Proof付き0.01 ETH直接決済を確認。
- AC-4/AC-8: 実EntryPoint handleOpsの決済・Payment event・nonce更新と、非EntryPoint caller拒否を確認。
- 新経路で実送金額改ざん、古いCommitment、送金失敗の拒否を確認。
- ADR 0008/0009への適合と秘密値・公開chain経路の非追加を差分レビュー。CRITICAL/HIGH残件なし。

## Blocked

なし。

---
id: task-03-02-02
type: task
title: Proof付きUserOperation Client
story: story-03-02
status: done
blocked_by: [task-03-02-01]
created: 2026-09-05
updated: 2026-09-05
---

# Proof付きUserOperation Client

## 目的

Phase 2のProof取得・検証後に、Owner署名済みUserOperationを構築してAltoへ送り、結果を確認できるClientを提供する。

## 作業

- Phase 2 Payment ClientからProof取得とstrict response検証を直接決済・UserOperation決済で再利用できる形に分離する。
- viem custom Smart Accountへdeployed Account、EntryPoint v0.8、Owner signerを設定する。
- `executeUserOp`の`callData`を直接指定し、nonce、gas、fee、stub signature、Owner signatureを準備する。
- Account Owner、Account EntryPoint、Bundler supported EntryPoint、chain ID、loopback URLを送信前に照合する。
- `eth_sendUserOperation`と`eth_getUserOperationReceipt`で実行成否を確認する。
- Proof取得失敗、署名不正、calldata改ざん、EntryPoint不一致のunitとintegration testを追加する。

## 完了条件

- Clientが秘密Policyを扱わず、正しいProofとOwner署名だけでUserOperation決済結果を返す。

## 検証方法

- Payment Client unit test
- Bundler Client integration test
- `pnpm typecheck`

## 検証結果

`pnpm test`: TypeScript unit 73件とE2E 18件成功。`pnpm typecheck`成功。

- 共有`preparePolicyPayment`でstrict Proof response、Owner、現在Commitment、実送金額を検証。
- v0.8 raw userOpHash署名、key 0 nonce、gas estimate、stub署名の本署名への置換、receipt成功を実Altoで確認。
- loopback以外、EntryPoint不一致、Proof不正、不正署名を拒否。HTTP redirectも拒否する。

## Blocked

なし。

---
title: EIP-712 Policy Update Authorization
type: concept
tags: [ethereum, eip-712, authorization, replay]
sources: [eip-712]
updated: 2026-09-04
---

# EIP-712 Policy Update Authorization

Policy更新APIはOwnerのEIP-712署名を検証し、署名対象を特定のchain、Account、Policy、Commitmentへ結び付ける。EIP-712自体はreplay protectionを提供しないため、Account単位の単調増加nonceとdeadlineをapplication側で検証する。

## Project baseline

- Domain: `name = ZkPolicy`、`version = 1`、`chainId`、`verifyingContract = account`
- Primary type: `PolicyUpdate`
- Message: `policyId`、`account`、`policyCommitment`、`nonce`、`deadline`
- 署名者はオンチェーンAccountのOwnerと一致させる。
- nonce検証・消費とpending version保存は同じSQLite transactionで行う。

## Security boundary

- `deadline`だけでは有効期間中の再送を防げない。
- Ethereum transaction nonceや将来のERC-4337 nonceとは共有しない。
- APIは送信された`maxAmount`と`salt`からCommitmentを再計算し、署名済みCommitmentとの一致を確認する。

## Sources

- [[eip-712]]

---
id: adr-0005
type: adr
title: EIP-712 Owner認証とAPI nonce
epic: epic-02
status: accepted
date: 2026-09-04
---

# EIP-712 Owner認証とAPI nonce

## Context

APIへOwner秘密鍵を渡さずにPolicy更新を認可し、過去の正しい署名によるPolicy巻き戻しや同一要求の再実行を防ぐ必要がある。

## Decision

- Policy更新とToken再発行をOwnerのEIP-712署名で認可する。
- Domainは`name = ZkPolicy`、`version = 1`、chain ID `31337`、`verifyingContract = account`とする。
- `PolicyUpdate(string policyId,address account,bytes32 policyCommitment,uint256 nonce,uint64 deadline)`を署名対象にする。
- `PolicyAccessTokenRotation(string policyId,address account,uint256 nonce,uint64 deadline)`を別のPrimary Typeとして署名対象にする。
- APIがオンチェーンAccountのOwnerを読み、復元した署名者との一致を検証する。
- Account単位の単調増加API nonceをSQLiteで管理し、検証・消費・状態変更を同じtransactionで行う。
- Ethereum Tx nonceおよび将来のERC-4337 nonceとは共有しない。

## Alternatives

- deadlineだけを使う案は、有効期間内のreplayを防げないため採用しない。
- random nonceを使用済み集合で管理する案は、単調増加nonceより状態と次値が分かりにくいため採用しない。
- EthereumまたはERC-4337 nonceを共有する案は、異なる実行境界を密結合にするため採用しない。

## Consequences

- 同じ署名は一度だけ使用でき、古いPolicyへの巻き戻しを防げる。
- Clientは署名前にAPIから現在のPolicy IDとnonceを取得する必要がある。
- API transaction競合時は一方だけが成功し、もう一方は新しいnonceで署名し直す。

## References

- [epic-02](../epics/epic-02-policy-management-proof-api.md)
- [EIP-712 Policy Update Authorization](../../llm-wiki/wiki/concepts/eip-712-policy-update-authorization.md)

---
id: adr-0013
type: adr
title: Policy Update APIのallowedTarget対応
epic: epic-05
status: accepted
date: 2026-09-06
---

# Policy Update APIのallowedTarget対応

## Context

adr-0012はPrivate Policyへ`allowedTarget`を追加し、Circuit Public Inputへ`target`を追加すると決めた。adr-0005が定めた`PolicyUpdate` EIP-712型とadr-0007が定めたProof生成APIは、この新しい秘密値と新しいPublic Inputをまだ扱えない。

## Decision

- `PolicyUpdate` EIP-712型に`allowedTarget: address`を追加する。署名対象は`policyId`、`account`、`allowedTarget`、`policyCommitment`、`nonce`、`deadline`とする。
- Policy登録・更新APIのrequest bodyへ`allowedTarget`を追加し、`maxAmountWei`・`salt`・`allowedTarget`から再計算したCommitmentが署名対象の`policyCommitment`と一致することをサーバ側で検証する。
- `allowedTarget`は`maxAmountWei`・`salt`と同じ暗号化Policy secretへ含め、既存のAES-256-GCM暗号化・AAD構成(adr-0006)をそのまま使う。
- Proof生成API(`POST /v1/policies/:policyId/proofs`)のrequestへ`target`(送金予定の送金先address)を追加する。APIはPrivate Policyの`allowedTarget`と一致するかを判定せず、Circuitへそのまま渡す。一致検証はCircuitの制約に委譲する。
- Proof responseの`publicInputs`は`[value, target, policyCommitment]`の3要素になる。

## Alternatives

- APIが`target`と`allowedTarget`の一致をProof生成前に判定してエラーを返す案は、判定ロジックをCircuitとAPIの2箇所に重複させるため採用しない。Circuitでの制約で十分にfail closedであり、APIは早期に拒否したい場合の最適化に過ぎない。
- `allowedTarget`を`PolicyUpdate`とは別の署名メッセージにする案は、Policy全体を1つの原子的な更新操作として扱う既存方針(adr-0004)と矛盾するため採用しない。

## Consequences

- 既存の`PolicyUpdate`署名を使うClient(policy-cli)はallowedTargetを含む新しい型で再署名する必要があり、旧署名は型不一致で拒否される。
- Proof発行時にAPIが`target`と`allowedTarget`の不一致を事前に弾かない場合、Circuit実行(witness計算)が失敗しProof生成APIが500系で失敗する。呼び出し元はこれを許可外送金先として扱う。

## References

- [epic-05](../epics/epic-05-target-allowlist-payment.md)
- [adr-0005](adr-0005-eip712-owner-authorization-and-api-nonce.md)
- [adr-0006](adr-0006-encrypted-policy-storage-and-proof-token.md)
- [adr-0007](adr-0007-local-synchronous-policy-proof-api.md)
- [adr-0012](adr-0012-policy-commitment-and-target-public-input.md)
- [EIP-712 Policy Update Authorization](../../llm-wiki/wiki/concepts/eip-712-policy-update-authorization.md)
- [Local Policy Secret Storage](../../llm-wiki/wiki/concepts/local-policy-secret-storage.md)

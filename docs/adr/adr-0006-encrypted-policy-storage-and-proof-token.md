---
id: adr-0006
type: adr
title: 秘密Policy暗号化とProof API Token
epic: epic-02
status: accepted
date: 2026-09-04
---

# 秘密Policy暗号化とProof API Token

## Context

Proof APIは秘密の上限とsaltを永続化する一方、DB fileの取得だけで秘密値やProof取得権限が漏れないようにする必要がある。

## Decision

- `maxAmount`と`salt`をAES-256-GCMで暗号化してSQLiteへ保存する。
- 32-byte keyはbase64環境変数から取得し、DBへ保存しない。
- recordごとに12-byte random IVを生成し、16-byte authentication tagを保存する。
- Policy IDとversionをAADにしてciphertextの別recordへの差し替えを検出する。
- 初回Policy作成時に256-bit random Bearer Tokenを一度だけ返し、DBにはSHA-256 hashだけを保存する。
- Proof取得とactive化にはPolicy Tokenを要求し、Owner署名でTokenを再発行できるようにする。
- 秘密値、暗号鍵、Owner秘密鍵、平文Tokenをlogへ出力しない。

## Alternatives

- SQLiteへの平文保存は秘密Policyの漏えい範囲が大きいため採用しない。
- ProofごとのOwner署名は自動実行を妨げるため採用しない。
- 認証なしのProof APIは上限推測oracleと計算資源濫用を許すため採用しない。
- KMSやPostgreSQLはローカルPoCに過剰なため採用しない。

## Consequences

- DB fileだけでは秘密Policyと平文Tokenを復元できない。
- 環境変数の暗号鍵が漏れると全Policyが復号可能である。
- Token紛失時はOwner署名による再発行が必要になる。
- KMS、鍵rotation、backup encryptionは後続範囲となる。

## References

- [epic-02](../epics/epic-02-policy-management-proof-api.md)
- [Local Policy Secret Storage](../../llm-wiki/wiki/concepts/local-policy-secret-storage.md)

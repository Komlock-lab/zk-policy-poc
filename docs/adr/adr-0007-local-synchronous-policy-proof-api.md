---
id: adr-0007
type: adr
title: ローカル同期Policy・Proof API構成
epic: epic-02
status: accepted
date: 2026-09-04
---

# ローカル同期Policy・Proof API構成

## Context

既存TypeScriptのPolicyとProverを再利用し、Phase 2の状態・認証・Proof生成境界を最小の運用構成で検証する必要がある。

## Decision

- `apps/policy-api`をFastify `5.12.1`、Zod、viemで実装する。
- Node.js runtimeを`>=22.13 <25`とし、組み込み`node:sqlite`を使用する。
- repository固定のNode.js `23.3.0`では`--experimental-sqlite`を明示する。
- APIは単一process、単一file-backed databaseで動かし、testでは`:memory:`を使用する。
- Proof生成は同期HTTP request内で実行し、ProofとPublic Inputを同じresponseで返す。
- APIは`127.0.0.1`へbindし、非forkのAnvil chain ID `31337`だけへ接続する。
- Handlerはtransport処理に限定し、署名検証、状態遷移、暗号化、chain照会、Proof生成をserviceへ分離する。

## Alternatives

- Node標準HTTPだけを使う案は、routing、request制限、error整形を独自実装する範囲が増えるため採用しない。
- 非同期Proof JobはPhase 1の生成時間に対して運用状態が増えるため採用しない。
- PostgreSQLと複数processはPhase 2のローカル検証に不要なため採用しない。
- 任意RPC対応はpublic chain誤操作の境界を広げるため採用しない。

## Consequences

- API requestだけでProofを取得でき、Client実装が単純になる。
- SQLiteとProof生成が同期処理なので、水平分散や高負荷用途には適さない。
- Node.js最低versionを22.13へ引き上げる必要がある。
- Node.js 23系でflagなしに移行する場合は23.4以降へ更新する必要がある。

## References

- [epic-02](../epics/epic-02-policy-management-proof-api.md)
- [Node.js SQLite](../../llm-wiki/wiki/articles/node-sqlite.md)
- [Noir and Barretenberg Toolchain](../../llm-wiki/wiki/concepts/noir-barretenberg-toolchain.md)

---
id: adr-0008
type: adr
title: ERC-4337 v0.8ローカル実行基盤
epic: epic-03
status: accepted
date: 2026-09-04
---

# ERC-4337 v0.8ローカル実行基盤

## Context

Phase 3では既存のZK Policy AccountをERC-4337へ接続し、UserOperationをBundler経由でローカル実行する必要がある。EntryPoint、Account contracts、Bundler、Clientのversionが一致し、非forkのAnvil上で再現可能に起動できる構成が必要である。

2026-09-04時点で公式`@account-abstraction/contracts`の安定版は`0.8.0`、`0.9.0`はRCである。AltoはEntryPoint v0.6、v0.7、v0.8を明示的にサポートしている。

## Decision

- EntryPointとAccount interfaceはERC-4337 v0.8へ固定する。
- `@account-abstraction/contracts`は`0.8.0`、Altoは`0.0.21`へ固定し、Phase 2で導入済みのviem `2.37.3`を維持する。
- 非forkのAnvil chain ID `31337`へEntryPoint v0.8をローカルdeployし、そのaddressをAccount、Client、Altoへ明示的に渡す。
- ClientはviemのAccount Abstraction APIでUserOperationを構築し、ERC-7769 JSON-RPCでAltoへ送信する。
- Phase 3では既にdeploy済みの`ZkPolicyAccount`だけを対象にし、Factory、`initCode`、counterfactual deploymentを実装しない。
- Account自身のnative token残高からEntryPointへprefundし、Paymasterを使用しない。
- blockchainとBundlerは`127.0.0.1`だけへbindし、public networkへ接続しない。

## Alternatives

- EntryPoint v0.9は公式実装の最新releaseだが、contracts npm packageがRCであり、Altoの明示的な対応範囲外なので採用しない。
- v0.7は安定した実装があるが、新規PoCで1世代前を選ぶ理由がないため採用しない。
- Bundlerをプロジェクト内に独自実装する案は、mempool、simulation、gas estimation、RPC互換性の実装範囲がPhase 3を超えるため採用しない。
- Paymasterでgasを負担する案は、署名、deposit、stake、追加の失敗境界が増えるため後続範囲とする。

## Consequences

- 安定版contractsと対応が明示されたBundlerでローカルE2Eを構築できる。
- Phase 2のviem依存を更新せず、既存API、CLI、E2Eの回帰リスクを増やさない。
- UserOperation送信前にAccountへ送金額とgas prefundの両方を入金する必要がある。
- v0.9固有機能は利用できず、将来のversion更新は別の設計変更になる。
- Accountの初回deployは従来Transactionで行い、初回UserOperationによるdeployは検証しない。

## References

- [[erc-4337]]
- [[erc-7769]]
- [account-abstraction releases](https://github.com/eth-infinitism/account-abstraction/releases)
- [Alto](https://github.com/pimlicolabs/alto)

---
id: adr-0011
type: adr
title: ZK Policyによる自律決済認可と秘密情報の隔離
epic: epic-04
status: accepted
date: 2026-09-05
---

# ZK Policyによる自律決済認可と秘密情報の隔離

## Context

このPoCの目的は、人間が決済ごとに承認する代わりにSmart Accountが秘密Policyを強制することである。一方、UserOperation署名に必要なOwner KeyとProof API TokenをAgentのmodel contextやTool dataへ公開してはならない。

## Decision

- `pay_native`はClaude CodeとCodexの両方で呼出しごとの人間承認なしに実行可能にする。
- Claude CodeはTool限定allow rule、Codexは`enabled_tools = ["pay_native"]`とTool単位の`approval_mode = "approve"`を使用する。
- project MCP Serverへの初回workspace trustはinstall境界として残し、個々の決済承認とは扱わない。
- Owner KeyとPolicy TokenはHostからstdio Serverへ名前を限定した環境変数で渡し、決済Client内部だけで使用する。
- credentialを持つHostではClaude CodeのBashをdenyし、Codexのshell Toolを無効化して、modelがHost環境を参照する能力を公開しない。
- Tool input、MCP response、stdout、diagnostic log、Agent transcriptへ秘密値またはProofを含めない。
- MCP Serverはraw signing、Proof取得、任意calldata、Policy更新のToolを公開しない。
- Proof APIとAccountが拒否したIntentをMCPまたはHost設定で迂回しない。

## Alternatives

- 毎回人間承認する案はPolicyによる自律制御を検証するPhase 4の目的と矛盾するため採用しない。
- Owner KeyをTool引数へ渡す案はmodel contextとtranscriptへ秘密を露出するため採用しない。
- Agent自身へraw signing capabilityを与える案はPolicy対象外の署名を可能にするため採用しない。
- 別signer daemonは秘密境界を強化できるが、認証とprocess運用を増やすためlocal PoCでは採用しない。

## Consequences

- Agentは人間を待たず、ZK Policyを満たす決済を完了できる。
- MCP Server processはOwner Keyを扱う高権限境界となり、出力とerrorを厳格に制限する必要がある。
- payment-enabled project設定ではClaude CodeのBashとCodexのshellを開発用途に使用できない。コード変更を行うsessionとはcredentialを持つ決済sessionを分離する。
- 1回上限内の連続送金は可能であり、累積上限を導入するPhase 6まで残存リスクとなる。
- Prompt Injectionを含む包括的な攻撃検証はPhase 5で行う。

## References

- [[agent-policy-payment-boundary]]
- [adr-0009](adr-0009-owner-userop-and-zk-proof-separation.md)
- [epic-03](../epics/epic-03-erc4337.md)

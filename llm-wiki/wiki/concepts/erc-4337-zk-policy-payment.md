---
title: ERC-4337 ZK Policy Payment Boundary
type: concept
tags: [ethereum, erc-4337, zk-policy, smart-account, bundler]
sources: [erc-4337, erc-7769]
updated: 2026-09-04
---

# ERC-4337 ZK Policy Payment Boundary

ERC-4337のOwner認証とZK支出Policy検証は異なる責務である。Accountはvalidation段階でOwnerのUserOperation署名とEntryPoint callerを検証し、execution段階でcall dataに含まれる送金先、実送金額、Proofを検証してから送金する。

## Protocol baseline

- ClientはEntryPointからnonceを取得してUserOperationを構築する。
- Owner署名はUserOperation、chain ID、EntryPointへ結び付く。
- BundlerはUserOperationをsimulationしてからmempoolへ受理する。
- EntryPointだけがAccountのERC-4337 execution経路を呼び出せる。
- Accountはcall dataの実送金額からZK Public Inputを再構築する。

## Project boundary

- Policy APIは`valueWei`に対するProofを返し、UserOperationやBundlerを扱わない。
- ERC-4337 clientはProof取得、UserOperation構築、Owner署名、Bundler送信、receipt確認を調停する。
- CircuitはERC-4337の型、nonce、gas、署名を入力に含めない。
- Paymaster、counterfactual deployment、EIP-7702、public networkは別途明示的に採用しない限りPhase 3へ含めない。

## Sources

- [[erc-4337]]
- [[erc-7769]]

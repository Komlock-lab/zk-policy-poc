---
id: adr-0013
type: adr
title: Token・Contract allowlistと型付き決済
epic: epic-06
status: accepted
date: 2026-09-06
---

# Token・Contract allowlistと型付き決済

## Context

現在は空calldataのnative送金しかなく、Contract allowlistの検証には対象となる実呼び出しを定義する必要がある。

## Decision

2026-09-06のユーザー指示「いまの案でプランニング、実装して」により承認。

- native送金、標準ERC-20 transfer、nativeを支払う型付きContract決済の3種別を実装する。
- pay_native({recipient,valueWei,validUntil?})、pay_erc20({token,recipient,amount,validUntil?})、pay_contract({contract,invoiceId,valueWei,validUntil?})を公開する。amountは最小単位のdecimal string。
- Contract決済はpay(bytes32 invoiceId) payableに固定する。ローカルfixtureが受領額とinvoiceIdをイベントに記録する。任意calldataやselectorはAgentへ公開しない。
- native送金はrecipient allowlist、ERC-20送金はrecipientとToken allowlist、Contract決済は受領ContractをrecipientとしてrecipientとContract allowlistを適用する。Contract決済のassetはnative。
- 全種別でasset別1回上限・日次上限を適用する。Contract決済のrecipientはContractそのもの。
- Accountが実行する引数から公開入力を構築する。Proof用に別の送金先や金額を受け取らない。
- ERC-20はAccount自身がtransferを呼ぶ。approve、transferFrom、fee-on-transfer、rebase等は対象外。
- Owner直接実行とEntryPoint経由は共通の内部処理へ集約する。Owner署名とProof検証の責務分離は継続する。
- MCP設定のTool限定許可を3つの決済Toolへ拡張し、両Agentに同じschemaとClientを使わせる。

## Alternatives

任意Contract callは用途が広いが支出額や実受領者の一般的な解析が必要になる。Token allowlistの登録だけでは実際のToken決済を観測できないため、標準transferまで含める。

## Consequences

Contract対応は固定された決済用途に限られる。将来のswap等は別の実行種別・支出定義が必要になる。

## References

- [epic-06](../epics/epic-06-multi-policy.md)
- [既存Policy lifecycle](adr-0004-policy-lifecycle-and-commitment-update.md)
- [既存認可・秘密境界](adr-0011-autonomous-policy-authorization-and-secret-boundary.md)
- [公開・秘密入力](../../llm-wiki/wiki/concepts/noir-public-and-private-inputs.md)
- [ERC-4337決済境界](../../llm-wiki/wiki/concepts/erc-4337-zk-policy-payment.md)

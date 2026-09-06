---
id: adr-0014
type: adr
title: UTC日次・資産別のオンチェーン累積支出
epic: epic-06
status: accepted
date: 2026-09-06
---

# UTC日次・資産別のオンチェーン累積支出

## Context

累積上限には実行済み支出の状態が必要である。Proof生成回数と決済回数を混同せず、資産単位の違いも維持する必要がある。

## Decision

2026-09-06のユーザー指示「いまの案でプランニング、実装して」により承認。

- 期間はUTCの固定1日とし、dayId = floor(block.timestamp / 86400)で定義する。
- Accountがasset別にlastDayとspentを保持する。dayIdが異なるときの有効spentBeforeは0とする。
- 回路は公開spentBefore + amountが秘密dailyLimit以下であることを証明する。加算と保存はu128の金額域で揃える。
- APIはAccountから現在のdayIdとspentBeforeを取得する。Accountは実行時に現在値から同じ公開入力を構築する。
- Proof確認後、外部決済呼出し前に累積額を更新し、決済と同一transactionで確定する。
- native送金とnative Contract決済は同じasset枠を共有する。ERC-20はToken address別に計上する。gasやEntryPoint prefundは含めない。
- Policy versionやCommitmentの更新ではspentを初期化しない。allowlistから一度外して戻したassetも当日実績を引き継ぐ。
- ローカルPoCではreceiptを待って次のProofを取得する逐次実行とする。同時送信・自動再証明・retryは対象外。
- 正常系は同日2回、日付変更後の決済、Policy更新後の累積引継ぎで確認する。

## Alternatives

Off-chain集計だけではAccountが累積実績を参照できない。秘密状態Commitment方式は公開量を抑えられるが状態遷移証明を増やす。ローリング24時間は履歴管理を要する。

## Consequences

日付と資産別累積額は公開され、dailyLimit自体は秘密に残る。Proofの作成時と実行時の状態を一致させる必要がある。資産間換算は行わない。

## References

- [epic-06](../epics/epic-06-multi-policy.md)
- [既存Policy lifecycle](adr-0004-policy-lifecycle-and-commitment-update.md)
- [既存認可・秘密境界](adr-0011-autonomous-policy-authorization-and-secret-boundary.md)
- [公開・秘密入力](../../llm-wiki/wiki/concepts/noir-public-and-private-inputs.md)
- [ERC-4337決済境界](../../llm-wiki/wiki/concepts/erc-4337-zk-policy-payment.md)

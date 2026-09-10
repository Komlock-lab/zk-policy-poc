---
id: adr-0012
type: adr
title: 複数条件を単一Commitmentへ合成する
epic: epic-06
status: accepted
date: 2026-09-06
---

# 複数条件を単一Commitmentへ合成する

## Context

1 Accountに1 Policy ID・active versionという既存管理を維持し、複数条件の意味と回路の入力サイズを固定する必要がある。

## Decision

2026-09-06のユーザー指示「いまの案でプランニング、実装して」により承認。

- 複数ポリシーを「1つのPolicyに含む複数条件のAND」と定義する。ORや優先順位は導入しない。
- schemaVersion = 2をCommitmentに含め、全秘密条件とsaltをPoseidon2で固定する。
- allowlistは最大16 recipient、8 asset、16 contractの固定長配列と有効長で表現する。有効部分だけを照合し、未使用部分はzeroで正規化する。
- addressは160bit整数、金額はu128、時刻はu64とする。invoiceIdはbytes32を2つのu128に分割する。
- 1回上限はasset別とし、既存maxAmountWeiはnativeのasset ruleへ対応させる。
- 条件の段階導入はCommitmentに含むrecipientEnabled、contractEnabled、dailyEnabledで表現する。期限とassetRulesによる1回上限・対応asset制限は常時有効。その他はOwnerが有効化できる。最終E2Eは全条件を有効にする。
- maxValiditySecondsを秘密Policyに含め、公開issuedAtとvalidUntilの差が範囲内であることを回路で証明する。AccountはissuedAt以上validUntil以下のblock.timestampでのみ実行する。
- CLIで既存のnative上限だけ指定する経路には期限300秒の初期値を与える。Clientは最新block timestampをissuedAtとし、validUntil省略時はissuedAt + 300秒を補完する。より短い有効期間のPolicyを使う場合は明示したvalidUntilを使う。APIは秘密Policyの許容範囲内であることを証明する。
- Noir 1.0.0-beta.26、bb 5.2.0と現在の依存pinを維持する。新回路に合わせてVerifierと公開入力定義を再生成する。
- 新Accountをローカル再deployして検証する。既存Account・DBの自動移行は実装しない。Phase 1〜4のnative操作は新しいfixtureで回帰確認する。

### 正規化とCommitment

- Policyの正規化順序はschemaVersion、maxValiditySeconds、recipientEnabled、recipientCount、recipients[16]、assetCount、assets[8]の各(asset,maxAmount,dailyLimit)、contractEnabled、contractCount、contracts[16]、dailyEnabled、saltとする。配列はaddress昇順・重複なしとし、有効長の後をzeroで埋める。
- 以上のField列を既存Poseidon2と同じ実装系列でhashする。ハッシュに渡す実要素数をTSとNoirで一致させ、既知ベクトルで照合する。
- 既存maxAmountWeiのみのPolicyはnative asset ruleを1件作り、その他の条件フラグをfalseにする。maxValiditySecondsは300。使用しないdailyLimit・allowlistはzeroで正規化する。
- native kindは0、ERC-20は1、Contract決済は2。nativeではtarget=recipient、asset=0、invoiceId=0。ERC-20ではtarget=asset=Token address、invoiceId=0。Contract決済ではtarget=recipient=Contract address、asset=0とする。
- 秘密フラグで日次条件を無効にしていてもAccountは実支出を計上する。後の有効化・Policy更新で当日の支出を失わない。

### 公開入力の順序

全要素を32-byte Field表現でVerifierへ渡す。Circuitでは記載した整数域・address域に拘束する。

| Index | 名前 | 型・取得元 |
| --- | --- | --- |
| 0 | schemaVersion | 定数2 |
| 1 | chainId | u64、block.chainid |
| 2 | account | 160bit address、address(this) |
| 3 | policyCommitment | Field、Accountの現在値 |
| 4 | kind | u8、実行種別0/1/2 |
| 5 | recipient | 160bit address、実受領先 |
| 6 | asset | 160bit address、native=0またはToken |
| 7 | amount | u128、実送金額・Token最小単位 |
| 8 | target | 160bit address、実呼出し先 |
| 9 | invoiceIdHigh | u128、bytes32の上位128bit |
| 10 | invoiceIdLow | u128、bytes32の下位128bit |
| 11 | issuedAt | u64、決済context |
| 12 | validUntil | u64、決済context |
| 13 | dayId | u64、実行block.timestamp / 86400 |
| 14 | spentBefore | u128、Accountの当日・当該assetの累積 |

APIはblock番号を固定して日次状態を読む。Accountは実行時の状態を使う。

## Alternatives

個別Proofを条件ごとに検証する方式は配線と複数Verifierを増やす。Merkle allowlistは大規模リストに向くが、このPoCでは固定長比較を提案する。

## Consequences

固定長の上限が生じる。回路・生成Verifier・API・Clientの公開入力仕様を一体で更新する必要がある。既存の2公開入力Proofとのバイナリ互換性は維持しない。

## References

- [epic-06](../epics/epic-06-multi-policy.md)
- [既存Policy lifecycle](adr-0004-policy-lifecycle-and-commitment-update.md)
- [既存認可・秘密境界](adr-0011-autonomous-policy-authorization-and-secret-boundary.md)
- [公開・秘密入力](../../llm-wiki/wiki/concepts/noir-public-and-private-inputs.md)
- [ERC-4337決済境界](../../llm-wiki/wiki/concepts/erc-4337-zk-policy-payment.md)

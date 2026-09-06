# Threat model

この文書は [`zk-bound`](https://github.com/br-to/zk-bound) の脅威モデルを、
Safe Module を除いて本リポジトリの実行境界へ写したものである。
Circuit と Account の詳細は [ADR-0012](../adr/adr-0012-composite-policy-schema.md)
と [ADR-0002](../adr/adr-0002-authorization-and-policy-boundary.md) を正本とする。

## 保護対象

- Smart Account が保有する資金
- Owner の権限
- 秘密 policy（上限、allowlist、dailyLimit、salt）
- Proof Token と Policy 暗号鍵
- proof を作る user-controlled prover environment

## Trust assumptions

- Account、verifier、circuit の deploy 済みコードが正しい。
- Owner と policy prover environment は侵害されていない。
- Policy API の暗号鍵と Token 保管は Host 側で守られている。
- chain の block timestamp は通常の Ethereum の範囲で信頼する。

## 攻撃者の能力

- agent に prompt injection を与え、任意の決済を提案させる。
- agent runtime を侵害し、proposal の改ざん・再送を行う。
- public proof、transaction、event を収集して replay を試みる。
- on-chain data から policy の内容を推測しようとする。
- Policy API の nonce replay や Token 盗用を試みる。

## 期待する防御

| 攻撃 | 必要な防御 | 受入条件 |
| --- | --- | --- |
| attacker 宛の全額送金 proposal | value / recipient / asset / contract constraint | proof を生成できない、または Account が実行しない |
| 正常 proof の別操作への転用 | complete transaction binding | chainId、account、kind、recipient、asset、amount、target、invoice、issuedAt、validUntil の変更で revert |
| 正常 proof の replay | account + chain ID + validity window + daily spend | 同じ proof の再実行が revert する |
| expiry 後の送信 | on-chain timestamp check | `block.timestamp` が `issuedAt`〜`validUntil` の外なら revert |
| policy の復元 | hiding commitment | policy plaintext が event、calldata、public input にない |
| policy 設定の乗っ取り | Owner authorization | 任意 EOA／agent が Commitment 変更や API 更新できない |

`value`、recipient、target、kind、invoice、時刻、dayId、spentBefore は public である。
上限値そのものは隠すが、観測された value から下限を推測できる。
privacy claim はこの範囲を超えてはならない。

zk-bound では replay を Safe ごとの module nonce で防いだ。
本リポジトリでは実行後に `spentBefore` が更新されるため、同じ public input の
proof は再実行できない。Off-chain の Policy 更新 replay は
[ADR-0005](../adr/adr-0005-eip712-owner-authorization-and-api-nonce.md)
の API nonce で防ぐ。

## PoC の対象外

- prover device の malware と秘密 policy の窃取
- Owner key の漏えい
- Account、verifier、circuit の実装バグ
- MEV、censorship、chain reorg
- allowlisted contract 自体が悪意を持つ場合の事業上のリスク
- Phase 5 で予定していた包括的な攻撃検証（roadmap 上スキップ）

authorization 境界は fail closed とする。検証失敗を warning や
permissive fallback に変えない。

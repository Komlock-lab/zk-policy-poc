# zk-bound からの選択的取り込み

- Date: 2026-09-07
- Source: [zk-bound](https://github.com/br-to/zk-bound)（前身 [zk-agent-guard](https://github.com/br-to/zk-agent-guard)）
- 除外: Safe Module とその ADR、計画、実行境界
- 実行境界の選択理由: [ADR-0016](../adr/adr-0016-custom-smart-account-over-safe-module.md)

`zk-bound` は Toi Kobara (`br-to`) が `zk-agent-guard` の暗号層を引き継ぎ、
Safe + `ZkPolicySafeModule` へ実行境界を移した後継リポジトリである。
本リポジトリは Safe を使わず、Smart Account と ERC-4337 を自分で追うために
`ZkPolicyAccount` を選んだ。回路や Safe 実行層は持ち込まない。
持ち込んだのは、このリポジトリに欠けていた **security-sensitive な運用面** である。

## すでに本リポジトリが持っているもの

| zk-bound の項目 | 本リポジトリの正本 | 判断 |
| --- | --- | --- |
| Noir + UltraHonk + generated verifier | [ADR-0003](../adr/adr-0003-commitment-and-proving-system.md) | 既存。再導入しない |
| Poseidon2 commitment と salt | ADR-0003、[ADR-0012](../adr/adr-0012-composite-policy-schema.md) | 既存。本リポジトリの方が複合条件まで進んでいる |
| `value` / `maxAmount` の u128 制約 | [ADR-0001](../adr/adr-0001-amount-and-public-inputs.md) | 既存。`assert_max_bit_size` 相当も回路にある |
| transaction binding（chain / account / target / value / expiry） | ADR-0012 の 15 public inputs | 既存。kind、asset、invoice、dayId、spentBefore まで拡張済み |
| Policy SDK と test vector | `packages/policy` | 既存。スキーマが異なるためコピーしない |
| リポジトリを正本にする運用 | `guidelines/`、`docs/epics/`、`docs/adr/` | 既存。Epic / Story / Task を正本とする |
| Agent への秘密非公開 | [ADR-0011](../adr/adr-0011-autonomous-policy-authorization-and-secret-boundary.md) | 既存 |

## 持ち込まないもの（Safe Module および衝突する設計）

- `ZkPolicySafeModule`、Safe `v1.4.1` pin、Safe 向け ADR / plan / architecture
- Safe 固定の 8 public input と domain tag `zk-agent-guard.policy.v1`
- 独自 Poseidon2 実装と `@zk-bound/policy-sdk`
- prompt-injection demo（`apps/demo`）。本リポジトリの Phase 5 はスキップ済み
- ESLint / Prettier 一式。本リポジトリは現状 formatter を導入していない
- `docs/development/workflow.md` を第二の開発手順として複製すること

## 今回持ち込んだもの

| 成果物 | 由来 | 本リポジトリへの合わせ方 |
| --- | --- | --- |
| `SECURITY.md` | zk-bound の報告ポリシー | プロジェクト名だけ置換 |
| `CONTRIBUTING.md` | zk-bound の入口 | `guidelines/` と roadmap を参照する形へ変更 |
| `.editorconfig` / `.gitattributes` | zk-bound の editor / line ending 固定 | そのまま |
| `.github/pull_request_template.md` | zk-bound の PR 観点 | Safe 固有語を Account / Epic / Story に置換 |
| `scripts/check-repo.sh` | zk-bound の repository check | 必須ファイルを本リポジトリの正本に合わせた |
| `.github/workflows/repository-checks.yml` | zk-bound の CI | typecheck、planning 検証、policy unit、Foundry に合わせた |
| `docs/security/threat-model.md` | zk-bound の脅威モデル | Safe / module nonce を Account / daily spend / API nonce に写した |

## 意図

暗号層の再実装ではなく、security report、threat model、PR の
security/privacy 確認、repository CI という **運用の痕跡** を残す。
これにより、本リポジトリでも fail-closed な認可境界と秘密の扱いを
レビュー可能な正本として参照できる。

# 発表スライド

`slides.md`をSlidev（Markdownベースのプレゼンテーションツール）で編集する。ルートのpnpm workspaceには含めない独立したプロジェクトなので、ここだけで`pnpm install`する。

## セットアップ

```sh
cd slides
pnpm install
pnpm dev
```

`pnpm dev`はブラウザでプレビューを開く。保存すると自動で更新される。

## 構成

`slides.md`内の`---`区切りが1枚のスライドに対応する。

1. タイトル
2. 課題 — ガードレールが読める場所にある限り越えられる
3. 解決の構造 — 秘密Policy / ZK Proof / Smart Accountの3層
4. アーキテクチャ
5. Policyの構造 — 65個の秘密Fieldと15個の公開入力
6. 回路が証明すること — Noirの制約
7. オンチェーン強制 — `ZkPolicyAccount`
8. 攻撃と防御 — 脅威モデル
9. Agent境界 — MCPと秘密の隔離
10. デモ
11. 実測
12. 設計判断 — ADRの要約
13. 将来像
14. クロージング

各スライド末尾の`<!-- -->`コメントはSlidevのプレゼンターノートとして表示される。数値と仕様は`docs/`を正本とし、実装を変更したときはスライド側の記述も更新する。

| スライドの記述 | 正本 |
| --- | --- |
| Policyの構造・公開入力 | [ADR-0012](../docs/adr/adr-0012-composite-policy-schema.md) |
| Commitmentと証明系 | [ADR-0003](../docs/adr/adr-0003-commitment-and-proving-system.md) |
| 日次累積 | [ADR-0014](../docs/adr/adr-0014-onchain-daily-spend.md) |
| Agent境界 | [ADR-0011](../docs/adr/adr-0011-autonomous-policy-authorization-and-secret-boundary.md) |
| 自作Accountの選択 | [ADR-0016](../docs/adr/adr-0016-custom-smart-account-over-safe-module.md) |
| 攻撃と防御 | [threat model](../docs/security/threat-model.md) |
| 実測値・テスト件数 | [audit-06](../docs/audits/epic-06-multi-policy.md) |

## ビルド

```sh
pnpm build   # dist/に静的ページを出力
pnpm export  # PDFを出力（Playwrightが必要）
```

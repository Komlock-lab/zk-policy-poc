# 発表スライド

`slides.md`をSlidev（Markdownベースのプレゼンテーションツール）で編集する。ルートのpnpm workspaceには含めない独立したプロジェクトなので、ここだけで`pnpm install`する。

## セットアップ

```sh
cd slides
pnpm install --ignore-workspace
pnpm dev
```

ルートに`pnpm-workspace.yaml`があり`slides`はそこに含まれないため、`--ignore-workspace`を付けないと依存関係が一切インストールされない。

`pnpm dev`はブラウザでプレビューを開く。保存すると自動で更新される。

## 構成

`slides.md`内の`---`区切りが1枚のスライドに対応する。発表は3ブロック5分を想定する。

| # | スライド | ブロック |
| --- | --- | --- |
| 1 | タイトル | — |
| 2 | 概要 — エージェントの送金をZK Proofで検証してから実行する | サービス（2分20秒） |
| 3 | 目的 — ガードレールが読める場所にある限り越えられる | サービス（2分20秒） |
| 4 | アーキテクチャ — 3つのゾーンと、その間の2つの境界 | サービス（2分20秒） |
| 5 | Programmable Cryptography — 65個の秘密に対する充足を15個の公開だけで示す | Programmable Cryptography（1分） |
| 6 | デモ — 正常系・異常系・Agent経由 | デモ（50秒） |
| 7 | 将来像（ETH Global） | 時間が押していれば飛ばす |
| 8 | クロージング | — |

時間配分はスライド面に出さず、各スライド末尾の`<!-- -->`コメント（Slidevのプレゼンターノート）に書いている。数値と仕様は`docs/`を正本とし、実装を変更したときはスライド側の記述も更新する。

図はmermaidを使わず、gridとflexのHTMLで組んでいる。ノード数が増えると自動レイアウトの矢印が交差して読めなくなったため、配置を固定した。図を足すときも同じ方針で書く。

見出し・表・コードの共通スタイルは`style.css`に置き、Slidevが自動で全スライドに読み込む。スライドごとの`<style>`ブロックはそのスライドにしかかからないので、共通スタイルをそこに書かない。

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

## 公開

`main`に`slides/`の変更がpushされると、`.github/workflows/deploy-slides.yml`がビルドしてGitHub Pagesに自動デプロイする（`https://komlock-lab.github.io/zk-policy-poc/`）。`configure-pages`に`enablement: true`を渡しているため、リポジトリ側でPagesを事前に有効化しておく必要はない。

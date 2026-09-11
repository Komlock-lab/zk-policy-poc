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
| 3 | 目的 — ルールを明かさず、証明できた場合だけ実行できる | サービス（2分20秒） |
| 4 | アーキテクチャ — 秘密のルールを登録し、ZKで送金を検証する | サービス（2分20秒） |
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

`main`に`slides/`の変更がpushされると、`.github/workflows/deploy-slides.yml`がビルドしてGitHub Pagesに自動デプロイする（`https://komlock-lab.github.io/zk-policy-poc/`）。

初回のみ、リポジトリのSettings → PagesでSourceを「GitHub Actions」に設定する必要がある。Pagesサイトの新規作成はリポジトリ管理者権限が要る操作で、ワークフローの標準`GITHUB_TOKEN`では`pages: write`を与えても実行できない（`configure-pages`に`enablement: true`を渡しても「Resource not accessible by integration」で失敗する）。一度Source設定さえ済ませれば、以降のデプロイ自体は標準`GITHUB_TOKEN`で問題なく動く。

## 図の凡例（2・3・4枚目）

2枚目（`.flow-diagram`）、3枚目（`.choice-grid`）は、インラインSVGのシンプルなアイコン（人・AI・鍵・盾など）で状態を示す一目でわかる図にしている。色は`.accent-pink`（秘密・非公開・却下）/`.accent-blue`（検証・採用）/`.accent-green`（成功・着金）で統一し、ダークモードの色は`style.css`側で上書きする。各スライドのfrontmatterに`class: flex flex-col justify-center`を付け、内容をスライド縦方向の中央に寄せている。

3枚目の`.choice-grid`は「ルールをそのまま渡す」「毎回人が承認する」「ZK Policy」の3択を横並びにし、採用する選択肢だけ`.highlight`を付ける。発表ナレーションの3文に1枚ずつ対応させているので、ナレーションを変えるときはカードの見出しと判定（✕/✓）も合わせる。

4枚目（`.architecture-map`）はAI・送金処理サーバー・ブロックチェーンの境界を固定gridで示す。上段にOwnerによるPolicy + salt → Poseidon2 → commitment登録の事前設定、図中に①依頼→②証明の往復→③署名付き送信→④検証と送金を配置する。秘密PolicyはAPI / Prover内のデータとして示し、Bundlerはオフチェーン、EntryPointとSmart Accountはオンチェーンに置く。状態取得のRPCなど詳細はプレゼンターノートに記載する。アーキテクチャ用CSSは専用クラスに限定する。

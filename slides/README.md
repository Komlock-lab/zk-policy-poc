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

`slides.md`内の`---`区切りが1枚のスライドに対応する。担当分担の目安:

- A-1〜A-3（サービス概要・目的・アーキテクチャ）
- B-1〜B-3（Programmable Cryptography詳細・デモ・将来像）

各スライドの直後にある`<!-- 担当: (未定) -->`コメントに自分の名前を書き、担当スライドだけを編集してPRを出す。

## ビルド

```sh
pnpm build   # dist/に静的ページを出力
pnpm export  # PDFを出力（Playwrightが必要）
```

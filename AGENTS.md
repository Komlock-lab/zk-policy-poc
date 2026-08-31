# Codex Project Instructions

- すべての変更前に`guidelines/common.md`を読む
- `apps/`とTypeScriptコードを変更するときは`guidelines/apps.md`を読む
- `circuits/`を変更するときは`guidelines/circuits.md`を読む
- `contracts/`を変更するときは`guidelines/contracts.md`を読む
- 現在の実装範囲は`docs/roadmap.md`と`docs/epics/`、`docs/stories/`で確認する
- `docs/epics/`、`docs/stories/`、`docs/tasks/`、`docs/adr/`、`docs/audits/`を変更するときは`guidelines/planning.md`を読む

## LLM Wiki

- `llm-wiki/raw/`は人間が追加する不変の一次資料。既存ファイルを編集・削除しない
- `llm-wiki/wiki/`はLLMが管理する。ページ間参照には`[[wikilink]]`を使う
- 新しい資料は`ingest-paper`または`ingest-article`スキルで取り込む
- Wikiへの質問は`query`スキル、整合性確認は`lint`スキルを使う
- 推測を事実として記録せず、sourceページから根拠を追跡できる状態を保つ
- 開発規約は`guidelines/`、設計判断は`docs/adr/`、ドメイン知識は`llm-wiki/`に置く

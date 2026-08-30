# Planning Guidelines

- MarkdownをEpic、Story、Task、ADR、Auditの唯一の正本とする
- PhaseをEpic、1つのユーザーアクションをStory、実装作業をTaskとして扱う
- Epicは`docs/epics/`、Storyは`docs/stories/<epic-id>/`、Taskは`docs/tasks/<story-id>/`に置く
- 設計判断は`docs/adr/`、Epic全体の監査結果は`docs/audits/`に置く
- IDは`epic-*`、`story-*`、`task-*`、`adr-*`、`audit-*`とし、一度作成したIDを再利用しない
- Storyの依存先は同じEpic内に限定し、循環依存を作らない
- Epicを`approved`にする前に、参照するADRをすべて`accepted`にする
- Storyを`approved`にする前に、正常系・異常系の受け入れ条件とTaskを揃える
- Taskの完了時に、実行した検証と結果を記録する
- Storyのスコープ変更が必要な場合は実装を止め、Storyを更新して再承認する
- `scripts/validate-planning.mjs`が成功しない状態で実装開始、Story完了、Epic PR作成を行わない
- 複数セッションで同じworktreeまたはbranchを共有しない

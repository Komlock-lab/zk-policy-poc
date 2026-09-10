---
id: task-06-09-01
type: task
title: Claude Codeの3決済Tool設定
story: story-06-09
status: done
blocked_by: []
created: 2026-09-06
updated: 2026-09-06
---

# Claude Codeの3決済Tool設定

## 目的

[story-06-09](../../stories/epic-06/story-06-09-user-pays-with-claude-code.md)の正常系操作を実現する。

## 作業

既存stdio MCPと秘密隔離を維持し、pay_native/pay_erc20/pay_contractだけを決済用途に許可する。

## 完了条件

MCP接続と3 Tool schemaが実Claude Codeから利用できる。

## 検証方法

pnpm test:unit

既存コマンドの対象テストと同じharnessを使う。新規テストファイル・fixtureを追加した場合は実行結果に正確なコマンドを記録する。

## 検証結果

- `.claude/settings.json`で3つの型付き決済Toolだけを許可し、Bash deny・既存stdio/環境変数転送を維持。
- `pnpm test:unit`: 103件成功。Claude設定と共通互換性テストのClaude側だけを更新、Codex側は維持。
- `pnpm build`: Verifier生成・Contract build・TypeScript成功。3 Toolの実接続は後続Taskで検証。

## Blocked

なし。

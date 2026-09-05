---
id: task-04-01-03
type: task
title: 秘密情報とerror境界
story: story-04-01
status: done
blocked_by: [task-04-01-02]
created: 2026-09-05
updated: 2026-09-05
---

# 秘密情報とerror境界

## 目的

高権限Server processからAgentへcredentialやProofが漏れない境界を作る。

## 作業

- 環境変数をstrict検証し、秘密値をdomain inputへだけ渡す。
- stdoutをMCP protocol専用にする。
- downstream errorを固定分類へ変換し、秘密値を除去する。
- 成功、設定失敗、Proof失敗、Bundler失敗の漏えいtestを追加する。

## 完了条件

- Tool result、stderr、例外、test snapshotのいずれにも秘密値とProofが現れない。

## 検証方法

- Secret canary unit test
- Error serialization test

## 検証結果

- `pnpm vitest run apps/payment-mcp`: 実startup stderrと実stdio downstream errorのsecret canary監査を含む15 tests成功。

## Blocked

なし。

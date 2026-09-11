---
id: task-06-01-03
type: task
title: Account・Policy API・CLIの期限付き決済
story: story-06-01
status: done
blocked_by: [task-06-01-02]
created: 2026-09-06
updated: 2026-09-06
---

# Account・Policy API・CLIの期限付き決済

## 目的

[story-06-01](../../stories/epic-06/story-06-01-owner-registers-expiring-policy.md)の正常系操作を実現する。

## 作業

Accountの実行引数と時刻確認、APIの暗号化payload・登録・activation・Proof response、直接実行とUserOperation Client、既存MCP adapterのnative経路をv2へ更新する。fixtureは新規DBとAccountを使う。

## 完了条件

登録からnative決済まで直接実行・Bundler両経路が成功し、旧native操作の呼出し意図を維持する。

## 検証方法

pnpm build; pnpm test:contracts; pnpm test:unit; pnpm test:e2e

既存コマンドの対象テストと同じharnessを使う。新規テストファイル・fixtureを追加した場合は実行結果に正確なコマンドを記録する。

## 検証結果

2026-09-06: `pnpm test`成功（build/Verifier再生成/typecheck、Circuit 4、Contract 29、unit 95、E2E 22）。既存Contract 28件とfuzz各256 runsを維持し、期限ちょうどの正常実行と15公開入力hash照合を追加。E2Eは新DB・新Accountで実作成CLIの0.1 ETH/300秒登録・暗号化保存・active化、直接実行0.01 ETH、実Alto経由CLI決済0.01 ETH、実MCP native経路を確認。Bundler CLIは明示validUntil（最新block+120秒）も使用。Token rotation等の既存テストはv2 fixtureへ更新して成功。

`forge fmt --check contracts/src/ZkPolicyAccount.sol contracts/test/ZkPolicyAccount.t.sol`、`git diff --check`成功。全検証ログ: `/private/tmp/story01-full-test.log`。通常E2Eで実Agent 5件はskipされ、このStoryの成功件数に含めない。新規異常系はユーザー指定どおり延期。

## Blocked

なし。

---
id: task-06-02-02
type: task
title: allowlistのOwner更新と決済E2E
story: story-06-02
status: done
blocked_by: [task-06-02-01]
created: 2026-09-06
updated: 2026-09-06
---

# allowlistのOwner更新と決済E2E

## 目的

[story-06-02](../../stories/epic-06/story-06-02-owner-updates-recipient-allowlist.md)の正常系操作を実現する。

## 作業

Owner CLIとAPIでrecipientAllowlistと有効化フラグを作成・更新できるようにし、AからA/Bへ更新する正常系を実Proofで確認する。

## 完了条件

更新後versionでBへの残高増加とオンチェーンCommitment一致が観測できる。

## 検証方法

pnpm test:unit; pnpm test:e2e

既存コマンドの対象テストと同じharnessを使う。新規テストファイル・fixtureを追加した場合は実行結果に正確なコマンドを記録する。

## 検証結果

2026-09-06: `pnpm test:unit`成功（97 tests）。新規`apps/policy-cli/src/policy-input.test.ts`でnumeric CLIの300秒初期値・明示120秒、Owner JSONファイル入力を確認。`NODE_OPTIONS=--experimental-sqlite pnpm exec vitest run e2e/recipient-policy-update.test.ts`成功。実作成CLIと更新CLIの`--policy-file`でA→A/Bへ更新し、同じPolicy ID、version 1→2、新CommitmentとAccountの一致、暗号化Policyの正規化、A/Bそれぞれの実Proof決済とB残高+0.01 ETHを確認。

最終`pnpm test`成功: build/Verifier再生成/typecheck、Circuit 6、Contract 29、unit 97、E2E 23。実Agent 5件のskipは成功に含めない。初回の低アドレスfixtureによるTransferFailedは通常のrecipient fixtureへ修正し、全検証で再確認。`git diff --check`と`node scripts/validate-planning.mjs`成功。ログ: `/private/tmp/story02-full-test.log`。

## Blocked

なし。

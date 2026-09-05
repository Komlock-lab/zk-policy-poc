---
id: task-03-02-03
type: task
title: UserOperation決済CLI
story: story-03-02
status: done
blocked_by: [task-03-02-02]
created: 2026-09-05
updated: 2026-09-05
---

# UserOperation決済CLI

## 目的

Ownerが既存Policy設定を使ってProof付きUserOperation決済をCLIから実行できるようにする。

## 作業

- `policy:pay-userop RECIPIENT VALUE_WEI` commandを追加する。
- Policy API、execution RPC、Bundler URL、EntryPoint、Account、Owner key、Policy ID、Tokenを環境変数から検証する。
- 成功時にPolicy ID、Policy version、UserOperation hash、bundle transaction hashを出力する。
- 入力または実行失敗時に秘密値を出力せず非zeroで終了する。

## 完了条件

- CLIが有効な入力でUserOperation receiptを返し、不正入力を接続前に拒否する。

## 検証方法

- CLI unit test
- Local CLI integration test

## 検証結果

`pnpm exec vitest run e2e/bundler-payment.test.ts apps/policy-cli/src/pay-userop.test.ts apps/policy-cli/src/pay-with-policy.test.ts`: 19件成功。

- 実CLI subprocessから0.01 ETH決済し、JSONのPolicy ID、UserOperation hash、bundle transaction hashと成功receiptを確認。
- 不正入力は非zero終了し、入力Token・秘密鍵のmarkerをstdout/stderrへ出力しない。
- 環境変数: POLICY_API_URL、POLICY_RPC_URL、POLICY_BUNDLER_URL、POLICY_ENTRYPOINT_ADDRESS、POLICY_ACCOUNT_ADDRESS、POLICY_OWNER_PRIVATE_KEY、POLICY_ID、POLICY_TOKEN。

## Blocked

なし。

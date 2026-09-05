---
id: task-02-05-02
type: task
title: ローカルAnvil統合E2E
story: story-02-05
status: done
blocked_by: [task-02-05-01]
created: 2026-09-04
updated: 2026-09-04
---

# ローカルAnvil統合E2E

## 目的

Policy作成からAPI Proof決済までのobservable flowを非fork Anvilで検証する。

## 作業

- API、SQLite、CLI、Verifier、Account、Payment Clientを起動するharnessを整備する。
- 0.01 ETH送金成功、1 ETH拒否、古いProof拒否、chain状態不一致を検証する。
- Tx送信有無と受取人残高を確認する。

## 完了条件

- Story 02-05の全受け入れ条件が自動testへ対応する。

## 検証方法

- Phase 2 local E2E command

## 検証結果

- `pnpm test:e2e`: 6 files、8 testsが成功した。
- 0.1 ETHの更新済みactive Policyと再発行済みTokenで0.01 ETHを送金し、受取人残高が正確に0.01 ETH増加した。
- 1 ETHの上限超過はAPIがHTTP 422で拒否し、Owner nonceと受取人残高が変化しなかった。
- Account更新前のProofを更新後に明示的なgas付きTxで送信し、receiptが`reverted`、受取人残高が不変であることを確認した。
- Account Commitmentだけを変更してAPIのactive状態と不一致にし、Proof取得がHTTP 409で拒否され、Owner nonceと受取人残高が変化しなかった。

## Blocked

なし。

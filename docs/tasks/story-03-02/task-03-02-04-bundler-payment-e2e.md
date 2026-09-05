---
id: task-03-02-04
type: task
title: Bundler決済E2E
story: story-03-02
status: pending
blocked_by: [task-03-02-03]
created: 2026-09-05
updated: 2026-09-05
---

# Bundler決済E2E

## 目的

Policy作成からProof付きUserOperationのBundler実行までを非fork Anvilで検証する。

## 作業

- Policy API、SQLite、CLI、Verifier、EntryPoint、Account、Altoを統合するE2Eを追加する。
- 0.01 ETH決済成功、UserOperation receipt、受取人残高、Owner EOA nonce不変を検証する。
- 1 ETH上限超過、不正Owner署名、実送金額改ざん、EntryPoint不一致、非loopback URLを個別に検証する。
- Proof取得または送信前検証の失敗時にEntryPoint nonceと受取人残高が不変であることを確認する。

## 完了条件

- Story 03-02の全受け入れ条件が独立した自動testへ対応する。

## 検証方法

- Phase 3 local Bundler E2E command

## 検証結果

未実施。

## Blocked

なし。

---
id: task-05-02-02
type: task
title: Policy更新(送金先変更)E2E
story: story-05-02
status: pending
blocked_by: [task-05-02-01]
created: 2026-09-06
updated: 2026-09-06
---

# Policy更新(送金先変更)E2E

## 目的

許可送金先を変更した後、旧versionのCommitmentに対するProofが新Accountの状態で無効になることを確認する。

## 作業

- `e2e/policy-update.test.ts`を拡張し、許可送金先0xAAAAから0xBBBBへの更新でversion 2がactiveになることを確認する。
- 更新前のCommitmentに対して生成したProofを更新後のAccountへ送信し、オンチェーン検証が失敗することを確認する。
- 非Owner署名によるCommitment更新の拒否を確認する。

## 完了条件

- AC-1からAC-3(story-05-02)がE2Eまたは対応するcontract testで確認できる。

## 検証方法

- `pnpm test:e2e`
- `forge test --root contracts`

## 検証結果

未実施。

## Blocked

なし。

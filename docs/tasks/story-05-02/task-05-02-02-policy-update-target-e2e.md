---
id: task-05-02-02
type: task
title: Policy更新(送金先変更)E2E
story: story-05-02
status: blocked
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

- `e2e/policy-update.test.ts`と`e2e/policy-token-rotation.test.ts`に許可送金先変更を含むコード変更を反映した(`pnpm exec tsc --noEmit`でエラーなし)。
- `pnpm test:e2e`はtask-05-01-04と同じ理由(solc・CRSの取得先が403拒否)で実行できず、実行結果は未検証。

## Blocked

- task-05-01-04と同じCRS・solcのネットワーク制限により`pnpm test:e2e`が実行できない。別環境で実行し、結果を追記する必要がある。

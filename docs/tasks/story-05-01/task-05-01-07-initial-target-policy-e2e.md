---
id: task-05-01-07
type: task
title: 初回Policy登録(送金先付き)E2E
story: story-05-01
status: blocked
blocked_by: [task-05-01-04, task-05-01-06]
created: 2026-09-06
updated: 2026-09-06
---

# 初回Policy登録(送金先付き)E2E

## 目的

送金先を含むPolicyの初回登録が、非forkのローカルAnvil上でCircuitからAccountまで一貫して動くことを確認する。

## 作業

- `e2e/policy-registration.test.ts`を拡張し、許可送金先を含むPolicyを登録してversion 1がactiveになり、AccountのCommitmentと一致することを確認する。
- 秘密値からの再計算不一致、zero address、非Owner署名の拒否ケースを追加する。

## 完了条件

- AC-1からAC-5(story-05-01)がE2Eまたは対応するunit/contract testで再現・確認できる。

## 検証方法

- `pnpm test:e2e`

## 検証結果

- `e2e/policy-registration.test.ts`に許可送金先(`allowedTarget`)を含むPolicy登録のコード変更を反映した(`pnpm exec tsc --noEmit`でエラーなし)。
- `pnpm test:e2e`はtask-05-01-04と同じ理由(solc・CRSの取得先が403拒否)で`forge build`(Contractビルド)と実Proof生成の両方が失敗するため実行できず、実行結果は未検証。

## Blocked

- task-05-01-04と同じCRS・solcのネットワーク制限により`pnpm test:e2e`が実行できない。別環境でtask-05-01-04のVerifier再生成・`forge test`と合わせて実行する必要がある。

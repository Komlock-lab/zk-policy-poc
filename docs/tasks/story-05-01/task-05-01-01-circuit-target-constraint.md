---
id: task-05-01-01
type: task
title: Circuitへのallowed target制約追加
story: story-05-01
status: done
blocked_by: []
created: 2026-09-06
updated: 2026-09-06
---

# Circuitへのallowed target制約追加

## 目的

Circuitが送金先を制約し、許可されていない送金先では有効なProofを生成できないようにする。

## 作業

- `circuits/spend-limit/src/main.nr`にPrivate Input`allowed_target`とPublic Input`target`を追加する。
- `target == allowed_target`をassertする。
- `compute_policy_commitment`を`Poseidon2::hash([max_amount, allowed_target, salt], 3)`に変更する。
- 正常系(一致)・異常系(不一致でrevert)・既存の金額上限テストを更新する。

## 完了条件

- 許可送金先と一致する`target`では既存の金額制約とあわせてProofが成立し、不一致の`target`ではCircuit実行が失敗する。

## 検証方法

- `nargo test`(`circuits/spend-limit`)

## 検証結果

- `nargo test`(circuits/spend-limit、1.0.0-beta.26): 6 tests passed。`accepts_value_below_limit`、`accepts_value_equal_to_limit`で一致するtargetを許可し、`rejects_target_not_allowed`で不一致targetを`"target not allowed"`で拒否することを確認した。
- `matches_ts_sdk_commitment_vector`で3入力Poseidon2 CommitmentがTS SDK側(packages/policy)の計算値と一致することを確認した(task-05-01-02参照)。

## Blocked

なし。

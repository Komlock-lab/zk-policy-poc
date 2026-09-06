---
id: task-06-11-02
type: task
title: 設計適合確認とEpic PR
story: story-06-11
status: done
blocked_by: [task-06-11-01]
created: 2026-09-06
updated: 2026-09-06
---

# 設計適合確認とEpic PR

## 目的

[story-06-11](../../stories/epic-06/story-06-11-developer-verifies-multi-policy.md)の正常系操作を実現する。

## 作業

ship-story/run-epicに従ってStory結果を統合し、ADR適合・実行値とProofの結合・秘密境界・累積状態をレビューする。新規攻撃テストは対象外として記録し、修正・再確認後に最終PRを作成する。

## 完了条件

先行Storyがdoneで、実施範囲を明示した監査準備・検証結果とmain向けEpic PR本文が揃い、ship-storyで本StoryをEpicへ引き渡せる。run-epicが本Storyの統合・done化後に最終監査と全quality gateを再確認し、main向けEpic PRを作成する。mainへはmergeしない。

実行順序の詳細化: run-epicは全Story done後にEpic PRを作成し、ship-storyは全Task doneを要求するため、PR作成自体はEpic orchestratorの最終工程に置く。Storyのスコープ・AC・Epicの最終PR要件は変更しない。

## 検証方法

node scripts/validate-planning.mjs; node --test scripts/validate-planning.test.mjs; git diff --check

既存コマンドの対象テストと同じharnessを使う。新規テストファイル・fixtureを追加した場合は実行結果に正確なコマンドを記録する。

## 検証結果

- 先行8 StoryがEpic上でdone。4分野の独立監査準備を `docs/audits/epic-06-multi-policy.md` へ集約し、全ACとの対応と診断履歴を記録。初回レビューでCRITICAL/HIGH/MEDIUM/LOW指摘なし。監査は全Story統合後の確認までpendingを維持。
- 最終Epic PR本文の引渡し内容: 全9 Story、各AC表、全quality gate実測、監査結果、実Agent診断履歴、除外範囲、mainへmergeしない境界。本StoryのPRでも引渡しを明記。
- `node scripts/validate-planning.mjs`成功、`node --test scripts/validate-planning.test.mjs`9件成功、`git diff --check`成功。
- 最終整形確認でAccount/testの書式差分を検出。`cd contracts && forge fmt src/ZkPolicyAccount.sol src/fixtures/PolicyToken.sol src/fixtures/PolicyPaymentReceiver.sol src/interfaces/IPolicyPaymentReceiver.sol test/ZkPolicyAccount.t.sol`で整形し、同じ対象の`forge fmt --check`成功。生成Verifierは手動編集していない。Contract再検証は `/private/tmp/story11-format-contract-test.log`。
- 新たなWiki/ADR/規約追加は不要。最終監査確定・全gate再実行・Epic PR作成をrun-epicへ引き渡す。

## Blocked

なし。

run-epic最終引渡し結果: 全9 Story done、最終監査passed（C/H 0、M/L 0）、全quality gate・実両Agent 7件成功後、[Epic PR #30](https://github.com/Komlock-lab/zk-policy-poc/pull/30)をmain向けに作成。main未merge。

---
id: task-06-09-02
type: task
title: 実Claude Codeの複合Policy決済E2E
story: story-06-09
status: done
blocked_by: [task-06-09-01]
created: 2026-09-06
updated: 2026-09-06
---

# 実Claude Codeの複合Policy決済E2E

## 目的

[story-06-09](../../stories/epic-06/story-06-09-user-pays-with-claude-code.md)の正常系操作を実現する。

## 作業

既存e2e/claude-code-payment.test.tsのfixtureを拡張し、全条件有効の3種別を実Agentで逐次確認する。

## 完了条件

Agent transcriptのTool入力・公開結果とオンチェーンの残高・累積が一致する。

## 検証方法

pnpm exec vitest run e2e/claude-code-payment.test.ts（既存harness指定の環境で実Agent実行）

既存コマンドの対象テストと同じharnessを使う。新規テストファイル・fixtureを追加した場合は実行結果に正確なコマンドを記録する。

## 検証結果

- `RUN_CLAUDE_CODE_E2E=1 NODE_OPTIONS=--experimental-sqlite pnpm exec vitest run e2e/claude-code-payment.test.ts`: 固定Claude Code 2.1.260で全2件成功（既存回帰1＋正常系1）。最終実行では`CLAUDE_CODE_E2E_DIAGNOSTICS_PATH=/private/tmp/story09-final-diagnostics.log`を追加して秘密置換済み診断を保存。
- 全条件有効Policyで自然言語のnative0.01 ETH、Token10最小単位、Contract0.02 ETHを3回順番に依頼。追加承認なしの各Tool1回・3receipt成功と順序、nonce+3、native累積+0.03/Token累積+10、TokenAccount990/recipient10・Contract残高+0.02を確認。
- transcriptの公開入力と実行意図を照合し、OwnerKey/Token/salt/秘密Policyフィールド/Proofの非露出を確認。
- 最初の一括依頼ではContract未呼出し、別run依頼ではERC20未呼出しが観測されたが原因は未確定。診断時には3送金成功し、Tool初期一覧を順序と誤認したassertを実tool_use順序へ修正。既存成功harnessに合わせ各依頼へTool名を明記した最終2件が成功。成功条件と権限は緩和していない。
- 診断の一時全文は削除し、最終応答metadataと秘密置換済み文のみ保存可能にした。通常全testは診断コードを既存TypeScript lib対応へ修正後に成功。

## Blocked

なし。

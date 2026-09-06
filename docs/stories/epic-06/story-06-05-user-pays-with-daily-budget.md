---
id: story-06-05
type: story
title: 利用者が日次予算内で続けて支払う
epic: epic-06
status: in-progress
depends_on: [story-06-04]
adrs: [adr-0012, adr-0013, adr-0014]
created: 2026-09-06
updated: 2026-09-06
---

# 利用者が日次予算内で続けて支払う

## ユーザーアクション

利用者が日次予算内で続けて支払う。

## 背景

承認済み[epic-06](../../epics/epic-06-multi-policy.md)の複合条件を、観測可能な操作として実現する。

## スコープ

### 含むもの

- Accountの資産別日次累積保存
- 日次上限の回路と最新context取得
- 同日連続・日跨ぎ・資産別決済E2E

### 含まないもの

- 新規の異常系・攻撃検証、同時送信、Risk Score全体、本番配置、実資産
- EpicおよびADRにない決済種別・PolicyのOR選択

## 受け入れ条件

### 正常系

- AC-1 [正常系]: Given nativeの日次上限0.1 ETH・当日累積0 / When 利用者が0.03 ETH送金のreceiptを待って0.02 ETHを支払う / Then Accountの当日累積が0.05 ETHになる
- AC-2 [正常系]: Given native累積0.05 ETH / When 利用者が許可Contractへ0.01 ETH支払う / Then 同じnative枠の累積が0.06 ETHになる
- AC-3 [正常系]: Given nativeとERC-20を支払ったAccount / When 利用者が同日にERC-20を追加送金する / Then そのTokenだけの累積が増えnative累積は維持される
- AC-4 [正常系]: Given 前日に支払い済みのAccount / When 翌UTC日の最初の決済を実行する / Then 新しい日の累積が今回の金額となる

### 異常系

2026-09-06のユーザー指定により延期する。根拠はEpicのerror_acceptance_authorizationに記録済み。実施済み・成功とは扱わない。

## アーキテクチャ制約

- Epicの「Storyをまたぐ不変条件」と15公開入力の順序・型を維持する。
- [adr-0012](../../adr/adr-0012-composite-policy-schema.md)
- [adr-0013](../../adr/adr-0013-typed-multi-asset-payments.md)
- [adr-0014](../../adr/adr-0014-onchain-daily-spend.md)
- [公開・秘密入力](../../../llm-wiki/wiki/concepts/noir-public-and-private-inputs.md)
- [ERC-4337決済境界](../../../llm-wiki/wiki/concepts/erc-4337-zk-policy-payment.md)
- Owner Key・Policy・TokenをAgentへ公開しない。local chain ID 31337のみ使用する。

## Task

| ID | Task | Status |
| --- | --- | --- |
| [task-06-05-01](../../tasks/story-06-05/task-06-05-01-daily-state-account.md) | Accountの資産別日次累積保存 | done |
| [task-06-05-02](../../tasks/story-06-05/task-06-05-02-daily-proof-context.md) | 日次上限の回路と最新context取得 | done |
| [task-06-05-03](../../tasks/story-06-05/task-06-05-03-daily-payment-e2e.md) | 同日連続・日跨ぎ・資産別決済E2E | done |

## 検証結果

- AC-1: `e2e/daily-payment.test.ts`で日次上限0.1 ETH・累積0から実Altoで0.03 ETHのreceiptを待ち、0.02 ETHを支払い、getter0.05 ETHと受取残高増加を確認。
- AC-2: 同E2Eの許可Contractへの固定pay決済0.01 ETHで、Contract残高増加とnative共通累積0.06 ETHを確認。
- AC-3: 同E2EでToken 10→20を支払い、Token累積30・Account残高970・受取残高30とnative累積0.06 ETH維持を確認。
- AC-4: 同E2EでAnvilを翌UTC日へ進め各getterが0になり、最初のnative 0.04 ETHのreceipt後に新日累積0.04 ETH、Token有効累積0・残高維持を確認。
- 全条件有効のPolicyで全15公開入力を実Proof・Accountへ渡し、Proof生成のみで累積不変とreceipt後の最新spentBefore利用を確認。AccountのETH減少と支払額の差からgas/prefundが累積に含まれないことも確認。
- `pnpm test`: build・Verifier再生成・TypeScript成功、回路11件、Contract37件（fuzz各256 runs）、単体102件、E2E26件成功。既存異常系は維持。既定でskipする実Agent固有5件は未実施として区別。
- `pnpm benchmark:circuit`: ACIR 4,314・Brillig 87、daily有効実Proof 8,000 bytes・生成937 ms。HonkVerifier runtimeは`forge inspect --root contracts HonkVerifier deployedBytecode`から15,939 bytesを確認。
- `forge fmt --check contracts/test/ZkPolicyAccount.t.sol`、`git diff --check`、`node scripts/validate-planning.mjs`: 成功。
- 自己・独立レビューで重大指摘なし。u128加算、同一assetの1回上限AND日次上限、無効時zero、同一block context、既存Accountの検証・累積更新→外部呼出しを確認。公開入力・秘密境界・認可経路は維持。追加異常系はユーザー指定で延期。
- accepted ADRの変更・新しい外部知識の取り込みはなく、Wiki更新は不要。

## Blocked

なし。Story PRをEpicへ統合する判断とdone遷移はrun-epicが担当する。

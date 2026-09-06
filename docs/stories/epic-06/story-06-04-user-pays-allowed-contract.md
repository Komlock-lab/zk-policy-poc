---
id: story-06-04
type: story
title: 利用者が許可Contractへ請求ID付きで支払う
epic: epic-06
status: approved
depends_on: [story-06-03]
adrs: [adr-0012, adr-0013]
created: 2026-09-06
updated: 2026-09-06
---

# 利用者が許可Contractへ請求ID付きで支払う

## ユーザーアクション

利用者が許可Contractへ請求ID付きで支払う。

## 背景

承認済み[epic-06](../../epics/epic-06-multi-policy.md)の複合条件を、観測可能な操作として実現する。

## スコープ

### 含むもの

- Contract allowlistと請求IDの拘束
- 型を固定したContract決済
- Contract決済のAPI・Client・MCP接続

### 含まないもの

- 新規の異常系・攻撃検証、同時送信、Risk Score全体、本番配置、実資産
- EpicおよびADRにない決済種別・PolicyのOR選択

## 受け入れ条件

### 正常系

- AC-1 [正常系]: Given pay(bytes32) payableに対応する許可Contractとactive Policy / When 利用者がinvoiceIdとnative金額を指定する / Then ContractがそのinvoiceIdと受領額をイベントへ記録し残高が増える

### 異常系

2026-09-06のユーザー指定により延期する。根拠はEpicのerror_acceptance_authorizationに記録済み。実施済み・成功とは扱わない。

## アーキテクチャ制約

- Epicの「Storyをまたぐ不変条件」と15公開入力の順序・型を維持する。
- [adr-0012](../../adr/adr-0012-composite-policy-schema.md)
- [adr-0013](../../adr/adr-0013-typed-multi-asset-payments.md)
- [公開・秘密入力](../../../llm-wiki/wiki/concepts/noir-public-and-private-inputs.md)
- [ERC-4337決済境界](../../../llm-wiki/wiki/concepts/erc-4337-zk-policy-payment.md)
- Owner Key・Policy・TokenをAgentへ公開しない。local chain ID 31337のみ使用する。

## Task

| ID | Task | Status |
| --- | --- | --- |
| [task-06-04-01](../../tasks/story-06-04/task-06-04-01-contract-policy-circuit.md) | Contract allowlistと請求IDの拘束 | pending |
| [task-06-04-02](../../tasks/story-06-04/task-06-04-02-contract-execution.md) | 型を固定したContract決済 | pending |
| [task-06-04-03](../../tasks/story-06-04/task-06-04-03-contract-client-mcp.md) | Contract決済のAPI・Client・MCP接続 | pending |

## 検証結果

未実施。

## Blocked

実装前条件はEpicのPreflightを参照。計画は承認済みだが実装開始前。

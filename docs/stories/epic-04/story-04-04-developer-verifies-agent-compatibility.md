---
id: story-04-04
type: story
title: Developerが両Agentの決済互換性を検証する
epic: epic-04
status: in-progress
depends_on: [story-04-02, story-04-03]
adrs: [adr-0010, adr-0011]
created: 2026-09-05
updated: 2026-09-05
---

# Developerが両Agentの決済互換性を検証する

## ユーザーアクション

DeveloperはClaude CodeとCodexが同一境界を使い、既存Phaseを壊さないことをquality gateで確認できる。

## 背景

Host別設定が共通MCP、Policy、秘密境界を分岐させていないことをEpic全体で検証する必要がある。

## スコープ

### 含むもの

- 両Hostの正常・異常系証跡、秘密log監査、Phase 1から3の回帰、Epic audit

### 含まないもの

- Phase 5の攻撃検証、Phase 6の複数Policy

## 受け入れ条件

### 正常系

- AC-1 [正常系]: Given 両Host E2Eが実装済みである / When DeveloperがPhase 4 quality gateを実行する / Then 同一Tool schemaとClientで両決済が成功し全回帰testも成功する

### 異常系

- AC-2 [異常系]: Given Host間でTool schema、許可、出力に差がある / When compatibility検査を実行する / Then quality gateが差分を報告して失敗する
- AC-3 [異常系]: Given transcriptまたはlogに秘密値がある / When secret監査を実行する / Then quality gateが失敗する
- AC-4 [異常系]: Given auditにCRITICALまたはHIGHが残る / When Epic完了を判定する / Then完了を拒否する

## アーキテクチャ制約

- [epic-04](../../epics/epic-04-agent-integration.md)、[adr-0010](../../adr/adr-0010-shared-stdio-mcp-payment-interface.md)、[adr-0011](../../adr/adr-0011-autonomous-policy-authorization-and-secret-boundary.md)に従う。

## Task

| ID | Task | Status |
| --- | --- | --- |
| [task-04-04-01](../../tasks/story-04-04/task-04-04-01-phase-4-quality-gate.md) | Phase 4品質ゲート | done |

## 検証結果

- AC-1: Claude Code 2.1.260は1/1、Codex CLI 0.153.2は4/4の実Agent E2Eに成功し、両Hostが同じ`apps/payment-mcp/src/index.ts`、`pay_native`、Phase 3 Clientを使用することを確認した。正常決済だけがrecipient残高とEntryPoint nonceを増加させた。
- AC-2: compatibility testで両HostのServer entrypoint、credential名、Tool allow、Codex Tool単位approvalを比較し、drift時に失敗することを確認した。
- AC-3: startup、downstream error、Claude/Codex transcript、MCP stderrをsecret canaryで検査した。Codexのshell Toolを無効化し、ClaudeのBashをdenyしてHostからcredentialを読むTool経路も閉じた。
- AC-4: [audit-04](../../audits/audit-04-agent-integration.md)で独立監査と再監査を行い、CRITICAL/HIGH残件0件でpassedと判定した。
- chain境界: 実stdio MCPからRPCまたはBundlerがchain ID 31337以外を返すE2Eで、`eth_sendUserOperation` 0回、残高・nonce不変、stderr空を確認した。
- `pnpm test`: Circuit 4、Contract 28、unit 93、local E2E 22 tests passed（実Agent 5 testsは別途明示実行）。
- `pnpm benchmark:circuit`: ACIR 12、Brillig 8、Proof 7,232 bytes、生成326ms。
- planning validator、Wiki lint、`git diff --check`: passed。

## Blocked

なし。

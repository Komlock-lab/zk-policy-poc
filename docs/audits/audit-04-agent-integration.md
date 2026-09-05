---
id: audit-04
type: audit
title: Epic 04 Claude Code・Codex接続監査
epic: epic-04
status: passed
date: 2026-09-05
---

# Epic 04 Claude Code・Codex接続監査

## 実行した検証

- `pnpm test`: verifier生成、Contract build、typecheck、Circuit 4件、Contract 28件（fuzz含む）、TypeScript unit 93件、非fork local Anvil E2E 22件が成功した。実Agent E2E 5件は通常gateではskipし、固定versionのCLIで別途実行した。
- Claude Code 2.1.260実体が自然言語の3 Intentを`pay_native`へ渡し、追加承認なしで0.01 ETHだけを送金した。1 ETHと不正recipientは残高とEntryPoint nonceを変更せず拒否した。
- Codex CLI 0.153.2実体が正常、上限超過、不正recipient、shell非公開の4 sessionを`turn.completed`まで実行した。Tool単位`approval_mode = "approve"`によりapproval eventは0件で、正常決済だけが残高とnonceを増加させた。
- 両Hostのentrypoint、credential名、Tool allowをcompatibility testで比較し、同じ`apps/payment-mcp/src/index.ts`、`pay_native`、Phase 3 UserOperation Clientを使うことを確認した。
- RPCまたはBundlerがchain ID 1を返す実stdio E2Eで、固定`PAYMENT_REJECTED`、`eth_sendUserOperation` 0回、残高・nonce不変、stderr空を確認した。
- startup、schema、downstream error、Agent JSONL、MCP resultとstderrへsecret canaryを流し、Owner Key、Policy Token、Proof fieldを出力しないことを確認した。
- `pnpm benchmark:circuit`: ACIR 12、Brillig 8、Proof 7,232 bytes、生成326ms（単発観測値）。
- `node scripts/validate-planning.mjs`、`git diff --check`が成功した。LLM Wiki lintでraw差分、broken wikilink、index漏れ、不正filename、source/retrieved欠落が0件だった。

## Findings

| ID | Severity | Area | Finding | Remediation | Status |
| --- | --- | --- | --- | --- | --- |
| F-04-01 | HIGH | Startup secret boundary | 必須credential欠落時の実entrypoint testがなく、設定名を示すACと固定errorが一致していなかった。 | Zod issueから許可済み設定名だけを整形し、実processのstdout、stderr、exit codeをsecret canary付きで検証した（PR #15）。 | closed |
| F-04-02 | HIGH | Downstream error boundary | secretを含むProof/Bundler errorを固定MCP errorへ変換する実stdio回帰testがなかった。 | Owner Key、Policy Token、Proof canaryを含むexecutor errorを実stdioで発生させ、`PAYMENT_REJECTED`以外を返さないtestを追加した（PR #15）。 | closed |
| F-04-03 | MEDIUM | Chain boundary | MCP境界からRPC/Bundler chain ID不一致時のUserOperation未送信を観測するtestがなかった。 | chain ID proxyを使う両境界のE2Eを追加し、send call 0回、状態不変、stderr空を確認した。 | closed |
| F-04-04 | MEDIUM | Host compatibility | Host別設定が同一Server、credential集合、自動許可を維持する機械検査がなかった。 | ClaudeとCodexのNode entrypointを一致させ、Tool allow、approval、credential名を比較するunit gateを追加した。 | closed |
| F-04-05 | HIGH | Host credential capability | Codexの既定shell環境はOwner KeyとPolicy Tokenを継承し、ClaudeもBashを通じてHost環境を参照できた。 | Codexはproject configでshell Tool自体を無効化し、ClaudeはBashをdenyした。実Codexへshellを要求してcommand execution eventが0件であることと、その設定のままMCP決済が成功することを確認した。 | closed |
| F-04-06 | LOW | Autonomous payment risk | 許可済みToolは1回上限内の連続決済を自動実行でき、悪意ある自然言語の包括検証は行っていない。 | Toolをnative単一送金へ限定し、ZK Policy、Owner署名、local chainを強制する。Prompt Injectionと累積上限はPhase 5、6で扱う。 | retained |
| F-04-07 | MEDIUM | Diagnostic stream audit | stderr listenerをMCP接続後に設定しており、startupから接続完了までの出力を監査できなかった。 | transport生成直後かつ`connect()`前にlistenerを設定し、Tool完了とtransport close後にsecret canaryと空出力を検査した。 | closed |

## 再監査

- 第1監査でStory 04-01のstartupとdownstream error証跡にHIGH 2件、chain mismatchとstream監査にMEDIUM 2件を検出した。
- PR #15でHIGH 2件を修正し、Story 04-04でRPC/Bundler chain mismatch、Host compatibility、実Agent transcript監査を追加した。再監査で検出したHost shell credential経路はshell capabilityを除去して閉じた。
- 統合差分をAgent/秘密境界、ZK/Contract、API/MCP/E2Eの3観点で独立再監査し、全quality gateを再実行した。

## 最終結果

- CRITICAL/HIGH残件: 0
- MEDIUM残件: 0
- 受容したLOW残件: 1（Phase 5、6で扱うPrompt Injectionと累積上限）
- 判定: passed

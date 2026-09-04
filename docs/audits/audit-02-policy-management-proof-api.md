---
id: audit-02
type: audit
title: Epic 02 Policy管理・Proof生成API監査
epic: epic-02
status: passed
date: 2026-09-04
---

# Epic 02 Policy管理・Proof生成API監査

## 実行した検証

- `pnpm test`: build・typecheck、Circuit 4 tests、Contract 15 tests、TypeScript unit 63 tests、ローカルAnvil E2E 8 testsが成功した。
- `pnpm benchmark:circuit`: ACIR Opcodes 12、Brillig Opcodes 8、Proof 7,232 bytes、Proof生成324msを記録した。
- `e2e/policy-payment.test.ts`: 更新済みPolicyと再発行済みTokenによる0.01 ETH送金、1 ETH上限超過拒否、古いProofのオンチェーン拒否、APIとAccountのCommitment不一致拒否を確認した。
- Payment ClientがAPI responseをstrict Zod schemaで検証し、Policy ID、実送金額、Accountの現在CommitmentとPublic Inputを照合してからOwner署名Txを送ることを確認した。
- RPCのchain ID `31337`、API・RPCの`127.0.0.1`制約、Account Ownerと署名者の一致を確認した。
- Proof取得失敗時にOwner nonceと受取人残高が変化せず、Txを送信していないことを確認した。
- 秘密Policy、暗号鍵、Owner秘密鍵、平文TokenがAPI logまたは永続化平文へ出ないことを確認した。

## Findings

| ID | Severity | Area | Finding | Remediation | Status |
| --- | --- | --- | --- | --- | --- |
| audit-02-01 | HIGH | Token recovery | 初回Tokenを失うとpending Policyをactive化できなかった。 | Account contextからPolicy IDとnonceを取得し、Owner署名でpending状態でもTokenを再発行できるようにした。 | closed |
| audit-02-02 | MEDIUM | Policy update | API認可nonceからPolicy versionを導出すると、Token再発行後のPolicy更新を誤って拒否する。 | versionとnonceを分離し、Clientは署名済みCommitmentから再構築したcalldataを検証して使用する。 | closed |
| audit-02-03 | MEDIUM | Token rotation | rotationと進行中のProof生成が競合すると旧Token requestが成功し得た。 | repositoryのcommit時とProof返却直前にToken hashを再検証し、race testを追加した。 | closed |
| audit-02-04 | LOW | Error handling | Fastifyのloggerが無効で、未知の内部errorを応答から除外する際に安全な診断情報も記録しない。 | 秘密を含まない構造化内部error記録を運用化する。Phase 2ローカルPoCでは未実装。 | open |
| audit-02-05 | LOW | Input validation | 形式上はaddressだがchecksumが不正なmixed-case addressはserviceの`getAddress`で例外となり、400ではなく500になる。 | HTTP境界でchecksumを含めて検証し、`INVALID_REQUEST`へ正規化する。 | open |
| audit-02-06 | LOW | Chain diagnostics | activation時のtransaction取得errorをすべて`TRANSACTION_NOT_CONFIRMED`へ変換するため、RPC障害と未確定を区別できない。 | 安全な失敗は維持しつつ、内部診断で原因を区別する。 | open |

## 再監査

- Token recovery、Policy version導出、Token rotation raceの修正後に、関連unit・E2Eと全quality gateを再実行した。
- Epic branch統合後、独立したarchitecture、ZK、Contract、API/security監査結果を本書へ追記する。

## 最終結果

- CRITICAL/HIGH残件: 0
- 判定: passed

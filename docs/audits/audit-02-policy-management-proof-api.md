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

- 監査修正後の`pnpm test`: build・typecheck、Circuit 4 tests、Contract 15 tests、TypeScript unit 68 tests、ローカルAnvil E2E 8 testsが成功した。
- 監査修正後の`pnpm benchmark:circuit`: ACIR Opcodes 12、Brillig Opcodes 8、Proof 7,232 bytes、Proof生成322msを記録した。
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
| audit-02-05 | LOW | Input validation | 形式上はaddressだがchecksumが不正なmixed-case addressはserviceの`getAddress`で例外となり、400ではなく500になる。 | HTTP境界でlowercase、uppercase、正しいEIP-55を受理し、不正mixed-caseを`INVALID_REQUEST`へ正規化した。 | closed |
| audit-02-06 | LOW | Chain diagnostics | activation時のtransaction取得errorをすべて`TRANSACTION_NOT_CONFIRMED`へ変換するため、RPC障害と未確定を区別できない。 | 安全な失敗は維持しつつ、内部診断で原因を区別する。 | open |
| audit-02-07 | MEDIUM | Proof freshness | Proof生成中にPolicyが更新されると旧versionのProofを200で返し得る。 | Proof生成後にactive version、Commitment、オンチェーン状態、Tokenを再検証し、競合race testを追加した。 | closed |
| audit-02-08 | LOW | Activation race | receipt確認中にpendingが置換されるとrepository errorが500になる。 | pending消失をtyped conflictとしてrollbackし、Token競合は401、それ以外は409へ正規化した。 | closed |
| audit-02-09 | LOW | Counter bounds | 最大nonce消費と安全整数外versionで次状態が表現不能になり得る。 | HTTP、service、SQLite transaction内でnonce/version上限を事前拒否し、状態不変testを追加した。 | closed |
| audit-02-10 | LOW | Numeric validation | 非数値文字列がZod refinement内の`BigInt`例外となり500を返す。 | 正規表現と`BigInt`変換を短絡評価し、malformed nonce/valueを400にするtestを追加した。 | closed |
| audit-02-11 | LOW | Contract coverage | `u128`成功上限域と送金call失敗時の双方残高不変が直接testされていない。 | 成功fuzzを`uint128`へ拡張し、送信元・受取先残高の不変assertを追加した。 | closed |
| audit-02-12 | LOW | Documentation | nonce/versionと保存metadataの記述が実装からdriftしていた。 | Planningをnonce/version分離へ合わせ、Wikiから未実装timestampを削除してlint logへ記録した。 | closed |

## 再監査

- Story自己監査後、統合済みEpicをarchitecture/ZK、Contract/transaction/E2E、API/CLI/securityの3観点で独立監査した。
- 第1修正ラウンド`4d64a9d`でProof freshness、pending置換競合、counter境界、Contract test、Planning/Wiki driftを解消した。
- 第2修正ラウンド`22b609b`で非数値入力の500とaddress互換性を解消した。
- 各ラウンド後の独立再監査で新規regressionがなく、最終的なCRITICAL/HIGH/MEDIUM残件が0件であることを確認した。

## 最終結果

- CRITICAL/HIGH残件: 0
- MEDIUM残件: 0
- 受容したLOW残件: 2（ローカルPoCの安全な内部diagnostics）
- 判定: passed

# ZK Policy Enforcement Layer ロードマップ

AIエージェントが提案したトランザクションに対し、秘密の支出ポリシーをZK Proofで検証し、条件を満たす場合だけSmart Accountから実行できる仕組みを段階的に開発する。

## Epic

| Phase | Epic | Status |
| --- | --- | --- |
| 1 | [epic-01: 1回あたりの支出上限を使ったZK決済](epics/epic-01-zk-payment.md) | done |
| 2 | [epic-02: Policy管理・Proof生成API](epics/epic-02-policy-management-proof-api.md) | review |
| 3 | [epic-03: ERC-4337対応](epics/epic-03-erc4337.md) | approved |
| 4 | Claude Code・Codex接続 | 未計画 |
| 5 | 攻撃・異常系の検証 | 未計画 |
| 6 | 複数ポリシー対応 | 未計画 |

## 1. 単一条件のZK PoC

詳細なスコープ、設計判断、検証結果は[epic-01](epics/epic-01-zk-payment.md)を正本とする。

- 「1回あたりの支出上限」を証明するZK Circuitを実装する
- ローカルでProofを生成する
- Solidity VerifierでProofを検証する
- 検証成功時だけContract Walletからnative tokenを送金する
- 上限以内の送金成功と、上限超過時の拒否を確認する

## 2. Policy管理・Proof生成API

詳細なスコープと設計判断は[epic-02](epics/epic-02-policy-management-proof-api.md)を正本とする。

- Ownerが支出上限Policyを作成・更新する
- EIP-712署名、API nonce、有効期限でPolicy更新を認可する
- 秘密のPolicyを暗号化してOff-chainへ保存する
- OwnerのTransactionでpolicyCommitmentをContract Walletへ登録する
- Policy単位のTokenで同期Proof生成APIを利用する
- API経由で生成したProofを使ってローカル決済を実行する

## 3. ERC-4337対応

詳細なスコープと設計判断は[epic-03](epics/epic-03-erc4337.md)を正本とする。

- Proof付きUserOperationを構築する
- Smart Accountが実際の支出額を使ってProofを検証する
- Bundler経由で決済を実行する
- ZK CircuitとProof生成APIはERC-4337の実装に依存させない

## 4. Claude Code・Codex接続

- Claude CodeとCodexが自然言語の依頼からTransaction Intentを生成する
- Payment CLIまたはMCP Serverを通じて決済機能を呼び出す
- 決定論的な処理でProof取得、UserOperation構築、送信を行う
- Claude CodeとCodexには秘密の支出ポリシーやOwner Keyを渡さない

## 5. 攻撃・異常系の検証

- 包括的な攻撃・異常系の検証は、基本的な決済フローの完成後に行う
- 上限を超えるトランザクションが拒否されることを確認する
- 不正なProofや改ざんされたリクエストが拒否されることを確認する
- Prompt InjectionによるClaude Code・Codexからの不正な送金提案がオンチェーンで拒否されることを確認する

## 6. 複数ポリシー対応

次の順番で条件を追加する。

1. トランザクションの有効期限
2. 送金先Addressのallowlist
3. TokenおよびContractのallowlist
4. 一定期間あたりの累積支出上限
5. Risk Score

## 開発方針

- 各Phaseの主要な正常系を確認してから次へ進む
- 包括的な攻撃・異常系の検証はPhase 5で行う
- 最初はnative tokenの単一送金だけを対象にする
- 汎用化や将来用の抽象化を先行して実装しない
- ZK、Proof API、Smart Account、Claude Code・Codex連携の責務を分離する

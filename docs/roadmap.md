# ZK Policy Enforcement Layer ロードマップ

AIエージェントが提案したトランザクションに対し、秘密の支出ポリシーをZK Proofで検証し、条件を満たす場合だけSmart Accountから実行できる仕組みを段階的に開発する。

## 1. 単一条件のZK PoC

- 「1回あたりの支出上限」を証明するZK Circuitを実装する
- ローカルでProofを生成する
- Solidity VerifierでProofを検証する
- 検証成功時だけContract Walletからnative tokenを送金する
- 上限以内の送金成功と、上限超過時の拒否を確認する

## 2. Policy管理・Proof生成API

- ユーザーが支出上限Policyを作成・更新できるAPIを実装する
- Policy CLIでsaltとpolicyCommitmentを生成する
- Owner EOAがPolicy更新リクエストをEIP-712で署名する
- Policy APIがOwner、nonce、有効期限、policyCommitmentを検証する
- 秘密のPolicyをOff-chainに保存する
- Ownerが署名したTransactionでpolicyCommitmentをContract Walletへ登録する
- 支出額とPolicy IDを受け取るProof生成APIを実装する
- クライアントへProofとPublic Inputを返す
- API経由で生成したProofを使ってPhase 1と同じ決済を実行する

## 3. ERC-4337対応

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

# Claude Code送金デモ手順書

Claude Codeへの自然言語の依頼から、専用MCPツールで正常系・異常系を実行します。対象はローカルAnvil（chain ID `31337`）です。

| 項目 | 正常系 | 異常系 |
| --- | --- | --- |
| 送金上限 | 0.1 ETH | 0.1 ETH |
| ユーザーの依頼金額 | 0.1 ETH | 0.1 ETH |
| proofの対象金額 | 0.1 ETH | 0.1 ETH（新規生成） |
| 実行金額 | 0.1 ETH | MCP内部で0.2 ETHへ変更 |
| 期待する送金結果 | success | reverted |
| 受取先の残高差分 | +0.1 ETH | 0 ETH |
| 日次利用額の差分 | +0.1 ETH | 0 ETH |

異常系はMCP内部で金額の改ざんを模擬します。Claude自身が金額を間違える実験ではありません。両方ともOwnerからSmart Accountを直接呼び出し、オンチェーンのproof検証を通します。ERC-4337のBundlerは使用しません。失敗時もOwner EOAのガス代とnonceは消費されます。

## 1. 事前準備

必要なツールをインストールし、Claude Codeへのログインを済ませてください。

- Node.js：23.3.0
- pnpm：10.18.1
- Nargo：1.0.0-beta.26
- Barretenberg（bb）：5.2.0
- Foundry（forge・anvil）：1.5.1
- Claude Code：`claude`コマンドが利用可能なこと

リポジトリ直下で依存関係をインストールします。

```bash
cd /Users/takumaabe/workspace/zk-policy-poc
pnpm install --frozen-lockfile
```

デモは複合ポリシー版のコミット`5285f00ee11206adba421002944ac1aa0f69a8f6`を固定して使用します。このコミットがローカルのGit履歴に必要です。起動ごとに`.runtime/run-XXXXXX/`へ展開し、デモコードと設定をコピーします。作業ブランチの切り替えは不要です。

## 2. 自動検証（初回・事前リハーサル）

```bash
pnpm demo:check
```

準備→0.1 ETHの対話入力→送金の3段階を自動実行し、Claudeを介さずMCPクライアントから両ツールを呼び、送金結果・残高・日次利用額・実行順序・重複拒否を確認します。成功すると`PASS: MCP正常系・異常系・順序制御・重複拒否`が表示されます。

## 3. 3コマンドでデモを進める

リポジトリ直下の同じターミナルで、順番に実行します。

```bash
pnpm demo:prepare
pnpm demo:policy
pnpm demo:claude
```

1. **開発時 — demo:prepare**：固定コミットの回路・Verifierをビルドし、Anvil、Policy API、Verifier・Smart Accountなどを準備します。テスト用ETHを2 ETH入金し、ローカルサービスをバックグラウンドで維持してコマンドが終了します。この段階ではポリシーは登録しません。
2. **設定時 — demo:policy**：ブラウザーのオーナーコンソールを開きます。「ウォレットを接続」でMetaMaskなどに接続し、1回あたりのETH上限（例：`0.1`）を設定します。次の画面に表示されたcommitmentを確認し、「このコミットメントを登録する」を押すとAPI登録・Smart Account更新・activateを実行します。画面にはpolicyId、policyVersion、commitment、txHashを表示します。
3. **送金時 — demo:claude**：準備・登録済みの環境を引き継いでClaude Codeを起動します。以下の正常系・異常系の依頼で証明を生成し、送金を実行します。終了時にローカルサービスも停止します。

デモの送金額は0.1 ETHに固定されているため、設定する上限は0.1 ETH以上が必要です。0.1 ETHを設定すれば上限ちょうどの正常系になります。0.1 ETH未満は登録前に拒否します。

起動時にRPC URL、アカウント、送金先、結果ファイルのパス、入力用プロンプトが表示されます。単体の `pnpm policy:create` は従来の環境変数で任意のローカル環境に接続します。

途中で中止する場合は `pnpm demo:stop` を実行します。準備した環境は1時間で自動停止します。準備済み環境への二重登録や、設定前のClaude起動は拒否します。登録に失敗した場合は停止して準備からやり直してください。

UIは有効期限、送金先、トークン・資産、日次上限、コントラクトの各ポリシー項目も表示しますが、このデモでは変更不可です。ブラウザーから送る設定値は1回あたりのETH上限だけで、その他は既存のデモ用policy.jsonを引き継ぎます。

確認画面を表示した時点では、commitmentの計算だけを行います。APIのnonce取得・署名・登録・オンチェーン送信は確認ボタンを押した後に行い、表示済みのcommitmentを再計算せず使用します。設定画面へ戻った場合は新しいcommitmentを作成できます。ログインはデモ用の仮実装です。ウォレット拡張がないブラウザーでは、「ウォレットを接続」を押すとデモ用セッションで設定画面へ進みます。拡張がある場合は実際の接続を要求し、キャンセル時は進みません。接続したウォレットのアドレスだけを受け取り、署名による本人確認やOwnerとの一致確認は行いません。接続ウォレットは任意で、登録・送信にはバックエンドのローカルAnvil用Ownerキーを使います。秘密鍵をブラウザーへ入力する必要はありません。セッションは1時間で期限切れになります。

ブラウザーが自動で開かない場合は、コマンドに表示されたURLを開いてください。従来のターミナル入力は `pnpm demo:policy --cli` で利用できます。`demo:check` はこのCLI経路を使って送金を検証します。

接続用の認証情報は実行ディレクトリ内の `demo-connection.json` に所有者だけが読める権限で保存し、終了時に削除します。Policy APIのtokenはサービスのメモリで保持し、完了出力には含めません。

## 4. 正常系：上限ちょうどの送金

Claude Codeに入力します。

```text
0x0000000000000000000000000000000000001234 に0.1 ETH送って。送れたか教えて。
```

Claudeが`demo_pay_valid`を1回呼び出します。0.1 ETHのproofを生成して0.1 ETHを送金し、成功・受取先の残高が0.1 ETH増加したことを確認します。

## 5. 異常系：proof生成後に送金額を変更

正常系の完了後、同じClaude Codeに入力します。

```text
0x0000000000000000000000000000000000001234 に0.1 ETH送って。今回は金額改ざんデモモードで実行して、結果を教えて。失敗しても再送しないで。
```

Claudeが`demo_pay_tampered_amount`を1回呼び出します。

1. 現在の状態に対して新しい0.1 ETHのproofを生成
2. そのproofで0.1 ETHの実行シミュレーションが成功することを確認
3. 金額を0.2 ETHに変えた公開入力をVerifierが拒否することを確認
4. 同じproofを保持したまま、実行金額だけ0.2 ETHにしてトランザクションを送信
5. revert・受取先残高と日次利用額の不変を確認

proofの有効期限切れやガス不足などを、期待した異常系の成功として扱いません。Claudeに表示された証明対象金額・実行金額・トランザクション結果・残高差分を確認してください。

## 6. castでRPCから正常系・異常系を確認

両方のデモを実行した後、Claude Codeを終了せず、別のターミナルを開きます。
AnvilのRPC URLは固定で`http://127.0.0.1:8545`です。`/exit`するとAnvilが停止するため、その前に確認してください。

リポジトリ直下で、起動時に表示された結果ファイルのパスを指定します。
`run-XXXXXX`は今回の実行ディレクトリに置き換えてください。過去の実行のハッシュは再起動後のAnvilでは照会できません。

```bash
cd /Users/takumaabe/workspace/zk-policy-poc
DEMO_RPC_URL=http://127.0.0.1:8545
DEMO_RESULTS=demos/claude-payment/.runtime/run-XXXXXX/demo-results.jsonl

NORMAL_TX=$(node -e 'const fs = require("node:fs"); const rows = fs.readFileSync(process.argv[1], "utf8").trim().split("\n").map(JSON.parse); console.log(rows.find(row => row.scenario === "normal").transactionHash);' "$DEMO_RESULTS")
TAMPERED_TX=$(node -e 'const fs = require("node:fs"); const rows = fs.readFileSync(process.argv[1], "utf8").trim().split("\n").map(JSON.parse); console.log(rows.find(row => row.scenario === "tampered_amount").transactionHash);' "$DEMO_RESULTS")
```

結果ファイルはハッシュの取得に使い、成否は次のコマンドでRPCから取得したレシートを確認します。

正常系：

```bash
cast receipt "$NORMAL_TX" --rpc-url "$DEMO_RPC_URL"
```

`status`が`1 (success)`であることを確認します。

異常系：

```bash
cast receipt "$TAMPERED_TX" --rpc-url "$DEMO_RPC_URL"
```

`status`が`0 (failed)`であることを確認します。これは金額改ざんによりトランザクションがrevertした期待どおりの結果です。
`cast receipt`自体の終了コードではなく、レシートの`status`で判定してください。
レシートだけではrevertの原因までは確定できないため、金額改ざんの検証結果はデモの出力と併せて確認します。

標準の送金先の残高もRPCで確認できます。

```bash
cast balance 0x0000000000000000000000000000000000001234 \
  --ether --rpc-url "$DEMO_RPC_URL"
```

新しいデモ環境で正常系→異常系を各1回実行した場合、期待残高は`0.1 ETH`です。
正常系で0.1 ETH増え、異常系では増えません。送金先を変更した場合は、起動時に表示されたアドレスへ置き換えてください。

## 7. 終了・結果確認・再実行

Claude Codeに入力します。

```text
/exit
```

両方の実行記録がそろっていれば完了メッセージが表示され、ローカルサービスが停止します。結果は起動時に表示された実行ディレクトリの`demo-results.jsonl`に保存されます。

```text
demos/claude-payment/.runtime/run-XXXXXX/demo-results.jsonl
```

結果にはトランザクションハッシュや残高差分を記録します。proof本体・秘密鍵・ポリシー認証トークンは含めません。

正常系→異常系の順に各1回実行してください。やり直す場合は終了して`pnpm demo:prepare` → `pnpm demo:policy` → `pnpm demo:claude`を再実行します。新しいAnvil環境で初期状態から開始します。

## ポリシーの手動設定

起動前に[policy.json](policy.json)を編集します。送金先には`recipientAllowlist`の先頭のアドレスを使用し、起動時のプロンプトにも反映します。送金先を変えた場合は、上記の固定例ではなく起動時に表示されるプロンプトを使ってください。

1回のnative ETH上限はdemo:policyの対話入力で置き換えます。有効期間は300秒以上、日次上限は両シナリオの証明を生成できる0.2 ETH以上、日次制限は有効にしてください。JSON内の金額はwei単位の文字列です。標準設定の日次上限は1 ETHです。

## 検証状況と起動時のエラー

型検査・シェル構文チェックは通過しています。2026-09-10、利用者の手元でClaude Code経由の正常系の送金成功と異常系のrevertを確認した旨の報告を受けています。作成環境ではNargoの依存キャッシュ書き込みとAnvil起動が制限されるため、作成者による実行の再確認は行っていません。別環境では`pnpm demo:check`で事前確認してください。

- ポート8545が使用中：既存のAnvilなどを終了してから再実行してください。別ポートへの自動切り替えは行いません。
- バージョン不一致：表示された要求バージョンへ合わせてください。
- `node_modules`がない：リポジトリ直下で`pnpm install --frozen-lockfile`を実行してください。
- Nargoのキャッシュ書き込み・Anvil起動の権限エラー：ローカルサービス起動とキャッシュ書き込みが許可された通常のターミナルで実行してください。
- `DEMO_ORDER_ERROR`：正常系→異常系の順に各1回だけ実行してください。再実行には環境の再起動が必要です。
- `DEMO_EXECUTION_ERROR`：期待結果は未確認です。再送せず環境を終了し、`pnpm demo:check`で切り分けてください。

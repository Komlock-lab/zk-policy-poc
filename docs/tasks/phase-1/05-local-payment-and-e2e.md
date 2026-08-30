# Task 05: ローカル決済とE2E

## 目的

ローカルAnvil上でProof生成からnative token送金までを確認する。

## 作業

- VerifierとAccountをviemでデプロイする
- Accountへローカルテスト資金を入金する
- 0.1 ETH上限に対する0.01 ETHのProofを生成して送金する
- 上限超過時にProofを生成できず送金されないことを確認する
- 送金先残高の差分を検証する
- localhost以外のRPC URLを拒否する

## 完了条件

- E2EテストがローカルAnvilだけを使用して成功する
- 正常系とチケット記載の異常系が検証される

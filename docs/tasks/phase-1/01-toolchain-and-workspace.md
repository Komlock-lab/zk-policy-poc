# Task 01: ツールチェーンとWorkspace

## 目的

Phase 1を再現可能にビルド・テストできるローカル開発環境を用意する。

## 作業

- Noir、Barretenberg、Foundry、Node.js、pnpmのバージョンを固定する
- pnpm workspaceとTypeScriptのstrict設定を作成する
- Circuit、Contract、TypeScript、E2Eを実行するroot scriptを定義する
- 一時的なProof、VK、ビルド成果物をGit管理対象外にする
- RPC接続先をローカルAnvilに限定する

## 完了条件

- 固定バージョンとセットアップ方法がリポジトリから確認できる
- rootから各ビルド・テストを実行できる

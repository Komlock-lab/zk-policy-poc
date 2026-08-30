---
id: task-01-01-01
type: task
title: ツールチェーンとWorkspace
story: story-01-01
status: done
blocked_by: []
created: 2026-08-30
updated: 2026-08-30
---

# ツールチェーンとWorkspace

## 目的

Phase 1を再現可能にビルド・テストできるローカル開発環境を用意する。

## 作業

- Noir、Barretenberg、Foundry、Node.js、pnpmのバージョンを固定する。
- pnpm workspaceとTypeScript strict設定を作成する。
- Circuit、Contract、TypeScript、E2Eを実行するroot scriptを定義する。
- 一時的なProof、VK、ビルド成果物をGit管理対象外にする。
- RPC接続先をローカルAnvilに限定する。

## 完了条件

- 固定バージョンとセットアップ方法をリポジトリから確認できる。
- rootから各ビルド・テストを実行できる。

## 検証方法

- `bash scripts/check-toolchain.sh`
- `pnpm typecheck`

## 検証結果

- Nargo 1.0.0-beta.26、Barretenberg 5.2.0、Foundry 1.5.1、Node.js 23.3.0、pnpm 10.18.1の一致を確認した。
- TypeScript typecheckが成功した。

## Blocked

なし。

---
id: task-02-02-03
type: task
title: Policy更新CLI
story: story-02-02
status: done
blocked_by: [task-02-02-02]
created: 2026-09-04
updated: 2026-09-04
---

# Policy更新CLI

## 目的

Ownerが既存Policy IDを維持したまま上限を更新できるようにする。

## 作業

- context取得、新しい秘密値生成、PolicyUpdate署名、API登録を実装する。
- Account更新TxとAPI確定を一連で実行する。
- 途中失敗時にpending状態とtx hashを明示する。

## 完了条件

- CLIでPolicy versionが増加し、新Commitmentがactiveになる。

## 検証方法

- CLI update integration test

## 検証結果

`pnpm test:unit`のCLI 5件と`pnpm test:e2e`のPolicy更新scenarioが成功。CLIがPolicy ID、APIが返す正のversion、pending statusを検証し、署名済みCommitmentからcalldataを再構築してAPI応答との一致後に送信することを確認した。API認可nonceとPolicy versionは独立して扱い、既存pendingの置換やToken再発行後の更新でも手入力versionへ依存しない。送信・receipt待機・active化失敗時のerrorにはpending versionと、取得済みの場合はtx hashを含める。

## Blocked

なし。

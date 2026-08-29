# Contracts Guidelines

- 実際に実行する値をProof検証のPublic Inputに使用する
- 認証とPolicy検証を別の責務として扱う
- 外部呼び出しの前に状態更新と検証を完了する
- 生成されたSolidity Verifierを手動編集しない
- revert理由にはcustom errorを使用する
- Unitテストに加えてfuzz testを使用する

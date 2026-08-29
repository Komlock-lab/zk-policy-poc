# Apps Guidelines

- TypeScriptはstrict modeを使用する
- 外部入力は境界でZod Schemaを使って検証する
- Handlerにはtransport処理だけを置き、Proof生成やTransaction構築を分離する
- 秘密のPolicyや秘密鍵をログへ出力しない
- Provider固有の処理をドメインロジックへ持ち込まない

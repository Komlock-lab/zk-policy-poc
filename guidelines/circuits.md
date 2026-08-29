# Circuits Guidelines

- Public InputとPrivate InputをCircuitごとに明記する
- 制約を追加するときは正常系と制約違反のテストを追加する
- witnessの計算だけでなく、値がCircuit上で拘束されていることを確認する
- Circuitの変更時にサイズとProof生成時間を計測する
- CircuitとProving Backendのバージョンを固定する

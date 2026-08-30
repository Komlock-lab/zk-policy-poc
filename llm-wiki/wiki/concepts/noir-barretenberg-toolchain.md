---
title: Noir and Barretenberg Toolchain
type: concept
tags: [noir, nargo, barretenberg, reproducibility]
sources: [noir-installation, noirup, bbup]
updated: 2026-08-30
---

# Noir and Barretenberg Toolchain

Noir/NargoはCircuit frontend、Barretenberg/BBはProof生成と検証を担うbackendである。両者の互換性と出力artifactはversion依存なので、Circuit、Proof、Verification Key、Solidity Verifierを同じ固定toolchainから生成する。

## Project baseline

- Noir / Nargo: `1.0.0-beta.26`
- Barretenberg / bb / bb.js: `5.2.0`
- Proving scheme: UltraHonk
- EVM verifier transcript: Keccak
- Baseline recorded: 2026-08-30

## Operational rule

1. noirupとbbupの公式installerを確認して導入する。
2. repositoryの固定versionを使う。
3. `nargo --version`と`bb --version`をbuild前に検証する。
4. どちらかを更新したらCircuit artifactからSolidity Verifierまで再生成し、E2Eを再実行する。

## Sources

- [[noir-installation]]
- [[noirup]]
- [[bbup]]

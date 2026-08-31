---
title: BBup
author: AztecProtocol
published: unknown
type: article
source: https://github.com/AztecProtocol/aztec-packages/blob/next/barretenberg/bbup/README.md
retrieved: 2026-08-30
tags: [barretenberg, bb, noir, proving-backend, installer]
---

# BBup

## TL;DR

bbupはNoirと組み合わせるBarretenberg backendのinstallerで、Noir互換versionまたは明示したbb versionを導入できる。

## Key claims

- bbupはBarretenberg proving backendを導入する。
- 引数なしではinstalled Noirに対応するversionを選べる。
- `-v`でbb version、`-nv`でNoir versionを指定できる。

## Technical details

- Phase 1は`bbup -v 5.2.0`を使用する。
- `bb --version`を実行してversion一致を確認する。

## Limitations and caveats

- sourceはnext branchであり、optionや互換性対応は更新される可能性がある。
- Circuit artifact、Proof、Verification Key、Solidity Verifierはtoolchain versionと一体で扱う。

## Project relevance

- [[noir-barretenberg-toolchain]]のproving backend導入とversion pinを裏付ける。

## Related concepts

- [[noir-barretenberg-toolchain]]

## Source

- [Raw clipping](../../raw/articles/bbup.md)
- https://github.com/AztecProtocol/aztec-packages/blob/next/barretenberg/bbup/README.md

---
title: noirup
author: noir-lang
published: unknown
type: article
source: https://github.com/noir-lang/noirup
retrieved: 2026-08-30
tags: [noir, nargo, toolchain, installer]
---

# noirup

## TL;DR

noirupはNargo toolchainの導入元とversionを選択するinstallerであり、localとCIの再現性には固定version指定が必要である。

## Key claims

- release versionだけでなくbranch、fork、PR、commit、local sourceを選べる。
- GitHub Actionを使う場合もaction tagとtoolchain versionを固定する余地がある。

## Technical details

- Phase 1は`noirup --version 1.0.0-beta.26`を使用する。
- `nargo --version`を実行してversion一致を確認する。

## Limitations and caveats

- READMEはmain branchのため内容が更新される。
- local source導入では一部version指定optionが無視される。

## Project relevance

- [[noir-barretenberg-toolchain]]のNargo導入を再現する根拠になる。

## Related concepts

- [[noir-barretenberg-toolchain]]

## Source

- [Raw clipping](../../raw/articles/noirup.md)
- https://github.com/noir-lang/noirup

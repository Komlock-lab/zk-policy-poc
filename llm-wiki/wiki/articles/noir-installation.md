---
title: Noir Installation
author: Noir Documentation
published: unknown
type: article
source: https://noir-lang.org/docs/installation
retrieved: 2026-08-30
tags: [noir, nargo, toolchain, installation]
---

# Noir Installation

## TL;DR

Noir公式はNargoの導入とversion切り替えにnoirupを案内している。再現可能なCircuit buildではnightlyではなく特定versionを固定する。

## Key claims

- noirupはNargoの公式導入経路である。
- version、branch、repository、PR、commit、local sourceを選択できる。
- Phase 1の基準versionはNoir `1.0.0-beta.26`である。

## Technical details

- `noirup --version 1.0.0-beta.26`で固定versionを導入する。
- 導入後は`nargo --version`を検証し、Circuit artifactの再現条件に含める。

## Limitations and caveats

- 公式ページとinstallerは更新されるため、コマンドと互換性を取得日ごとに確認する。
- Windowsのnative binary制約など、platform差異がある。

## Project relevance

- `.tool-versions`と`check-toolchain.sh`でNoir versionを固定する根拠になる。
- [[noir-barretenberg-toolchain]]のfrontend側導入手順を裏付ける。

## Related concepts

- [[noir-barretenberg-toolchain]]

## Source

- [Raw clipping](../../raw/articles/noir-installation.md)
- https://noir-lang.org/docs/installation

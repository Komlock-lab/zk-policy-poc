---
title: BBup
source: https://github.com/AztecProtocol/aztec-packages/blob/next/barretenberg/bbup/README.md
publisher: AztecProtocol
published: unknown
retrieved: 2026-08-30
document_version: next branch
---

# BBup

## Preserved material

- bbupはNoir frontendと組み合わせるBarretenberg proving backendのinstallerである。
- 引数なしでは現在のNoirと互換性のあるbbを選択できる。
- `-v`でbbの特定version、`-nv`でNoir versionに対応するbbを指定できる。
- Phase 1ではbb `5.2.0`を明示的に固定し、`bb --version`で確認した。

```bash
bbup -v 5.2.0
bb --version
```

## Capture note

sourceはnext branchで更新される可能性がある。互換性とCLI optionは2026-08-30時点の資料として記録する。

#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
circuit_dir="$repo_root/circuits/spend-limit"
generated_dir="$repo_root/contracts/src/verifiers/generated"

command -v nargo >/dev/null || { echo "nargo is required" >&2; exit 1; }
command -v bb >/dev/null || { echo "bb is required" >&2; exit 1; }
bash "$repo_root/scripts/check-toolchain.sh"

cd "$circuit_dir"
nargo compile
bb write_vk -b target/spend_limit.json -o target --verifier_target evm

mkdir -p "$generated_dir"
bb write_solidity_verifier \
  -k target/vk \
  --verifier_target evm \
  --optimized \
  -o "$generated_dir/SpendLimitVerifier.sol"

#!/usr/bin/env bash
set -euo pipefail

require_version() {
  local command_name="$1"
  local expected="$2"
  local actual

  command -v "$command_name" >/dev/null || {
    echo "$command_name is required at version $expected" >&2
    exit 1
  }

  actual="$($command_name --version 2>&1)"
  if [[ "$actual" != *"$expected"* ]]; then
    echo "$command_name version mismatch: expected $expected, got $actual" >&2
    exit 1
  fi
}

require_version nargo "1.0.0-beta.26"
require_version bb "5.2.0"
require_version forge "1.5.1"
require_version node "23.3.0"
require_version pnpm "10.18.1"

#!/usr/bin/env bash
set -euo pipefail
DEMO_SOURCE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEMO_ROOT="$(git -C "$DEMO_SOURCE" rev-parse --show-toplevel)"
DEMO_REV=5285f00ee11206adba421002944ac1aa0f69a8f6
export PATH="$HOME/.nvm/versions/node/v23.3.0/bin:$HOME/.nargo/bin:$HOME/.bb:$HOME/.foundry/bin:$HOME/.local/bin:$PATH"
printf "\n────────────────────────────────────────────────────────────────\n  起動ログ / ツールチェーン・ビルド・ローカル環境の準備\n────────────────────────────────────────────────────────────────\n\n"
bash "$DEMO_ROOT/scripts/check-toolchain.sh"
command -v anvil >/dev/null
if [[ ! -d "$DEMO_ROOT/node_modules" ]]; then
  echo "先にリポジトリ直下で pnpm install --frozen-lockfile を実行してください。" >&2
  exit 1
fi
if [[ "${1:-}" != "--self-test" && "${1:-}" != "--prepare-only" ]]; then command -v claude >/dev/null; fi
mkdir -p "$DEMO_SOURCE/.runtime"
DEMO_RUN="$(mktemp -d "$DEMO_SOURCE/.runtime/run-XXXXXX")"
git -C "$DEMO_ROOT" archive "$DEMO_REV" | tar -x -C "$DEMO_RUN"
cp "$DEMO_ROOT/scripts/lib/anvil.ts" "$DEMO_RUN/scripts/lib/anvil.ts"
mkdir -p "$DEMO_RUN/demos/claude-payment"
cp "$DEMO_SOURCE/"*.ts "$DEMO_SOURCE/tsconfig.json" "$DEMO_SOURCE/policy.json" "$DEMO_RUN/demos/claude-payment/"
cp -R "$DEMO_SOURCE/prompts" "$DEMO_RUN/demos/claude-payment/"
ln -s "$DEMO_ROOT/node_modules" "$DEMO_RUN/node_modules"
cd "$DEMO_RUN"
printf "Demo source: %s\nRuntime: %s\n" "$DEMO_REV" "$DEMO_RUN"
pnpm exec tsc -p demos/claude-payment/tsconfig.json
if [[ "${1:-}" == "--prepare-only" ]]; then exit 0; fi
pnpm build
exec node --experimental-sqlite --import tsx demos/claude-payment/run.ts "$@"

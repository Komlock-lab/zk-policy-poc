#!/usr/bin/env bash
set -euo pipefail
DEMO_SOURCE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEMO_ROOT="$(git -C "$DEMO_SOURCE" rev-parse --show-toplevel)"
DEMO_REV=5285f00ee11206adba421002944ac1aa0f69a8f6
export PATH="$HOME/.nvm/versions/node/v23.3.0/bin:$HOME/.nargo/bin:$HOME/.bb:$HOME/.foundry/bin:$HOME/.local/bin:$PATH"
DEMO_MODE="${1:-claude}"
case "$DEMO_MODE" in
  policy|claude|stop)
    if [[ ! -f "$DEMO_SOURCE/.runtime/current" ]]; then
      echo "先に pnpm demo:prepare を実行してください。" >&2
      exit 1
    fi
    DEMO_NAME="$(cat "$DEMO_SOURCE/.runtime/current")"
    if [[ ! "$DEMO_NAME" =~ ^run-[A-Za-z0-9]+$ ]]; then exit 1; fi
    cd "$DEMO_SOURCE/.runtime/$DEMO_NAME"
    if [[ "$DEMO_MODE" == "claude" && "${2:-}" != "--self-test" ]]; then command -v claude >/dev/null; fi
    exec node --experimental-sqlite --import tsx demos/claude-payment/steps.ts "$DEMO_MODE" "${@:2}"
    ;;
  prepare|--self-test|--prepare-only) ;;
  *) echo "Unknown demo command" >&2; exit 1 ;;
esac
if [[ "$DEMO_MODE" == "prepare" && -f "$DEMO_SOURCE/.runtime/current" ]]; then
  DEMO_NAME="$(cat "$DEMO_SOURCE/.runtime/current")"
  if [[ ! "$DEMO_NAME" =~ ^run-[A-Za-z0-9]+$ ]]; then exit 1; fi
  (cd "$DEMO_SOURCE/.runtime/$DEMO_NAME" && node --experimental-sqlite --import tsx demos/claude-payment/steps.ts assert-stopped)
fi
printf "\n────────────────────────────────────────────────────────────────\n  起動ログ / ツールチェーン・ビルド・ローカル環境の準備\n────────────────────────────────────────────────────────────────\n\n"
bash "$DEMO_ROOT/scripts/check-toolchain.sh"
command -v anvil >/dev/null
if [[ ! -d "$DEMO_ROOT/node_modules" ]]; then
  echo "先にリポジトリ直下で pnpm install --frozen-lockfile を実行してください。" >&2
  exit 1
fi
mkdir -p "$DEMO_SOURCE/.runtime"
DEMO_RUN="$(mktemp -d "$DEMO_SOURCE/.runtime/run-XXXXXX")"
git -C "$DEMO_ROOT" archive "$DEMO_REV" | tar -x -C "$DEMO_RUN"
cp "$DEMO_ROOT/scripts/lib/anvil.ts" "$DEMO_RUN/scripts/lib/anvil.ts"
cp "$DEMO_ROOT/apps/policy-cli/src/create-policy.ts" "$DEMO_ROOT/apps/policy-cli/src/policy-input.ts" "$DEMO_RUN/apps/policy-cli/src/"
mkdir -p "$DEMO_RUN/demos/claude-payment"
cp "$DEMO_SOURCE/"*.ts "$DEMO_SOURCE/tsconfig.json" "$DEMO_SOURCE/policy.json" "$DEMO_RUN/demos/claude-payment/"
cp -R "$DEMO_SOURCE/prompts" "$DEMO_RUN/demos/claude-payment/"
ln -s "$DEMO_ROOT/node_modules" "$DEMO_RUN/node_modules"
cd "$DEMO_RUN"
printf "Demo source: %s\nRuntime: %s\n" "$DEMO_REV" "$DEMO_RUN"
pnpm exec tsc -p demos/claude-payment/tsconfig.json
if [[ "${1:-}" == "--prepare-only" ]]; then exit 0; fi
pnpm build
if [[ "$DEMO_MODE" == "prepare" ]]; then
  node --experimental-sqlite --import tsx demos/claude-payment/steps.ts prepare
  basename "$DEMO_RUN" > "$DEMO_SOURCE/.runtime/current"
else
  node --experimental-sqlite --import tsx demos/claude-payment/steps.ts prepare
  trap 'if [[ -f demo-connection.json ]]; then node --experimental-sqlite --import tsx demos/claude-payment/steps.ts stop; fi' EXIT
  printf '0.1\n' | node --experimental-sqlite --import tsx demos/claude-payment/steps.ts policy
  node --experimental-sqlite --import tsx demos/claude-payment/steps.ts claude --self-test
fi

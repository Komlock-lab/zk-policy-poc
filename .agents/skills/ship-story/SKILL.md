---
name: ship-story
description: Verify and package one implemented Story by checking Tasks, acceptance evidence, architecture, security, tests, and knowledge updates before committing, pushing, and opening a PR to its Epic branch without merging it.
---

# Ship Story

Use this skill at the end of Story implementation, normally from `run-epic`. It creates a Story PR but never merges it.

## Required context

- Story document and Task directory
- Parent Epic document
- Accepted ADRs and relevant Wiki pages
- Epic base branch

Refuse to ship when the base is `main`, a Task is incomplete, Story scope changed without approval, or a required dependency Story is not `done` on the Epic branch.

## 1. Planning gate

1. Read `AGENTS.md`, `guidelines/planning.md`, the Story, Tasks, Epic, accepted ADRs, and relevant Wiki pages.
2. Confirm every Task is `done` and contains its actual verification result.
3. Run `node scripts/validate-planning.mjs`.
4. Map each Story acceptance criterion to a test or observed verification result. Record the mapping in the Story's `検証結果` section.

## 2. Scope and architecture gate

Review the diff against the Epic branch:

- Every changed file is required by the Story or its knowledge/plan updates.
- Implemented interfaces and data flow match accepted ADRs.
- Actual transaction values are bound to the correct public inputs.
- Authentication and policy verification remain separate responsibilities.
- No future-Epic abstraction or out-of-scope behavior was added.

Stop and return to planning if satisfying the Story requires changing its scope or an accepted ADR.

## 3. Quality gate

Derive commands from repository configuration and component guidelines rather than assuming one toolchain. Run all applicable checks:

- Formatting and static checks
- Build and TypeScript typecheck
- Changed unit and integration tests
- Noir compile, tests, and circuit size information when Circuit code changed
- Foundry formatting, unit, fuzz, and integration tests when Contract code changed
- Proof generation and verification when proving code changed
- Local Anvil E2E for observable blockchain behavior
- `git diff --check`

Do not accept a build-only result when runtime or E2E behavior changed. Record exact commands and results in the Story.

## 4. Security and reliability review

Inspect the diff for:

- Secrets, private policy values, private keys, and sensitive logs
- Remote RPC configuration or public-chain execution paths
- Missing boundary validation and unsafe numeric conversion
- Proof/public-input mismatch
- Authorization bypass, reentrancy ordering, or unsafe external calls
- Swallowed errors, non-deterministic fallback, and incomplete failure tests

Fix CRITICAL/HIGH findings and rerun affected checks. Do not ship with a known CRITICAL/HIGH issue.

## 5. Knowledge feedback

Persist only reusable discoveries:

- Use `ingest-paper` or `ingest-article` for source-backed domain/tool knowledge.
- Add a new ADR only when the architecture actually changed and the user approved it.
- Update `guidelines/` only for a normative rule that future changes must follow.
- Do not save code-derived facts or one-off debugging notes to the Wiki.

Run Wiki `lint` if Wiki pages changed.

## 6. Commit and PR

1. Confirm only intended files are staged.
2. Commit with a concise conventional message that includes the Story ID in the body.
3. Push the Story branch.
4. Create a PR targeting `epic/<epic-id>-<slug>`, never `main`.
5. Include Story scope, acceptance evidence, exact test results, architecture references, and knowledge updates in the PR body.
6. Return the PR URL to `run-epic` without merging or marking the Story `done`.

If any gate fails, report the failed command and recovery condition. `run-epic` owns retry, blocked-state, merge, and final Story status decisions.

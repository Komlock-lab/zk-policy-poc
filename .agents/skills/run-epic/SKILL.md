---
name: run-epic
description: Execute an approved Markdown Epic end to end by orchestrating dependency-aware Story worktrees, using ship-story for each Story, merging Story PRs into the Epic branch, auditing the integrated result, and opening a final PR to main.
---

# Run Epic

Use this skill only when the user explicitly asks to execute an approved Epic. That invocation authorizes the local development, branch, push, Story PR, Story-to-Epic merge, and final Epic PR operations described here. It never authorizes merging the Epic PR to `main` or operating on a public chain.

Treat invocation as an explicit request to create and pursue a Goal whose objective is the Epic's approved success criteria.

## 1. Resolve and validate

1. Resolve the requested file in `docs/epics/` by path, ID, or title.
2. Read `AGENTS.md`, `guidelines/planning.md`, the Epic, its accepted ADRs, Stories, Tasks, and only the Wiki pages they reference.
3. Run `node scripts/validate-planning.mjs`.
4. Require the Epic and all executable Stories to be `approved`. Stop if an ADR is not accepted or a planning placeholder remains.
5. Build dependency layers from Story `depends_on` values and print the graph.

## 2. Preflight before implementation

Verify before creating branches:

- The base is an up-to-date `main` and the planning worktree is clean.
- `.git` is writable and branch, worktree, commit, push, and PR operations are available.
- Required pinned toolchain versions are installed.
- Package installation and required external source access are available.
- Localhost processes and the repository's complete test commands can run.
- Blockchain execution is restricted to a non-forked local chain with chain ID `31337`.

Do not work around missing permissions in code. On failure, record the concrete preflight blocker and stop before implementation.

## 3. Create the Epic branch

Create `epic/<epic-id>-<slug>` from `main`, push it, change the Epic to `in-progress`, and commit that status on the Epic branch.

Every active Story must use a unique `story/<story-id>-<slug>` branch and an isolated worktree created from the current Epic branch. Never let two sessions share a branch or worktree.

## 4. Execute dependency layers

Process dependency layers in order. Explicit `run-epic` invocation permits parallel agents for independent Stories in the same layer.

For each executable Story:

1. Give the worker the Epic, Story, Task, accepted ADR, relevant Wiki paths, Epic branch, and safety boundary.
2. Change the Story to `in-progress`.
3. Re-check its Tasks against the current Epic branch. Refine implementation details when preceding Stories changed the code, but do not change Story scope or acceptance criteria without renewed user approval.
4. Execute Tasks in dependency order, updating each `pending → in-progress → done` and recording verification results.
5. Implement only the Story scope and follow component-specific guidelines.
6. Use `ship-story` to verify the Story and create a PR targeting the Epic branch.

After all workers in a layer return:

1. Merge each passing Story PR into the Epic branch.
2. Pull the integrated Epic branch and run the affected integration checks.
3. Change merged Stories to `done` and commit their status updates.
4. Start the next dependency layer only after its prerequisites are `done`.

## 5. Failure policy

- Retry the same failure cause at most twice.
- Mark a failed Story and its active Task `blocked`, recording the cause, completed work, failed command, and recovery condition.
- Do not start Stories that depend on a blocked Story.
- Continue independent Stories whose dependency chain remains satisfied.
- Do not create the Epic PR until every required Story is `done`.
- Never bypass permission, external-service, security, or acceptance gates with code changes.

## 6. Integrated Epic verification and audit

After all Stories are `done`:

1. Map every Epic and Story acceptance criterion to an observed result.
2. Run the complete repository build, typecheck, Circuit tests and size information, Contract unit and fuzz tests, API tests, and E2E tests that apply.
3. Run the approved happy path on local Anvil and confirm the observable state or balance changes.
4. Audit in parallel where agents are available:
   - ADR and architecture conformance
   - ZK constraints, public/private inputs, commitments, and proof binding
   - Contract authentication, state transitions, and external calls
   - API input validation, secret handling, error behavior, and reliability
5. Write `docs/audits/<epic-slug>.md` from `assets/audit.md`.
6. Convert CRITICAL/HIGH findings into remediation Tasks, fix them, and re-audit. Allow at most two audit iterations.
7. Mark the audit `passed` only with `CRITICAL/HIGH残件: 0`. Keep MEDIUM/LOW findings in the audit and final PR body.

## 7. Knowledge feedback

Before final delivery, classify durable discoveries:

- Source-backed reusable domain or tool knowledge → LLM Wiki
- Project architecture decision → ADR
- Normative implementation rule → `guidelines/`
- Code-derived or one-off debugging detail → do not persist

Run Wiki `lint` when Wiki pages changed.

## 8. Final PR

1. Run `node scripts/validate-planning.mjs` and every full Epic quality gate again.
2. Change the Epic to `review` and commit all audit and knowledge updates.
3. Push the Epic branch.
4. Create a PR targeting `main` with completed Stories, acceptance evidence, audit results, test commands, and remaining MEDIUM/LOW findings.
5. Do not merge the PR to `main`.

Report the final PR URL, Story results, audit result, and any retained worktrees. Mark the Goal complete only after the final PR exists and all required verification has passed.

## Safety boundary

Allowed by invocation: dependency installation, local services, non-forked Anvil, proof generation, benchmarks, tests, commits, pushes, Story PRs, Story-to-Epic merges, and the Epic PR.

Always requires separate explicit authorization: testnet or mainnet transactions, real assets, production changes, paid services, secret creation or exposure, scope expansion, and merging the Epic PR to `main`.

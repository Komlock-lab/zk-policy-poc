---
name: create-epic
description: Design a roadmap Phase as an Epic, obtain architecture approval, and create its complete Markdown-managed Epic, ADR, Story, dependency, and Task structure without implementing code.
---

# Create Epic

Use this skill when the user wants to plan a roadmap Phase or create the Stories required for an Epic. Phase and Epic are equivalent in this project.

Do not implement product code. The output is an approved, executable plan for `run-epic`.

## Required inputs

- The Phase or desired outcome
- Any references supplied by the user

Infer existing context from the repository before asking questions. Ask one unresolved topic at a time, offer two or three choices with a recommendation, and never decide a high-impact architecture choice on the user's behalf.

## Workflow

### 1. Discover context

1. Read `AGENTS.md`, `guidelines/planning.md`, `docs/roadmap.md`, existing Epic/Story/ADR documents, and relevant code.
2. Read `llm-wiki/wiki/index.md`, then only the Wiki pages connected to this Epic.
3. Read user-provided files and primary external references before general research.
4. Classify known facts, unresolved choices, constraints, and explicit exclusions.

### 2. Design the Epic architecture

Design the cross-Story architecture before decomposing work. Cover only applicable topics:

- Components and responsibilities
- Data and execution flow
- On-chain and off-chain boundary
- Authentication, authorization, secrets, and public inputs
- Circuit, Contract, API, and client interfaces
- State ownership and transitions
- External dependencies and pinned versions
- Failure and security boundaries
- Cross-Story invariants
- Current scope and future-Epic boundary

Create one `proposed` ADR per material decision using `assets/adr.md`. Present the architecture, alternatives, consequences, and ADR list to the user. Do not continue until the user approves it. Change approved ADRs to `accepted`.

### 3. Decompose into Stories and Tasks

1. Create exactly one Story per observable user action. A user may be an end user, developer, owner, client, or AI agent.
2. Give every Story normal and error acceptance criteria in Given/When/Then form. One error condition is one criterion.
3. Define explicit scope exclusions and link applicable Epic invariants, ADRs, and Wiki pages.
4. Build an acyclic dependency graph within the Epic. Do not create cross-Epic `depends_on` links.
5. Decompose every Story into bounded implementation Tasks. Include a verification method and observable completion condition for each Task.
6. Present the full Epic, Story list, Tasks, and dependency layers to the user. Apply requested changes and obtain final approval.

Use the templates in `assets/epic.md`, `assets/story.md`, and `assets/task.md`.

## Write outputs

After final approval, write all documents together:

```text
docs/epics/<epic-slug>.md
docs/adr/<number>-<slug>.md
docs/stories/<epic-id>/<story-slug>.md
docs/tasks/<story-id>/<task-slug>.md
```

- Set accepted ADRs to `accepted`.
- Set the Epic and every Story to `approved`.
- Set every Task to `pending`.
- Use stable lowercase kebab-case IDs and filenames.
- Update `docs/roadmap.md` only when the approved plan changes the roadmap.

Run:

```bash
node scripts/validate-planning.mjs
```

Do not finish until validation succeeds and no unresolved design decision remains. End by listing the Epic, Stories, Tasks, dependency layers, and the exact `run-epic` invocation.

## Knowledge handling

- Reuse Wiki knowledge instead of repeating it in Stories.
- Ingest newly researched, reusable, source-backed domain knowledge with `ingest-paper` or `ingest-article`.
- Put project architecture decisions in ADRs, normative implementation rules in `guidelines/`, and task-specific observations nowhere persistent.

---
name: ingest-paper
description: Ingest a user-selected academic paper into this project's LLM Wiki by preserving the source, creating a grounded summary, and updating related concept pages, the index, and the log.
---

# Ingest Paper

Use this skill when the user asks to add a paper or PDF to the project LLM Wiki.

## Workflow

1. Read `AGENTS.md`, `llm-wiki/wiki/index.md`, and the paper completely.
2. Preserve the original under `llm-wiki/raw/papers/`. Never edit or replace an existing raw file. If the requested filename already exists with different content, stop and report the conflict.
3. Create `llm-wiki/wiki/papers/<slug>.md` with frontmatter containing `title`, `authors`, `year`, `type: paper`, `source`, `added`, and `tags`.
4. Include: TL;DR, problem, approach, results, limitations, project relevance, related concepts, and source reference. Distinguish the paper's claims from your interpretation.
5. Extract only the concepts useful to this Wiki. For each concept:
   - Update an existing page in `llm-wiki/wiki/concepts/` when it represents the same concept.
   - Otherwise create a page with overview, established facts, cross-source insights, implementation implications, pitfalls, open questions, and related sources.
   - Add new cross-source conclusions only when the linked sources support them. Record conflicts instead of forcing agreement.
6. Update `llm-wiki/wiki/index.md` and append one entry to `llm-wiki/wiki/log.md`.
7. Check every added `[[wikilink]]` and report the pages created or updated.

Use lowercase kebab-case filenames. Do not add unrelated concepts merely to fill a quota.

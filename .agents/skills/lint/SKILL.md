---
name: lint
description: Check this project's LLM Wiki for structural drift, broken links, unsupported claims, conflicting concepts, stale technical knowledge, and missing connections.
---

# Lint LLM Wiki

Use this skill when the user asks to inspect or maintain the health of `llm-wiki/`.

## Checks

1. Confirm existing files under `llm-wiki/raw/` were not edited or deleted.
2. Find broken `[[wikilink]]` references and pages missing from `llm-wiki/wiki/index.md`.
3. Find orphan pages, duplicate concepts, inconsistent aliases, and filenames that are not lowercase kebab-case.
4. Check required frontmatter for paper, article, and query pages.
5. Identify factual claims that cannot be traced to source pages.
6. Identify contradictions between pages, preserving legitimate disagreement between sources.
7. Flag version-sensitive tooling or protocol knowledge whose recorded version or retrieval date is missing or stale.
8. Identify useful connections and open questions that existing pages imply but do not record.

Repair unambiguous structural issues directly. Present content merges, disputed claims, or deletions as proposals before changing them. Append applied maintenance to `llm-wiki/wiki/log.md`.

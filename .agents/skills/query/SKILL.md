---
name: query
description: Answer questions from this project's LLM Wiki, synthesize linked sources, expose knowledge gaps, and file reusable answers under the Wiki when appropriate.
---

# Query LLM Wiki

Use this skill for questions that should be answered from the accumulated project Wiki.

## Workflow

1. Read `llm-wiki/wiki/index.md` and search relevant source, concept, and prior query pages. Follow their `[[wikilink]]` connections rather than loading the entire Wiki.
2. Answer using only claims supported by the Wiki. Link each material conclusion to its supporting pages.
3. Separate established knowledge, project-specific inference, conflicting evidence, and unknowns. Do not silently fill a Wiki gap from model memory.
4. If the Wiki is insufficient, state the missing information and suggest sources to ingest.
5. Save the result in `llm-wiki/wiki/queries/<yyyy-mm-dd>-<slug>.md` only when the user requests it or the answer contains reusable cross-page synthesis. Add frontmatter with `title`, `date`, `type: query`, `tags`, and `sources`.
6. When saved, update `llm-wiki/wiki/index.md`, append to `llm-wiki/wiki/log.md`, and check new `[[wikilink]]` references.

Keep one-off operational answers in the conversation rather than growing the Wiki unnecessarily.

---
name: ingest-article
description: Ingest a user-selected Web article or official documentation page into this project's LLM Wiki, then update its grounded summaries and related concepts.
---

# Ingest Article

Use this skill when the user asks to add a Web article, blog post, or official documentation page to the project LLM Wiki.

## Workflow

1. Read `AGENTS.md`, `llm-wiki/wiki/index.md`, and the complete source page. Prefer official and primary sources for technical facts.
2. Preserve an immutable clipping under `llm-wiki/raw/articles/<slug>.md` containing source URL, title, author or publisher, publication date when available, retrieval date, and the user-provided material. Do not reproduce copyrighted content beyond what is necessary and permitted.
3. Create `llm-wiki/wiki/articles/<slug>.md` with frontmatter containing `title`, `author`, `published`, `type: article`, `source`, `retrieved`, and `tags`.
4. Include: TL;DR, key claims, technical details, limitations or caveats, project relevance, related concepts, and source reference. Record version-dependent information with its applicable version and retrieval date.
5. Update matching pages in `llm-wiki/wiki/concepts/`, or create a new concept page only when it will be reusable. Connect the article to existing sources through commonalities, differences, conflicts, or complementary evidence.
6. Update `llm-wiki/wiki/index.md` and append one entry to `llm-wiki/wiki/log.md`.
7. Check every added `[[wikilink]]` and report the pages created or updated.

Use lowercase kebab-case filenames. Never edit or replace an existing file in `llm-wiki/raw/`.

import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, test } from "node:test";

import { validatePlanning } from "./validate-planning.mjs";

const roots = [];

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

function createRoot() {
  const root = mkdtempSync(path.join(tmpdir(), "planning-validator-"));
  roots.push(root);
  return root;
}

function writeDocument(root, relativePath, frontmatter, body) {
  const filePath = path.join(root, relativePath);
  mkdirSync(path.dirname(filePath), { recursive: true });
  const metadata = Object.entries(frontmatter)
    .map(([key, value]) => `${key}: ${Array.isArray(value) ? `[${value.join(", ")}]` : value}`)
    .join("\n");
  writeFileSync(filePath, `---\n${metadata}\n---\n\n${body}\n`);
}

function writeValidPlan(root) {
  writeDocument(
    root,
    "docs/epics/phase-two.md",
    {
      id: "epic-02",
      type: "epic",
      title: "Phase two",
      status: "approved",
      created: "2026-08-30",
      updated: "2026-08-30",
      adrs: ["adr-0001"],
    },
    "# Phase two\n\n## ゴール\n\nPolicy management.",
  );
  writeDocument(
    root,
    "docs/adr/0001-policy-storage.md",
    {
      id: "adr-0001",
      type: "adr",
      title: "Policy storage",
      epic: "epic-02",
      status: "accepted",
      date: "2026-08-30",
    },
    "# Policy storage\n\n## Decision\n\nStore policies off-chain.",
  );
  writeDocument(
    root,
    "docs/stories/epic-02/create-policy.md",
    {
      id: "story-02-01",
      type: "story",
      title: "Create policy",
      epic: "epic-02",
      status: "approved",
      depends_on: [],
      adrs: ["adr-0001"],
      created: "2026-08-30",
      updated: "2026-08-30",
    },
    [
      "# Create policy",
      "",
      "- AC-1 [正常系]: Given valid input / When user creates / Then policy exists",
      "- AC-2 [異常系]: Given invalid input / When user creates / Then request fails",
      "- AC-3 [非機能]: secrets are not logged",
    ].join("\n"),
  );
  writeDocument(
    root,
    "docs/tasks/story-02-01/implement-policy.md",
    {
      id: "task-02-01-01",
      type: "task",
      title: "Implement policy",
      story: "story-02-01",
      status: "pending",
      blocked_by: [],
      created: "2026-08-30",
      updated: "2026-08-30",
    },
    "# Implement policy\n\n## 検証結果\n\n未実施。",
  );
}

test("accepts a consistent approved plan", () => {
  const root = createRoot();
  writeValidPlan(root);

  const result = validatePlanning(root);

  assert.deepEqual(result.errors, []);
  assert.equal(result.documentCount, 4);
});

test("rejects cyclic story dependencies", () => {
  const root = createRoot();
  writeValidPlan(root);
  writeDocument(
    root,
    "docs/stories/epic-02/update-policy.md",
    {
      id: "story-02-02",
      type: "story",
      title: "Update policy",
      epic: "epic-02",
      status: "draft",
      depends_on: ["story-02-01"],
      adrs: [],
      created: "2026-08-30",
      updated: "2026-08-30",
    },
    "# Update policy",
  );
  const firstStory = path.join(root, "docs/stories/epic-02/create-policy.md");
  const content = readFileSync(firstStory, "utf8").replace("depends_on: []", "depends_on: [story-02-02]");
  writeFileSync(firstStory, content);

  const result = validatePlanning(root);

  assert.ok(result.errors.some((error) => error.startsWith("story dependency cycle:")));
});

test("rejects an approved story without required criteria and tasks", () => {
  const root = createRoot();
  writeDocument(
    root,
    "docs/epics/phase-two.md",
    {
      id: "epic-02",
      type: "epic",
      title: "Phase two",
      status: "draft",
      created: "2026-08-30",
      updated: "2026-08-30",
      adrs: [],
    },
    "# Phase two",
  );
  writeDocument(
    root,
    "docs/stories/epic-02/create-policy.md",
    {
      id: "story-02-01",
      type: "story",
      title: "Create policy",
      epic: "epic-02",
      status: "approved",
      depends_on: [],
      adrs: [],
      created: "2026-08-30",
      updated: "2026-08-30",
    },
    "# Create policy",
  );

  const result = validatePlanning(root);

  assert.ok(result.errors.some((error) => error.includes("normal acceptance criterion")));
  assert.ok(result.errors.some((error) => error.includes("error acceptance criterion")));
  assert.ok(result.errors.some((error) => error.includes("non-functional acceptance criterion")));
  assert.ok(result.errors.some((error) => error.includes("at least one task")));
});

test("rejects review epic without completed stories and a passed audit", () => {
  const root = createRoot();
  writeValidPlan(root);
  const epic = path.join(root, "docs/epics/phase-two.md");
  const content = readFileSync(epic, "utf8").replace("status: approved", "status: review");
  writeFileSync(epic, content);

  const result = validatePlanning(root);

  assert.ok(result.errors.some((error) => error.includes("review epic has incomplete stories")));
  assert.ok(result.errors.some((error) => error.includes("review epic requires a passed audit")));
});

test("accepts a review epic with completed work and a passing audit", () => {
  const root = createRoot();
  writeValidPlan(root);

  const epic = path.join(root, "docs/epics/phase-two.md");
  writeFileSync(epic, readFileSync(epic, "utf8").replace("status: approved", "status: review"));

  const story = path.join(root, "docs/stories/epic-02/create-policy.md");
  writeFileSync(story, readFileSync(story, "utf8").replace("status: approved", "status: done"));

  const task = path.join(root, "docs/tasks/story-02-01/implement-policy.md");
  writeFileSync(
    task,
    readFileSync(task, "utf8")
      .replace("status: pending", "status: done")
      .replace("未実施。", "node --test: passed"),
  );

  writeDocument(
    root,
    "docs/audits/phase-two.md",
    {
      id: "audit-02",
      type: "audit",
      title: "Phase two audit",
      epic: "epic-02",
      status: "passed",
      date: "2026-08-30",
    },
    "# Phase two audit\n\n## 最終結果\n\n- CRITICAL/HIGH残件: 0",
  );

  const result = validatePlanning(root);

  assert.deepEqual(result.errors, []);
});

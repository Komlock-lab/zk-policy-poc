#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const DOCUMENT_TYPES = {
  epic: {
    directory: "epics",
    idPattern: /^epic-[a-z0-9][a-z0-9-]*$/,
    required: ["id", "type", "title", "status", "created", "updated", "adrs"],
    statuses: ["draft", "approved", "in-progress", "review", "done", "blocked"],
  },
  story: {
    directory: "stories",
    idPattern: /^story-[a-z0-9][a-z0-9-]*$/,
    required: [
      "id",
      "type",
      "title",
      "epic",
      "status",
      "depends_on",
      "adrs",
      "created",
      "updated",
    ],
    statuses: ["draft", "approved", "in-progress", "done", "blocked"],
  },
  task: {
    directory: "tasks",
    idPattern: /^task-[a-z0-9][a-z0-9-]*$/,
    required: [
      "id",
      "type",
      "title",
      "story",
      "status",
      "blocked_by",
      "created",
      "updated",
    ],
    statuses: ["pending", "in-progress", "done", "blocked"],
  },
  adr: {
    directory: "adr",
    idPattern: /^adr-[a-z0-9][a-z0-9-]*$/,
    required: ["id", "type", "title", "epic", "status", "date"],
    statuses: ["proposed", "accepted", "rejected"],
  },
  audit: {
    directory: "audits",
    idPattern: /^audit-[a-z0-9][a-z0-9-]*$/,
    required: ["id", "type", "title", "epic", "status", "date"],
    statuses: ["pending", "in-progress", "passed", "blocked"],
  },
};

const ACTIVE_EPIC_STATUSES = new Set(["approved", "in-progress", "review", "done"]);
const ACTIVE_STORY_STATUSES = new Set(["approved", "in-progress", "done"]);
const PLACEHOLDER_PATTERN = /(\bTODO\b|\bTBD\b|\{\{[^}]+\}\}|<[^>]+>)/i;

function listMarkdownFiles(directory) {
  if (!existsSync(directory)) {
    return [];
  }

  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return listMarkdownFiles(entryPath);
    }
    return entry.isFile() && entry.name.endsWith(".md") ? [entryPath] : [];
  });
}

function parseValue(rawValue) {
  const value = rawValue.trim();
  if (value === "[]") {
    return [];
  }
  if (value.startsWith("[") && value.endsWith("]")) {
    const inner = value.slice(1, -1).trim();
    if (inner === "") {
      return [];
    }
    return inner.split(",").map((item) => item.trim().replace(/^['"]|['"]$/g, ""));
  }
  return value.replace(/^['"]|['"]$/g, "");
}

function parseDocument(filePath, expectedType) {
  const content = readFileSync(filePath, "utf8");
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) {
    return { filePath, expectedType, content, metadata: null };
  }

  const metadata = {};
  for (const line of match[1].split(/\r?\n/)) {
    if (line.trim() === "" || line.trimStart().startsWith("#")) {
      continue;
    }
    const separator = line.indexOf(":");
    if (separator === -1) {
      metadata.__parseError = `invalid frontmatter line: ${line}`;
      continue;
    }
    const key = line.slice(0, separator).trim();
    metadata[key] = parseValue(line.slice(separator + 1));
  }

  return { filePath, expectedType, content, metadata };
}

function documentLabel(document, root) {
  return path.relative(root, document.filePath);
}

function assertReference(errors, document, field, targetType, documentsById, root) {
  const values = Array.isArray(document.metadata[field])
    ? document.metadata[field]
    : [document.metadata[field]];

  for (const id of values.filter(Boolean)) {
    const target = documentsById.get(id);
    if (!target) {
      errors.push(`${documentLabel(document, root)}: ${field} references missing ${targetType} ${id}`);
    } else if (target.expectedType !== targetType) {
      errors.push(`${documentLabel(document, root)}: ${field} ${id} is not a ${targetType}`);
    }
  }
}

function findStoryCycles(stories) {
  const storiesById = new Map(stories.map((story) => [story.metadata.id, story]));
  const visiting = new Set();
  const visited = new Set();
  const cycles = [];

  function visit(storyId, trail) {
    if (visiting.has(storyId)) {
      const cycleStart = trail.indexOf(storyId);
      cycles.push([...trail.slice(cycleStart), storyId]);
      return;
    }
    if (visited.has(storyId)) {
      return;
    }

    const story = storiesById.get(storyId);
    if (!story) {
      return;
    }

    visiting.add(storyId);
    const dependencies = Array.isArray(story.metadata.depends_on)
      ? story.metadata.depends_on
      : [];
    for (const dependency of dependencies) {
      visit(dependency, [...trail, storyId]);
    }
    visiting.delete(storyId);
    visited.add(storyId);
  }

  for (const story of stories) {
    visit(story.metadata.id, []);
  }
  return cycles;
}

export function validatePlanning(root = process.cwd()) {
  const docsRoot = path.join(root, "docs");
  const errors = [];
  const documents = [];

  for (const [type, schema] of Object.entries(DOCUMENT_TYPES)) {
    const directory = path.join(docsRoot, schema.directory);
    for (const filePath of listMarkdownFiles(directory)) {
      documents.push(parseDocument(filePath, type));
    }
  }

  const documentsById = new Map();
  for (const document of documents) {
    const label = documentLabel(document, root);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*\.md$/.test(path.basename(document.filePath))) {
      errors.push(`${label}: filename must be lowercase kebab-case`);
    }
    if (!document.metadata) {
      errors.push(`${label}: YAML frontmatter is required`);
      continue;
    }
    if (document.metadata.__parseError) {
      errors.push(`${label}: ${document.metadata.__parseError}`);
    }

    const schema = DOCUMENT_TYPES[document.expectedType];
    for (const field of schema.required) {
      if (
        document.metadata[field] === undefined ||
        document.metadata[field] === "" ||
        document.metadata[field] === null
      ) {
        errors.push(`${label}: missing required field ${field}`);
      }
    }
    if (document.metadata.type !== document.expectedType) {
      errors.push(`${label}: type must be ${document.expectedType}`);
    }
    if (!schema.idPattern.test(document.metadata.id ?? "")) {
      errors.push(`${label}: invalid ${document.expectedType} id ${document.metadata.id ?? ""}`);
    }
    if (!schema.statuses.includes(document.metadata.status)) {
      errors.push(`${label}: invalid status ${document.metadata.status ?? ""}`);
    }
    if (document.metadata.id) {
      if (documentsById.has(document.metadata.id)) {
        errors.push(`${label}: duplicate id ${document.metadata.id}`);
      } else {
        documentsById.set(document.metadata.id, document);
      }
    }
  }

  const validDocuments = documents.filter((document) => document.metadata);
  const epics = validDocuments.filter((document) => document.expectedType === "epic");
  const stories = validDocuments.filter((document) => document.expectedType === "story");
  const tasks = validDocuments.filter((document) => document.expectedType === "task");
  const adrs = validDocuments.filter((document) => document.expectedType === "adr");
  const audits = validDocuments.filter((document) => document.expectedType === "audit");

  for (const story of stories) {
    const label = documentLabel(story, root);
    assertReference(errors, story, "epic", "epic", documentsById, root);
    assertReference(errors, story, "depends_on", "story", documentsById, root);
    assertReference(errors, story, "adrs", "adr", documentsById, root);

    const dependencies = Array.isArray(story.metadata.depends_on)
      ? story.metadata.depends_on
      : [];
    for (const dependencyId of dependencies) {
      const dependency = documentsById.get(dependencyId);
      if (dependency?.metadata.epic !== story.metadata.epic) {
        errors.push(`${label}: dependency ${dependencyId} belongs to another epic`);
      }
      if (dependencyId === story.metadata.id) {
        errors.push(`${label}: story cannot depend on itself`);
      }
    }

    if (ACTIVE_STORY_STATUSES.has(story.metadata.status)) {
      if (!/AC-\d+\s+\[正常系\]/.test(story.content)) {
        errors.push(`${label}: approved story requires a normal acceptance criterion`);
      }
      const parentEpic = documentsById.get(story.metadata.epic);
      const errorAcceptanceDeferred =
        parentEpic?.expectedType === "epic" &&
        parentEpic.metadata.error_acceptance === "deferred" &&
        typeof parentEpic.metadata.error_acceptance_reason === "string" &&
        parentEpic.metadata.error_acceptance_reason.trim() !== "" &&
        typeof parentEpic.metadata.error_acceptance_authorization === "string" &&
        parentEpic.metadata.error_acceptance_authorization.trim() !== "";
      if (!/AC-\d+\s+\[異常系\]/.test(story.content) && !errorAcceptanceDeferred) {
        errors.push(`${label}: approved story requires an error acceptance criterion`);
      }
      const storyTasks = tasks.filter((task) => task.metadata.story === story.metadata.id);
      if (storyTasks.length === 0) {
        errors.push(`${label}: approved story requires at least one task`);
      }
      for (const adrId of Array.isArray(story.metadata.adrs) ? story.metadata.adrs : []) {
        const adr = documentsById.get(adrId);
        if (adr && adr.metadata.status !== "accepted") {
          errors.push(`${label}: referenced ADR ${adrId} must be accepted`);
        }
      }
    }

    if (story.metadata.status === "done") {
      const incompleteTasks = tasks.filter(
        (task) => task.metadata.story === story.metadata.id && task.metadata.status !== "done",
      );
      if (incompleteTasks.length > 0) {
        errors.push(`${label}: done story has incomplete tasks`);
      }
    }
  }

  for (const task of tasks) {
    const label = documentLabel(task, root);
    assertReference(errors, task, "story", "story", documentsById, root);
    assertReference(errors, task, "blocked_by", "task", documentsById, root);
    const blockers = Array.isArray(task.metadata.blocked_by) ? task.metadata.blocked_by : [];
    for (const blockerId of blockers) {
      const blocker = documentsById.get(blockerId);
      if (blocker?.metadata.story !== task.metadata.story) {
        errors.push(`${label}: task blocker ${blockerId} belongs to another story`);
      }
    }
    if (task.metadata.status === "done") {
      if (!task.content.includes("## 検証結果") || /## 検証結果\s+未実施[。.]?/m.test(task.content)) {
        errors.push(`${label}: done task requires recorded verification results`);
      }
    }
  }

  for (const adr of adrs) {
    assertReference(errors, adr, "epic", "epic", documentsById, root);
  }

  for (const audit of audits) {
    const label = documentLabel(audit, root);
    assertReference(errors, audit, "epic", "epic", documentsById, root);
    if (audit.metadata.status === "passed" && !/CRITICAL\/HIGH残件:\s*0/.test(audit.content)) {
      errors.push(`${label}: passed audit must record zero CRITICAL/HIGH findings`);
    }
  }

  for (const epic of epics) {
    const label = documentLabel(epic, root);
    if (epic.metadata.error_acceptance !== undefined) {
      if (epic.metadata.error_acceptance !== "deferred") {
        errors.push(`${label}: error_acceptance must be deferred when specified`);
      }
      for (const field of ["error_acceptance_reason", "error_acceptance_authorization"]) {
        if (
          typeof epic.metadata[field] !== "string" ||
          epic.metadata[field].trim() === "" ||
          PLACEHOLDER_PATTERN.test(epic.metadata[field])
        ) {
          errors.push(`${label}: deferred error acceptance requires ${field}`);
        }
      }
    }
    assertReference(errors, epic, "adrs", "adr", documentsById, root);
    const epicStories = stories.filter((story) => story.metadata.epic === epic.metadata.id);
    if (ACTIVE_EPIC_STATUSES.has(epic.metadata.status)) {
      if (epicStories.length === 0) {
        errors.push(`${label}: approved epic requires at least one story`);
      }
      for (const adrId of Array.isArray(epic.metadata.adrs) ? epic.metadata.adrs : []) {
        const adr = documentsById.get(adrId);
        if (adr && adr.metadata.status !== "accepted") {
          errors.push(`${label}: referenced ADR ${adrId} must be accepted`);
        }
      }
    }
    if (epic.metadata.status === "review" || epic.metadata.status === "done") {
      if (epicStories.some((story) => story.metadata.status !== "done")) {
        errors.push(`${label}: ${epic.metadata.status} epic has incomplete stories`);
      }
      const passedAudit = audits.some(
        (audit) => audit.metadata.epic === epic.metadata.id && audit.metadata.status === "passed",
      );
      if (!passedAudit) {
        errors.push(`${label}: ${epic.metadata.status} epic requires a passed audit`);
      }
    }
  }

  for (const document of validDocuments) {
    if (
      document.metadata.status !== "draft" &&
      document.metadata.status !== "proposed" &&
      document.metadata.status !== "pending" &&
      PLACEHOLDER_PATTERN.test(document.content)
    ) {
      errors.push(`${documentLabel(document, root)}: unresolved placeholder in active document`);
    }
  }

  for (const cycle of findStoryCycles(stories)) {
    errors.push(`story dependency cycle: ${cycle.join(" -> ")}`);
  }

  return { errors, documentCount: documents.length };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const root = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
  const result = validatePlanning(root);
  if (result.errors.length > 0) {
    for (const error of result.errors) {
      console.error(`ERROR: ${error}`);
    }
    process.exitCode = 1;
  } else {
    console.log(`Planning documents valid (${result.documentCount} documents).`);
  }
}

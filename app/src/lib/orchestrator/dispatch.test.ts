import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { prisma } from "../db/client";
import { MockProvider } from "../providers/mock";
import { dispatchTask } from "./dispatch";
import { seedFixtureProject, seedFixtureTask, cleanupFixtureProject } from "../testHelpers/fixtureProject";

const READY_RESPONSE = [
  "---",
  'status: "ready-for-handoff"',
  'confidence: "HIGH"',
  "assumptions: []",
  "risks: []",
  "open_questions: []",
  "review_required: false",
  "---",
  "",
  "# Requirements spec",
  "",
  "Fixture content for the dispatch test.",
].join("\n");

const BLOCKED_RESPONSE = [
  "---",
  'status: "blocked-on-input"',
  'confidence: "LOW"',
  "assumptions: []",
  "risks: []",
  "open_questions:",
  '  - "What is the actual budget?"',
  "review_required: true",
  "---",
  "",
  "# Requirements spec (incomplete)",
].join("\n");

async function seedTestProject(ownerAgent: string) {
  const project = await seedFixtureProject();
  const task = await seedFixtureTask(project.id, ownerAgent, "Turn client brief into requirements spec");
  return { project, task };
}

const cleanupTestProject = cleanupFixtureProject;

test("dispatchTask runs the owner agent, writes an artifact, and advances task status (ready-for-handoff)", async () => {
  const tmpProjectsRoot = fs.mkdtempSync(path.join(os.tmpdir(), "agency-os-dispatch-test-"));
  const prevRoot = process.env.PROJECTS_ROOT;
  process.env.PROJECTS_ROOT = tmpProjectsRoot;

  const { project, task } = await seedTestProject("business-analyst");
  try {
    const result = await dispatchTask(task.id, { provider: new MockProvider(READY_RESPONSE) });

    assert.equal(result.status, "ready-for-handoff");
    assert.equal(result.confidence, "HIGH");
    assert.ok(fs.existsSync(result.filePath));
    assert.equal(result.costUsd, null, "MockProvider reports no usage, so cost must be null, not a guessed number");

    const updatedTask = await prisma.task.findUniqueOrThrow({ where: { id: task.id } });
    assert.equal(updatedTask.status, "REVIEW");

    const artifact = await prisma.artifact.findUniqueOrThrow({ where: { id: result.artifactId } });
    assert.equal(artifact.type, "REQUIREMENTS_SPEC");
    assert.equal(artifact.taskId, task.id);

    // business-analyst's reviewed_by is "product-manager, orchestrator" — both non-human, so 2 review tasks.
    assert.equal(result.reviewTaskIds.length, 2);
    const reviewTasks = await prisma.task.findMany({ where: { id: { in: result.reviewTaskIds } } });
    const reviewers = reviewTasks.map((t) => t.ownerAgent).sort();
    assert.deepEqual(reviewers, ["orchestrator", "product-manager"]);
    for (const rt of reviewTasks) {
      assert.equal(rt.status, "READY");
    }

    const agentRow = await prisma.agent.findUnique({ where: { slug: "business-analyst" } });
    assert.ok(agentRow, "dispatch should upsert an Agent row for a slug not yet in the DB");

    const events = await prisma.event.findMany({ where: { projectId: project.id }, orderBy: { timestamp: "asc" } });
    assert.ok(events.some((e) => e.message.includes("Dispatched task")));
    assert.ok(events.some((e) => e.message.includes("Requested review from")));
    assert.ok(events.some((e) => e.message.includes("cost unknown (provider reported no usage)")));
  } finally {
    await cleanupTestProject(project.id);
    fs.rmSync(tmpProjectsRoot, { recursive: true, force: true });
    if (prevRoot === undefined) delete process.env.PROJECTS_ROOT;
    else process.env.PROJECTS_ROOT = prevRoot;
  }
});

test("dispatchTask computes a real cost estimate and logs it when the provider reports usage for a priced model", async () => {
  const tmpProjectsRoot = fs.mkdtempSync(path.join(os.tmpdir(), "agency-os-dispatch-test-"));
  const prevRoot = process.env.PROJECTS_ROOT;
  process.env.PROJECTS_ROOT = tmpProjectsRoot;

  const { project, task } = await seedTestProject("business-analyst");
  try {
    const provider = new MockProvider(READY_RESPONSE, { inputTokens: 1_000_000, outputTokens: 1_000_000 }, "claude-sonnet-5");
    const result = await dispatchTask(task.id, { provider });

    // claude-sonnet-5: $3/M in + $15/M out = $18 at 1M/1M tokens
    assert.equal(result.costUsd, 18);

    const events = await prisma.event.findMany({ where: { projectId: project.id } });
    assert.ok(events.some((e) => e.message.includes("~$18.0000") && e.message.includes("claude-sonnet-5")));
  } finally {
    await cleanupTestProject(project.id);
    fs.rmSync(tmpProjectsRoot, { recursive: true, force: true });
    if (prevRoot === undefined) delete process.env.PROJECTS_ROOT;
    else process.env.PROJECTS_ROOT = prevRoot;
  }
});

test("dispatchTask reports costUsd null and logs 'unknown model' when usage exists but the model has no pricing entry", async () => {
  const tmpProjectsRoot = fs.mkdtempSync(path.join(os.tmpdir(), "agency-os-dispatch-test-"));
  const prevRoot = process.env.PROJECTS_ROOT;
  process.env.PROJECTS_ROOT = tmpProjectsRoot;

  const { project, task } = await seedTestProject("business-analyst");
  try {
    const provider = new MockProvider(READY_RESPONSE, { inputTokens: 100, outputTokens: 100 }, "some-future-model");
    const result = await dispatchTask(task.id, { provider });

    assert.equal(result.costUsd, null);

    const events = await prisma.event.findMany({ where: { projectId: project.id } });
    assert.ok(events.some((e) => e.message.includes('no pricing entry for model "some-future-model"')));
  } finally {
    await cleanupTestProject(project.id);
    fs.rmSync(tmpProjectsRoot, { recursive: true, force: true });
    if (prevRoot === undefined) delete process.env.PROJECTS_ROOT;
    else process.env.PROJECTS_ROOT = prevRoot;
  }
});

test("dispatchTask marks the task BLOCKED and creates no review tasks when the agent reports blocked-on-input", async () => {
  const tmpProjectsRoot = fs.mkdtempSync(path.join(os.tmpdir(), "agency-os-dispatch-test-"));
  const prevRoot = process.env.PROJECTS_ROOT;
  process.env.PROJECTS_ROOT = tmpProjectsRoot;

  const { project, task } = await seedTestProject("business-analyst");
  try {
    const result = await dispatchTask(task.id, { provider: new MockProvider(BLOCKED_RESPONSE) });

    assert.equal(result.status, "blocked-on-input");
    assert.equal(result.reviewTaskIds.length, 0);

    const updatedTask = await prisma.task.findUniqueOrThrow({ where: { id: task.id } });
    assert.equal(updatedTask.status, "BLOCKED");
  } finally {
    await cleanupTestProject(project.id);
    fs.rmSync(tmpProjectsRoot, { recursive: true, force: true });
    if (prevRoot === undefined) delete process.env.PROJECTS_ROOT;
    else process.env.PROJECTS_ROOT = prevRoot;
  }
});

test("dispatchTask throws a clear error when the task has no ownerAgent", async () => {
  const { project, task } = await seedTestProject("business-analyst");
  await prisma.task.update({ where: { id: task.id }, data: { ownerAgent: null } });
  try {
    await assert.rejects(() => dispatchTask(task.id), /has no ownerAgent/);
  } finally {
    await cleanupTestProject(project.id);
  }
});

test("dispatchTask throws a clear error for an unknown agent slug", async () => {
  const { project, task } = await seedTestProject("not-a-real-agent");
  try {
    await assert.rejects(() => dispatchTask(task.id), /No agent\.md found/);
  } finally {
    await cleanupTestProject(project.id);
  }
});

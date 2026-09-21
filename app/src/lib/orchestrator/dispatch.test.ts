import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { prisma } from "../db/client";
import { MockProvider } from "../providers/mock";
import { dispatchTask } from "./dispatch";

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

/** Creates an isolated Project + Task, cleaned up in the caller's finally block. */
async function seedTestProject(ownerAgent: string) {
  const artifactsPath = `dispatch-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const project = await prisma.project.create({
    data: { name: "Dispatch test fixture", stage: "REQUIREMENTS", artifactsPath },
  });
  const task = await prisma.task.create({
    data: {
      title: "Turn client brief into requirements spec",
      projectId: project.id,
      ownerAgent,
      status: "READY",
    },
  });
  return { project, task };
}

async function cleanupTestProject(projectId: string) {
  await prisma.event.deleteMany({ where: { projectId } });
  await prisma.artifact.deleteMany({ where: { projectId } });
  await prisma.task.deleteMany({ where: { projectId } });
  await prisma.project.delete({ where: { id: projectId } });
}

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

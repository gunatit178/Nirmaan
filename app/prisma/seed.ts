/**
 * Seeds one demo project so the dashboard has something to render
 * (Phase 3 verification: "dashboard shows a seeded project/task/artifact").
 *
 * This is fixture data, not a real client engagement — consistent with
 * /projects/README.md, which explicitly says no real project exists yet.
 * Run with: npx prisma db seed
 */
import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { encodeStringList } from "../src/lib/db/json";

const prisma = new PrismaClient();

const PROJECT_ID_SLUG = "demo-project";

async function main() {
  await prisma.event.deleteMany({});
  await prisma.approval.deleteMany({});
  await prisma.artifact.deleteMany({});
  await prisma.task.deleteMany({});
  await prisma.project.deleteMany({});
  await prisma.client.deleteMany({});
  await prisma.agent.deleteMany({});

  const client = await prisma.client.create({
    data: {
      name: "Riverside Bread Co.",
      contact: "hello@riversidebread.example (fixture — not a real client)",
    },
  });

  const productManager = await prisma.agent.create({
    data: {
      slug: "product-manager",
      role: "Product discovery and requirements",
      status: "ACTIVE",
    },
  });
  await prisma.agent.create({
    data: {
      slug: "orchestrator",
      role: "AI Technical Director + Project Orchestrator",
      status: "ACTIVE",
    },
  });

  const project = await prisma.project.create({
    data: {
      name: "Riverside Bread Co. — marketing site",
      clientId: client.id,
      stage: "REQUIREMENTS",
      artifactsPath: PROJECT_ID_SLUG,
    },
  });

  const task = await prisma.task.create({
    data: {
      title: "Draft PRD from client brief",
      description: "Turn the intake brief into a Product Requirements Document.",
      projectId: project.id,
      ownerAgent: "product-manager",
      status: "REVIEW",
      priority: "HIGH",
      dependencies: encodeStringList([]),
      blockers: encodeStringList([]),
    },
  });

  const artifactRelativePath = "requirements/prd.md";
  await prisma.artifact.create({
    data: {
      projectId: project.id,
      taskId: task.id,
      type: "PRD",
      filePath: artifactRelativePath,
      version: 1,
      createdByAgentId: productManager.id,
    },
  });

  await prisma.approval.create({
    data: {
      projectId: project.id,
      gate: "REQUIREMENTS",
      status: "PENDING",
      requestedBy: "product-manager",
    },
  });

  await prisma.event.create({
    data: {
      projectId: project.id,
      agentSlug: "product-manager",
      taskId: task.id,
      message: "Drafted PRD from client intake brief; requesting Requirements gate approval.",
    },
  });

  // Write the matching artifact file on disk so the DB pointer resolves to
  // something real, consistent with the file-based artifact convention.
  const projectsRoot = path.join(process.cwd(), "..", "projects");
  const artifactDir = path.join(projectsRoot, PROJECT_ID_SLUG, "requirements");
  fs.mkdirSync(artifactDir, { recursive: true });
  const artifactFile = path.join(artifactDir, "prd.md");
  if (!fs.existsSync(artifactFile)) {
    fs.writeFileSync(
      artifactFile,
      [
        "---",
        'project: "demo-project"',
        'agent: "product-manager"',
        'status: "ready-for-handoff"',
        'confidence: "MEDIUM"',
        "assumptions:",
        '  - "This is seed/fixture data for Phase 3, not a real client PRD."',
        "risks: []",
        "open_questions:",
        '  - "What budget range is the client actually working with?"',
        "review_required: true",
        "---",
        "",
        "# PRD: Riverside Bread Co. Marketing Site",
        "",
        "## Problem",
        "",
        "The bakery has no web presence beyond Instagram. Customers can't see the weekly menu, hours, or place advance orders for custom cakes.",
        "",
        "## MVP scope",
        "",
        "- Menu page (weekly, editable without a developer)",
        "- Hours / location",
        "- Custom cake order request form",
        "",
        "*(Fixture content for Phase 3 dashboard verification.)*",
        "",
      ].join("\n")
    );
  }

  const projectMdPath = path.join(projectsRoot, PROJECT_ID_SLUG, "project.md");
  if (!fs.existsSync(projectMdPath)) {
    fs.writeFileSync(
      projectMdPath,
      [
        "# Riverside Bread Co. — marketing site",
        "",
        "Fixture/demo project for exercising the Agency OS dashboard (Phase 3). Not a real client engagement.",
        "",
        `Client: ${client.name}`,
        "Stage: REQUIREMENTS",
      ].join("\n")
    );
  }

  console.log(`Seeded project "${project.name}" (${project.id})`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

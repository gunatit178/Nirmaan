import path from "node:path";
import { prisma } from "../db/client";
import { runAgent, projectsRoot } from "../agents/runAgent";
import { loadAgent } from "../agents/loadAgent";
import { encodeStringList } from "../db/json";
import type { ModelProvider } from "../providers/types";
import type { HandoffStatus } from "../agents/types";
import { requireTaskType, requireOutputPath, artifactTypeFor } from "./agentConfig";
import { estimateCostUsd } from "../costs/estimateCost";
import { logEvent } from "../db/logEvent";

/**
 * The one piece of real "orchestration" logic in this phase: given a Task
 * that already has an ownerAgent, run that agent, record the result, and —
 * if the agent says its output is ready for handoff — create follow-up
 * review Tasks for everyone in that agent's reviewed_by list. This wires
 * together Phase 2 (runAgent), Phase 3 (the DB), and Phase 4 (the real
 * agent roster + their reviewed_by fields) into an actual pipeline.
 *
 * What this does NOT do (yet, deliberately, per the roadmap):
 *   - decide WHICH agent a task should go to in the first place (Task.ownerAgent
 *     must already be set — planning workstreams from a bare project objective
 *     is a separate, harder problem, out of scope for this phase)
 *   - enforce the Quality Gates (Phase 6)
 *   - actually run the follow-up review tasks it creates (they're created
 *     as READY, someone/something still has to dispatch them)
 */

const STATUS_TO_TASK_STATUS: Record<HandoffStatus, string> = {
  "ready-for-handoff": "REVIEW",
  "blocked-on-input": "BLOCKED",
  "in-progress": "IN_PROGRESS",
};

export interface DispatchOptions {
  /** Inject a provider (used by tests to avoid a live network call). Defaults to whatever the model router resolves. */
  provider?: ModelProvider;
}

export interface DispatchResult {
  taskId: string;
  artifactId: string;
  filePath: string;
  status: HandoffStatus;
  confidence: string;
  reviewTaskIds: string[];
  /** USD cost estimate for this dispatch's model call. null when the provider reported no usage (e.g. MockProvider) — never a guessed number standing in for a real one. */
  costUsd: number | null;
}

function buildUserInput(task: { title: string; description: string | null }): string {
  return [`Task: ${task.title}`, task.description ? `\n${task.description}` : ""].join("");
}

/**
 * Run one already-assigned Task through its ownerAgent and update project
 * state accordingly. Throws if the task has no ownerAgent, or if that
 * agent has no model-router/output-path configuration — dispatch never
 * silently no-ops on a misconfigured agent.
 */
export async function dispatchTask(taskId: string, options: DispatchOptions = {}): Promise<DispatchResult> {
  const task = await prisma.task.findUnique({ where: { id: taskId }, include: { project: true } });
  if (!task) throw new Error(`No task found for id "${taskId}".`);
  if (!task.ownerAgent) throw new Error(`Task "${task.id}" ("${task.title}") has no ownerAgent — cannot dispatch.`);

  const agentSlug = task.ownerAgent;
  const agentDef = loadAgent(agentSlug); // throws with a clear error if the slug doesn't exist
  const taskType = requireTaskType(agentSlug);
  const outputRelativePath = requireOutputPath(agentSlug);

  await prisma.task.update({ where: { id: task.id }, data: { status: "IN_PROGRESS" } });
  await logEvent(task.projectId, agentSlug, task.id, `Dispatched task "${task.title}" to ${agentSlug}.`);

  const result = await runAgent({
    agentSlug,
    taskType,
    projectId: task.project.artifactsPath,
    userInput: buildUserInput(task),
    outputRelativePath,
    provider: options.provider,
  });

  const agentRow = await prisma.agent.upsert({
    where: { slug: agentSlug },
    update: {},
    create: { slug: agentSlug, role: agentDef.role, status: "ACTIVE" },
  });

  // runAgent may have written a versioned path (prd.md -> prd-v2.md) if the
  // default target already existed — record the actual path, not the
  // requested one.
  const actualRelativePath = path.relative(path.join(projectsRoot(), task.project.artifactsPath), result.filePath);

  const artifact = await prisma.artifact.create({
    data: {
      projectId: task.projectId,
      taskId: task.id,
      type: artifactTypeFor(agentSlug),
      filePath: actualRelativePath,
      createdByAgentId: agentRow.id,
    },
  });

  const newTaskStatus = STATUS_TO_TASK_STATUS[result.metadata.status];
  await prisma.task.update({ where: { id: task.id }, data: { status: newTaskStatus } });

  // Cost is reported honestly, not guessed: null (not 0) when the
  // provider gave no real figures. A MockProvider run must never look
  // like a free real run in the log. Real provider-reported cost
  // (claude-code-cli's total_cost_usd) is preferred over our own
  // pricing-table estimate when available — it's simply more accurate.
  let costUsd: number | null = null;
  let costNote = "cost unknown (provider reported no usage)";
  if (result.costUsd !== undefined) {
    costUsd = result.costUsd;
    costNote = `~$${result.costUsd.toFixed(4)} (real, reported by ${result.provider})`;
  } else if (result.usage) {
    const estimate = estimateCostUsd(result.model, result.usage);
    costUsd = estimate.priced ? estimate.usd : null;
    costNote = estimate.priced
      ? `~$${estimate.usd.toFixed(4)} (estimated, ${result.usage.inputTokens} in / ${result.usage.outputTokens} out tokens, ${result.model})`
      : `cost unknown (no pricing entry for model "${result.model}")`;
  }

  await logEvent(
    task.projectId,
    agentSlug,
    task.id,
    `${agentSlug} completed with status=${result.metadata.status}, confidence=${result.metadata.confidence}, ${costNote}.`
  );

  const reviewTaskIds: string[] = [];
  if (result.metadata.status === "ready-for-handoff") {
    const reviewers = agentDef.reviewedBy.filter((slug) => slug !== "human");
    for (const reviewerSlug of reviewers) {
      const reviewTask = await prisma.task.create({
        data: {
          title: `Review: ${task.title}`,
          description: `Review the ${artifactTypeFor(agentSlug)} artifact produced by ${agentSlug} for task "${task.title}" (artifact ${artifact.id}).`,
          projectId: task.projectId,
          ownerAgent: reviewerSlug,
          status: "READY",
          dependencies: encodeStringList([task.id]),
        },
      });
      reviewTaskIds.push(reviewTask.id);
    }
    await logEvent(
      task.projectId,
      agentSlug,
      task.id,
      reviewers.length > 0
        ? `Requested review from: ${reviewers.join(", ")}.`
        : `No agent review required (reviewed_by is human-only or empty).`
    );
  }

  return {
    taskId: task.id,
    artifactId: artifact.id,
    filePath: result.filePath,
    status: result.metadata.status,
    confidence: result.metadata.confidence,
    reviewTaskIds,
    costUsd,
  };
}

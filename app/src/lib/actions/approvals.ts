"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "../db/client";
import { tryAdvanceAfterApproval } from "../orchestrator/qualityGates";
import type { ApprovalGate } from "../db/enums";

/**
 * No auth exists yet (Phase 3 is local-only, pre-deployment — see the
 * architecture plan's Risk Register). Every decision made through this UI
 * right now is by definition the founder, so decidedBy is hardcoded to
 * "human" rather than silently attributed to no one. Revisit once real
 * auth exists (Phase 9).
 */
const DECIDER = "human";

async function decide(approvalId: string, status: "APPROVED" | "REJECTED") {
  const approval = await prisma.approval.update({
    where: { id: approvalId },
    data: { status, decidedBy: DECIDER, decidedAt: new Date() },
  });

  await prisma.event.create({
    data: {
      projectId: approval.projectId,
      agentSlug: null,
      message: `${DECIDER} ${status === "APPROVED" ? "approved" : "rejected"} the ${approval.gate} gate.`,
    },
  });

  // Approving a gate should actually move the project forward if this is
  // the gate currently blocking it (Phase 6's quality-gate enforcement).
  // tryAdvanceAfterApproval is a no-op (returns null) if this approval
  // doesn't correspond to what's actually blocking the project right now
  // — e.g. a re-approval, or a gate for a stage already passed — so a
  // rejection or an approval for a non-current gate never triggers a
  // stage change.
  if (status === "APPROVED") {
    await tryAdvanceAfterApproval(approval.projectId, approval.gate as ApprovalGate);
  }

  revalidatePath("/dashboard/approvals");
  revalidatePath(`/dashboard/projects/${approval.projectId}`);
}

export async function approveGate(formData: FormData) {
  const approvalId = String(formData.get("approvalId"));
  await decide(approvalId, "APPROVED");
}

export async function rejectGate(formData: FormData) {
  const approvalId = String(formData.get("approvalId"));
  await decide(approvalId, "REJECTED");
}

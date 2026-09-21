"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "../db/client";

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

import Link from "next/link";
import { prisma } from "@/lib/db/client";
import { approveGate, rejectGate } from "@/lib/actions/approvals";

export const dynamic = "force-dynamic";

const BUTTON_BASE: React.CSSProperties = {
  padding: "0.35rem 0.75rem",
  borderRadius: 4,
  border: "1px solid #444",
  cursor: "pointer",
  marginRight: "0.5rem",
};

export default async function ApprovalsPage() {
  const [pending, decided] = await Promise.all([
    prisma.approval.findMany({
      where: { status: "PENDING" },
      include: { project: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.approval.findMany({
      where: { status: { not: "PENDING" } },
      include: { project: true },
      orderBy: { decidedAt: "desc" },
      take: 20,
    }),
  ]);

  return (
    <main>
      <h1>Approvals</h1>

      <h2>Pending ({pending.length})</h2>
      {pending.length === 0 ? (
        <p>Nothing waiting on you right now.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {pending.map((approval) => (
            <li
              key={approval.id}
              style={{ border: "1px solid #333", borderRadius: 6, padding: "1rem", marginBottom: "0.75rem" }}
            >
              <div style={{ marginBottom: "0.5rem" }}>
                <strong>{approval.gate}</strong> gate — requested by {approval.requestedBy}
                <br />
                Project: <Link href={`/dashboard/projects/${approval.projectId}`}>{approval.project.name}</Link>
              </div>
              <form action={approveGate} style={{ display: "inline" }}>
                <input type="hidden" name="approvalId" value={approval.id} />
                <button type="submit" style={{ ...BUTTON_BASE, background: "#16321f", color: "#c8f0d4" }}>
                  Approve
                </button>
              </form>
              <form action={rejectGate} style={{ display: "inline" }}>
                <input type="hidden" name="approvalId" value={approval.id} />
                <button type="submit" style={{ ...BUTTON_BASE, background: "#3a1a1a", color: "#f5c6c6" }}>
                  Reject
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <h2>Decided (last {decided.length})</h2>
      {decided.length === 0 ? (
        <p>No decisions recorded yet.</p>
      ) : (
        <ul>
          {decided.map((approval) => (
            <li key={approval.id}>
              <strong>{approval.gate}</strong> — {approval.status} by {approval.decidedBy}
              {approval.decidedAt && <> on {approval.decidedAt.toISOString().slice(0, 10)}</>} —{" "}
              <Link href={`/dashboard/projects/${approval.projectId}`}>{approval.project.name}</Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

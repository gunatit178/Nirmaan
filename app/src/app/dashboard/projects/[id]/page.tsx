import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/client";

export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      client: true,
      tasks: { orderBy: { createdAt: "asc" } },
      artifacts: { orderBy: { createdAt: "asc" } },
      approvals: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!project) notFound();

  return (
    <main>
      <p>
        <Link href="/dashboard">&larr; Projects</Link>
      </p>
      <h1>{project.name}</h1>
      <p>
        Client: {project.client?.name ?? "—"} &middot; Stage: <strong>{project.stage}</strong>
      </p>
      <p>
        Artifacts on disk: <code>/projects/{project.artifactsPath}/</code>
      </p>

      <h2>Tasks</h2>
      {project.tasks.length === 0 ? (
        <p>No tasks yet.</p>
      ) : (
        <ul>
          {project.tasks.map((task) => (
            <li key={task.id}>
              <strong>{task.title}</strong> — {task.status} ({task.priority})
              {task.ownerAgent && <> — owner: {task.ownerAgent}</>}
              {task.description && <div style={{ color: "#94A3B8" }}>{task.description}</div>}
            </li>
          ))}
        </ul>
      )}

      <h2>Artifacts</h2>
      {project.artifacts.length === 0 ? (
        <p>No artifacts yet.</p>
      ) : (
        <ul>
          {project.artifacts.map((artifact) => (
            <li key={artifact.id}>
              <strong>{artifact.type}</strong> v{artifact.version} —{" "}
              <code>/projects/{project.artifactsPath}/{artifact.filePath}</code>
            </li>
          ))}
        </ul>
      )}

      <h2>Approvals</h2>
      {project.approvals.length === 0 ? (
        <p>No approval gates requested yet.</p>
      ) : (
        <ul>
          {project.approvals.map((approval) => (
            <li key={approval.id}>
              <strong>{approval.gate}</strong> — {approval.status}
              {approval.status === "PENDING" && (
                <>
                  {" "}
                  — <Link href="/dashboard/approvals">review in Approvals &rarr;</Link>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

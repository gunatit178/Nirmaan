import Link from "next/link";
import { prisma } from "@/lib/db/client";

export const dynamic = "force-dynamic"; // always read current DB state, this is an internal tool, not a cached public page

export default async function ProjectsPage() {
  const projects = await prisma.project.findMany({
    include: {
      client: true,
      _count: { select: { tasks: true, artifacts: true, approvals: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <main>
      <h1>Projects</h1>
      {projects.length === 0 ? (
        <p>
          No projects yet. Run <code>npm run db:seed</code> in <code>/app</code> to load the demo fixture.
        </p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid #444" }}>
              <th style={{ padding: "0.5rem 0" }}>Project</th>
              <th>Client</th>
              <th>Stage</th>
              <th>Tasks</th>
              <th>Artifacts</th>
              <th>Approvals</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => (
              <tr key={project.id} style={{ borderBottom: "1px solid #222" }}>
                <td style={{ padding: "0.5rem 0" }}>
                  <Link href={`/dashboard/projects/${project.id}`}>{project.name}</Link>
                </td>
                <td>{project.client?.name ?? "—"}</td>
                <td>{project.stage}</td>
                <td>{project._count.tasks}</td>
                <td>{project._count.artifacts}</td>
                <td>{project._count.approvals}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}

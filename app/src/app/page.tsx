import Link from "next/link";

export default function Home() {
  return (
    <main style={{ maxWidth: 640, margin: "4rem auto", padding: "0 1.5rem", fontFamily: "system-ui, sans-serif" }}>
      <h1>Agency OS</h1>
      <p>
        Internal platform scaffolding. See <code>/docs/architecture-plan.md</code> at the
        repo root for the full architecture and roadmap.
      </p>
      <p>
        <Link href="/dashboard">Open the dashboard &rarr;</Link>
      </p>
      <p>Nothing here is client-facing yet.</p>
    </main>
  );
}

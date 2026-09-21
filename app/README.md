# Agency OS

Internal multi-agent platform. See [`/docs/architecture-plan.md`](../docs/architecture-plan.md) at the repo root for the full architecture, agent roster, and roadmap. Separate from the public marketing site at the repo root — this is its own Next.js project with its own `package.json`.

## Getting started

```bash
npm install          # also runs `prisma generate` via postinstall
npm run db:migrate   # apply migrations, create app/prisma/dev.db (gitignored)
npm run db:seed      # load a demo project/task/artifact fixture
npm run dev           # http://localhost:3000 — see /dashboard
```

## Agent runtime (Phase 2)

`src/lib/agents/` loads an `/agents/<slug>/agent.md` definition, runs it against structured input through the model router (`src/lib/model-router.ts`), and writes the result as a versioned artifact with handoff-metadata frontmatter into `/projects/{project-id}/...`.

```bash
npm test           # plumbing tests — mock provider, no network call, no API key needed
```

Verified so far against the mock provider only (`src/lib/providers/mock.ts`) — no live model has been run against this yet. `src/lib/providers/anthropic.ts` implements the real provider and is wired into the model router, but isn't currently exercised by anything in this repo; running an agent against a live model requires setting `ANTHROPIC_API_KEY` in the environment and calling `runAgent()` yourself (e.g. from a script or an API route added in a later phase).

Only two agents exist so far (`orchestrator`, `product-manager`) — see `/agents/README.md` for status and the rest of the planned roster.

## Project/task/artifact system (Phase 3)

`prisma/schema.prisma` implements the Data Model from the architecture plan on SQLite (`app/prisma/dev.db`, gitignored — migrations in `prisma/migrations/` are tracked). Two SQLite-specific simplifications are documented inline in the schema: no native enums (allowed values live in `src/lib/db/enums.ts`) and no native scalar lists (JSON-encoded TEXT columns, via `src/lib/db/json.ts`).

Artifact *content* is never stored in the database — only a `filePath` pointer into `/projects/{id}/...` on disk, consistent with the file-based artifact convention from Phase 1.

The dashboard (`/dashboard`) has two views so far:
- **Projects** — list + detail (tasks, artifacts, approval status) for each project
- **Approvals** — pending approval gates with Approve/Reject actions (`src/lib/actions/approvals.ts`, Next.js Server Actions). No auth exists yet, so every decision is currently attributed to `"human"` — this is a local-only, pre-deployment tool; see the architecture plan's Risk Register for the auth gap.

No production database exists — this is local SQLite for the founder's own machine. Migration to Postgres is a deliberate later step, not something to reach for now (see the architecture plan's Technology Decisions).

## Learn more (Next.js)

- [Next.js Documentation](https://nextjs.org/docs)
- [Learn Next.js](https://nextjs.org/learn)

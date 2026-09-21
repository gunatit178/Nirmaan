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

All 25 agents in the roster now exist as specs (Phase 4) — see `/agents/README.md` for the full list and what "exists" does and doesn't mean yet.

## Project/task/artifact system (Phase 3)

`prisma/schema.prisma` implements the Data Model from the architecture plan on SQLite (`app/prisma/dev.db`, gitignored — migrations in `prisma/migrations/` are tracked). Two SQLite-specific simplifications are documented inline in the schema: no native enums (allowed values live in `src/lib/db/enums.ts`) and no native scalar lists (JSON-encoded TEXT columns, via `src/lib/db/json.ts`).

Artifact *content* is never stored in the database — only a `filePath` pointer into `/projects/{id}/...` on disk, consistent with the file-based artifact convention from Phase 1.

The dashboard (`/dashboard`) has two views so far:
- **Projects** — list + detail (tasks, artifacts, approval status) for each project
- **Approvals** — pending approval gates with Approve/Reject actions (`src/lib/actions/approvals.ts`, Next.js Server Actions). No auth exists yet, so every decision is currently attributed to `"human"` — this is a local-only, pre-deployment tool; see the architecture plan's Risk Register for the auth gap.

No production database exists — this is local SQLite for the founder's own machine. Migration to Postgres is a deliberate later step, not something to reach for now (see the architecture plan's Technology Decisions).

## Agent orchestration (Phase 5)

`src/lib/orchestrator/dispatch.ts` wires Phases 2–4 together: `dispatchTask(taskId)` loads a `Task` that already has an `ownerAgent` set, runs that agent through `runAgent()`, records the result as an `Artifact`, advances the `Task`'s status based on the agent's reported handoff status, and — if the agent's output is `ready-for-handoff` — creates follow-up `READY` review Tasks for every agent in its `reviewed_by` list (read straight from that agent's `agent.md` frontmatter, not duplicated anywhere).

`src/lib/orchestrator/agentConfig.ts` maps each of the 25 agents to a model-router task type and a default output path — both explicit tables, not inferred, so adding a new agent requires a conscious decision in both places (enforced nowhere yet except code review; a missing entry fails loudly with a clear error rather than silently guessing).

What this phase does **not** do: decide which agent a task should go to in the first place (workstream planning from a bare project objective is unsolved — `Task.ownerAgent` has to already be set before `dispatchTask` can run), enforce the Quality Gates (Phase 6), or automatically dispatch the review tasks it creates (something still has to call `dispatchTask` on them). There's also no UI for this yet — it's exercised by `npm test` (`src/lib/orchestrator/dispatch.test.ts`, mock provider, isolated fixture project cleaned up after each test) and by direct import, not by a dashboard button.

## Learn more (Next.js)

- [Next.js Documentation](https://nextjs.org/docs)
- [Learn Next.js](https://nextjs.org/learn)

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

## Quality gates (Phase 6)

`src/lib/orchestrator/qualityGates.ts` enforces the six gated stage transitions from the architecture plan's Section G/H (Requirements→Planning, Design→Architecture, Architecture→Implementation, Implementation→QA, QA→Security Review, Security Review→Deployment). "Enforced" means specifically: `advanceProjectStage(projectId)` refuses to move a project's `stage` forward unless an `APPROVED` `Approval` row exists for the gate governing that transition — it does not attempt to algorithmically judge whether, say, a PRD is actually good; that judgment is exactly what the human's Approve/Reject decision in the dashboard represents.

Fixed along the way: `Approval.gate`'s allowed values (`src/lib/db/enums.ts`) had drifted from Section H's six gate names since Phase 3 (`IMPLEMENTATION_PLAN`/`DEPLOYMENT` instead of `IMPLEMENTATION`/`QA`/`PRODUCTION`) — corrected, with no existing data affected (nothing had used the old values).

The Approvals dashboard (`src/lib/actions/approvals.ts`, Phase 3) now calls `tryAdvanceAfterApproval` after every APPROVED decision — approving a gate through the UI actually advances the project. Manually verified against the real seeded `demo-project` (approved its pending REQUIREMENTS gate, confirmed `stage` moved from `REQUIREMENTS` to `PLANNING`, then re-seeded to reset the fixture).

## Tool integrations (Phase 7)

`src/lib/tools/` gives agents scoped, concrete capabilities instead of the free-text permission strings in `agent.md` frontmatter being purely aspirational. Deliberately conservative, given the real security stakes of "let an LLM's output trigger actions":

- **`filesystemTools.ts`** — read/list/write, all confined to `/projects/{id}/` via `resolveProjectPath` (`src/lib/agents/artifactWriter.ts`), which rejects any path that resolves outside the project directory (`../` traversal) by throwing, not by silently clamping. Writes go through the same never-overwrite-in-place versioning `runAgent` already uses (extracted into `artifactWriter.ts` so there's one writer, not two).
- **`testTool.ts`** — the only execute-capable tool. Always runs the fixed command `npm test` in `/app`; its input schema has no field that reaches a command line. An agent can trigger it; it cannot make it run anything else.
- **`commandRunner.ts`** — the only place in this codebase that spawns a process. Takes a command + argv array, never a shell string (`shell: false`), so there's no shell-interpolation surface by construction. Hard timeout (kills the child), output size cap per stream.
- **`registry.ts`** — `toolsForAgent(slug)` filters the tool list by that agent's actual declared permissions (`read`/`write`/`execute` booleans and non-empty strings from `agent.md`).

**What deliberately does NOT exist**: a deploy tool, a git-write tool, or any arbitrary-command tool. DevOps Engineer's `deploy: true` in its `agent.md` frontmatter describes a future capability (Section 26's human-approval-gate rule) — it grants nothing today, because no deploy tool is registered anywhere. This is enforced by absence, not by a permission check that could have a bug: `registry.test.ts` has a standing invariant test that fails if any tool's name or description ever mentions "deploy" or "git," specifically so adding either requires deliberately breaking that test, not just wiring up a handler.

No live model has ever actually called one of these tools yet (that needs real tool-use wiring into `runAgent()`, plus API credits — neither exists). This is the capability layer a future live agent run would call into; today it's exercised entirely by direct import and `npm test`.

Every other stage transition (`LEAD`→`DISCOVERY`, `ESTIMATION`→`PROPOSAL`, etc.) has no gate in this system — that's a deliberate reading of the architecture plan, not a gap to fill later.

## Learn more (Next.js)

- [Next.js Documentation](https://nextjs.org/docs)
- [Learn Next.js](https://nextjs.org/learn)

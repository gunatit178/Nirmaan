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

Verified in Phase 2 against the mock provider only (`src/lib/providers/mock.ts`). **Update, post-Phase-9**: the default live provider is no longer the raw Anthropic API — see "Live model provider" below. `runAgent()` has since actually been run against a real model and produced a genuinely good result (see that section).

All 25 agents in the roster now exist as specs (Phase 4) — see `/agents/README.md` for the full list and what "exists" does and doesn't mean yet.

## Live model provider: the `claude` CLI, not the Anthropic API

The founder made a clear call: don't fund a separate metered API budget for this system. `src/lib/providers/claudeCodeCli.ts` (`ClaudeCodeCliProvider`) is the result, and it's now the model router's **default** provider for every task type (`src/lib/model-router.ts`) — `src/lib/providers/anthropic.ts` (`AnthropicProvider`, the raw Anthropic API) still exists and still works, but nothing routes to it unless you explicitly override.

**How it works**: each call is a fresh, isolated, non-interactive `claude -p --output-format json` subprocess — billed against the founder's existing Claude subscription, not per-token API usage. It requires the `claude` CLI to be installed and logged in on whatever machine runs this (via `CLAUDE_CODE_EXECPATH` when nested inside a Claude Code session, or `claude` on `PATH` otherwise — the same kind of prerequisite `ANTHROPIC_API_KEY` was for the old default).

**The safety-critical part, verified empirically before writing any code**: every call passes `--allowedTools ""`, so the underlying `claude` process has **no filesystem or bash access** — confirmed by asking it to read `/etc/hosts` and watching the attempt show up in `permission_denials` rather than succeeding or hanging. This matters because tool access for agents is Phase 7's separate, scoped registry (`src/lib/tools/`); giving the raw model call itself ambient file/bash access would let every agent silently bypass that whole permission model. A `--max-budget-usd` cap (default `$1.00`, configurable) is also passed on every call as a second, independent line of defense against one runaway response.

**Real cost, not estimated**: the CLI's JSON output reports `total_cost_usd` and real token usage directly — more accurate than `costs/estimateCost.ts`'s pricing-table guess (used as a fallback for `AnthropicProvider`, which doesn't report cost directly). `dispatch.ts` prefers the real number when it's available.

**This was tested live** — the one live-model exception to this whole project's "verified only against mocks" pattern. Product Manager was dispatched against a real, realistic client brief (a photographer portfolio site) through the actual `dispatchTask()` → `runAgent()` → `ClaudeCodeCliProvider` → real `claude` subprocess pipeline, no mocks anywhere in the path. Result: a genuinely well-structured PRD (correct MVP scoping, honestly-flagged low-confidence assumptions, real prioritized open questions), `status: ready-for-handoff`, `confidence: HIGH`, real cost `$0.2349`, ~81 seconds. Run against an isolated fixture project, fully cleaned up afterward — the seeded `demo-project` was untouched.

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

Every other stage transition (`LEAD`→`DISCOVERY`, `ESTIMATION`→`PROPOSAL`, etc.) has no gate in this system — that's a deliberate reading of the architecture plan, not a gap to fill later.

## Tool integrations (Phase 7)

`src/lib/tools/` gives agents scoped, concrete capabilities instead of the free-text permission strings in `agent.md` frontmatter being purely aspirational. Deliberately conservative, given the real security stakes of "let an LLM's output trigger actions":

- **`filesystemTools.ts`** — read/list/write, all confined to `/projects/{id}/` via `resolveProjectPath` (`src/lib/agents/artifactWriter.ts`), which rejects any path that resolves outside the project directory (`../` traversal) by throwing, not by silently clamping. Writes go through the same never-overwrite-in-place versioning `runAgent` already uses (extracted into `artifactWriter.ts` so there's one writer, not two).
- **`testTool.ts`** — the only execute-capable tool. Always runs the fixed command `npm test` in `/app`; its input schema has no field that reaches a command line. An agent can trigger it; it cannot make it run anything else.
- **`commandRunner.ts`** — the only place in this codebase that spawns a process. Takes a command + argv array, never a shell string (`shell: false`), so there's no shell-interpolation surface by construction. Hard timeout (kills the child), output size cap per stream.
- **`registry.ts`** — `toolsForAgent(slug)` filters the tool list by that agent's actual declared permissions (`read`/`write`/`execute` booleans and non-empty strings from `agent.md`).

**What deliberately does NOT exist**: a deploy tool, a git-write tool, or any arbitrary-command tool. DevOps Engineer's `deploy: true` in its `agent.md` frontmatter describes a future capability (Section 26's human-approval-gate rule) — it grants nothing today, because no deploy tool is registered anywhere. This is enforced by absence, not by a permission check that could have a bug: `registry.test.ts` has a standing invariant test that fails if any tool's name or description ever mentions "deploy" or "git," specifically so adding either requires deliberately breaking that test, not just wiring up a handler.

No live model has ever actually called one of these tools yet (that needs real tool-use wiring into `runAgent()`, plus API credits — neither exists). This is the capability layer a future live agent run would call into; today it's exercised entirely by direct import and `npm test`.

## AI evaluation (Phase 8)

`src/lib/evaluation/` implements the capability/regression/hallucination/adversarial eval framework from the architecture plan's Section 37, with real eval cases matching its named examples: Security Engineer catching a seeded SQL injection and a hardcoded secret, QA Engineer catching a seeded off-by-one bug, Principal Architect catching a seeded single-point-of-failure, Technical Writer not fabricating customer names/stats, and both Product Manager and Business Analyst being tested on when to proceed confidently vs. honestly flag a gap (`evalCases.ts`).

**The honest limitation, stated plainly**: `checkers.ts`'s checkers are structural/keyword heuristics (does the output mention "injection," is the structured `risks` list non-empty, is confidence honestly LOW on an ambiguous input) — not a second model grading the first's reasoning. A checker can confirm an agent *mentioned* a planted issue; it can't confirm the agent's reasoning about it was actually good. Real evaluation of agent quality needs a live model and, likely, human or LLM-judge review — this framework is the harness that would run those cases, not a replacement for actually looking at real output.

What's actually proven, without a live model: the harness correctly wires input → `runAgent()` → checker → a durable `Evaluation` record (`runEval.ts`, tested against the real Prisma DB), and — the part worth trusting most — every checker was proven to actually discriminate: each of the 7 eval cases was run through `runEvalCase` twice, once with a hand-written response that plausibly caught the planted issue (must pass) and once with one that plausibly missed it (must fail) (`evalCases.test.ts`). A checker that always returned true regardless of input would pass a naive "does it run" test; it fails this one. Building this test caught two real bugs along the way (a `rawOutput`/`rawResponse` property typo, and invalid YAML generated for empty frontmatter arrays) — exactly the kind of thing "prefer testing over confidence" is for.

## Production hardening (Phase 9)

Scoped to what's genuinely useful with nothing actually deployed yet — no fake monitoring dashboards, no claimed live enforcement:

- **Cost estimation, from real usage, never a guess.** `CompletionResult.usage`/`costUsd` (`src/lib/providers/types.ts`) carry real figures when a provider reports them (`MockProvider` leaves both `undefined` unless a test explicitly sets one — it never fabricates a number standing in for a real call). `ClaudeCodeCliProvider` (the default, added after this phase — see "Live model provider" above) reports real `total_cost_usd` directly from the CLI; `dispatch.ts` uses that when present. `AnthropicProvider` only reports token usage, not cost, so `src/lib/costs/pricing.ts` + `estimateCost.ts` turn that into a USD estimate instead — pricing needs manual updates when prices change, and returns `priced: false` (not a wrong guess) for any unpriced model. `dispatch.ts` logs a cost-tagged line after every dispatch either way (`~$0.2349 (real, reported by claude-code-cli)`, `~$0.0123 (estimated, 500 in / 200 out tokens, claude-sonnet-5)`, or an honest `cost unknown`).
- **`src/lib/observability/projectSummary.ts`** — `getProjectActivitySummary(projectId)` aggregates task/approval counts by status and total estimated spend (parsed from those cost-tagged Event lines) into one object, matching what the architecture plan's Section 30 (Project Dashboard) asks a project overview to show. Not wired into any UI yet — that's a real next step, deliberately out of scope for this phase (a data layer being correct isn't the same as a screen existing for it).
- **`src/lib/security/redact.ts`** — motivated by something that actually happened in this project's own history: a real Anthropic API key was pasted directly into a chat session during Phase 2. This can't prevent that, but `src/lib/db/logEvent.ts` — now the one function anything in this codebase uses to write an `Event` row, replacing three separate `prisma.event.create` call sites in `dispatch.ts`, `approvals.ts`, and `qualityGates.ts` — runs every message through it before writing, so a secret an agent's output happened to echo back (e.g. Security Engineer quoting a hardcoded key it found while reviewing code) can't silently end up sitting in a durable, dashboard-visible log. It's a safety net, not a guarantee — it only catches patterns it knows about.

Also fixed while building this: the first draft of the "hardcoded secret" eval case (Phase 8) used a realistic-looking fake Stripe key string, which GitHub's push protection correctly rejected on the first push attempt. Replaced with an obviously-not-a-key placeholder describing the same scenario — never reached the remote.

## Learn more (Next.js)

- [Next.js Documentation](https://nextjs.org/docs)
- [Learn Next.js](https://nextjs.org/learn)

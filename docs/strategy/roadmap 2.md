---
status: IMPLEMENTED (this plan) · phases marked individually
date: 2026-09-23
---

# Roadmap and implementation plan

Status legend used across every doc in `/docs`:

| Label | Meaning |
|---|---|
| **IMPLEMENTED** | Built, tested and merged. You can use it today. |
| **PLANNED** | Designed and committed to, not built yet. |
| **PROPOSED** | A recommendation that still needs a founder decision. |
| **EXPERIMENTAL** | Built, but not trusted for real client work yet. |

## Target state

```text
TARGET STATE
├── Product architecture   → two experiences over one data model (product/portal-architecture.md)
├── Business architecture  → services → recurring → products (company/business-model.md)
├── Agent architecture     → orchestrated specialists + human gates (ai/agent-architecture.md)
├── Data architecture      → traceable objects with human IDs (product/project-knowledge-graph.md)
├── Client workflow        → problem → proposal → approval → progress (operations/lead-to-project.md)
├── Internal workflow      → lead → discovery → … → maintenance (operations/project-lifecycle.md)
└── Financial workflow     → quote → estimate → actual → margin (finance/project-economics.md)
```

## Phases

### Phase 0: Foundation · IMPLEMENTED

- Audit of the current state (`assessment/current-state.md`).
- The full `/docs` structure, with every doc marked by status.
- Data model for phases 1–4, designed once so later phases don't reshape tables.
- Internal design system for `/app`, reusing the public site's tokens.

### Phase 1: Business OS · IMPLEMENTED (this PR)

The highest-value phase: without it there is nowhere to put a customer, and
nothing can be shown to one.

| Capability | Scope in Phase 1 |
|---|---|
| Authentication | Email + password (scrypt), database sessions (hashed tokens, httpOnly cookie, 14-day expiry), login/logout. |
| RBAC | 10 roles, capability-based (`can(role, capability)`), checked in every server action and page, not just hidden in the UI. |
| Audit log | Every security-relevant action (login, lead status, proposal sent / decided, gate decisions, change requests). |
| Human-readable IDs | `LEAD-`, `REQ-`, `FEAT-`, `TASK-`, `TEST-`, `PROP-`, `CR-`, `PRJ-`, `DEPLOY-`, allocated atomically. |
| Leads | Public intake API (validated, honeypot, rate-limited, CORS-locked) plus manual entry, a pipeline list, detail pages and status changes. |
| Discovery | Business Analyst agent in discovery mode turns a raw problem into FACT / ASSUMPTION / QUESTION / RECOMMENDATION items. A human confirms or rejects each one. Only facts and confirmed assumptions can become requirements (enforced in code). |
| Requirements | `REQ-` items with kind, priority, acceptance criteria and a link back to the discovery item they came from. |
| Proposals | Structured proposal (problem, solution, scope, out of scope, deliverables, milestones, technology, price, payment schedule, maintenance option, assumptions, change policy) with internal-only estimated economics. |
| Client proposal review | Capability link (`/p/<token>`, token stored hashed): approve, reject or ask for clarification. |
| Project creation | Approving a proposal automatically creates the client, the project workspace (`PRJ-`), links requirements, records the PROPOSAL gate and logs it all. |
| Traceability | `REQ → FEAT → TASK → TEST → DEPLOY` links with evidence records. The project page shows which requirements are untested or undeployed. |
| Change requests | `CR-` with a scope decision. In scope becomes a task; out of scope carries cost and timeline impact and needs a decision. |
| Approvals | Existing gate engine, extended from 6 to 9 gates, with decisions attributed to a real user and capability-checked. |
| Client status page | Capability link (`/status/<token>`) with a simple progress bar and current milestone. No internal detail. |
| Today dashboard | Founder view of real Phase 1 numbers (leads, pipeline, conversion, projects, approvals, CRs, AI cost) and an exceptions list. Revenue, margin and MRR say "Phase 3" instead of showing fake numbers. |
| AI usage ledger | `AiUsage` rows (model, provider, tokens, cost, latency, task, success) for every discovery run. |
| Public site | Repositioned around "You bring the problem. We build the system." Progressive problem-first intake. Agency OS page removed from public view. |

### Phase 2: AI software factory · PLANNED

- Solution Architect run from approved requirements (build vs buy, simplest safe
  architecture, tradeoffs), producing an ARCHITECTURE gate artifact.
- Planner: requirements → features → tasks with owners, so `dispatchTask()` has
  work to run. (Deciding who owns a task is still unsolved; see
  `architecture-plan.md`.)
- Implementation, QA and DevOps agents wired to the tool registry, with evidence
  records written automatically from real test runs.
- Record every existing `runAgent()`/`dispatchTask()` call in the `AiUsage` ledger
  as well (today only discovery writes there; dispatch still logs cost to Event).
- Model routing by task criticality (cheap / standard / strongest + human review).

### Phase 3: Financial OS · PLANNED

- Invoices and payments against the proposal's payment schedule.
- Actual cost entries (human hours, AI, infrastructure, other) against the
  estimate on the proposal, giving actual gross margin per project.
- Recurring plans (hosting, maintenance, support) with renewals, MRR and
  customer lifetime value.
- CFO screen: estimated vs actual by project and by service type.

### Phase 4: Knowledge and IP · PLANNED

- Reusable asset library (name, version, dependencies, maturity, projects using it).
- Post-mortems generated at handover and fed into the knowledge base.
- Client accounts (Client Admin / Client User) replacing capability links where
  clients need ongoing access to deliverables and support.

### Phase 5: Productization · PROPOSED

Only when the data shows the same problem across several clients. See
`strategy/productization.md` for the criteria.

## Build method (every phase)

```text
PLAN → IMPLEMENT → TEST → REVIEW → DOCUMENT
```

After every milestone: run all tests, typecheck, lint and build; check
responsive behaviour and permissions; update docs and `CHANGELOG.md`.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Over-building (a "platform" before revenue) | Phases gated on use. Phase 2 starts only when Phase 1 is in daily use for real leads. |
| Public repo leaks internal numbers | Docs hold models and policy only. Figures live in the database. **PROPOSED:** make the repo private. |
| Custom auth bugs | Small surface: scrypt, constant-time compare, hashed session tokens, `httpOnly`/`sameSite=lax`/`secure` cookies, tests. Move to a maintained library if the auth surface grows (SSO, MFA). |
| SQLite limits | Fine for one or two internal users. The migration trigger to Postgres is documented in `engineering/architecture.md`. |
| Agent output treated as truth | Discovery output is typed and always needs a human decision. Gates stay human-only. |
| Capability links forwarded to the wrong person | Tokens are unguessable (256-bit) and stored hashed. The founder can revoke or regenerate them. Links grant one action on one object, never an account. |

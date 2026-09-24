# Project lifecycle · IMPLEMENTED (stages, gates, client view)

```text
LEAD → DISCOVERY → REQUIREMENTS → ESTIMATION → PROPOSAL ─[PROPOSAL]→ APPROVED →
PLANNING ─[PLAN]→ DESIGN ─[DESIGN]→ ARCHITECTURE ─[ARCHITECTURE]→ IMPLEMENTATION
─[IMPLEMENTATION]→ QA ─[QA]→ SECURITY_REVIEW ─[PRODUCTION]→ DEPLOYMENT
─[HANDOVER]→ MONITORING → MAINTENANCE
```

`[GATE]` marks a transition that needs a recorded human approval. REQUIREMENTS
is also a gate (REQUIREMENTS → PLANNING) for projects that enter at that stage,
such as the seeded demo.

## Gates (the six original plus three business gates)

| Gate | Approve only if | Decided by |
|---|---|---|
| PROPOSAL | Client accepted scope, price and schedule | The client, via their proposal link |
| REQUIREMENTS | Clear problem, users, scope, acceptance criteria, assumptions | Founder / CTO |
| PLAN | Features, tasks, owners, milestones and risks are agreed | Founder / CTO |
| DESIGN | UX flows, responsive behaviour, components, accessibility | Founder / CTO |
| ARCHITECTURE | Simplest safe architecture, data model, API, security, deployment | Founder / CTO |
| IMPLEMENTATION | Tests, error handling, docs, code review | Founder / CTO |
| QA | Functional, responsive, accessibility, regression, with evidence | Founder / CTO |
| PRODUCTION | Security review, deployment plan, monitoring, rollback, backups | Founder / CTO |
| HANDOVER | Client accepted delivery; docs and access handed over | Founder / CTO, after the client's written acceptance |

Enforcement: `moveToNextStage()` refuses a gated transition without an
APPROVED record for that gate. Production deployments can't even be recorded
without an approved PRODUCTION gate and a written rollback plan.

## What the client sees

Five phases instead of fifteen stages: Discovery, Design, Development, Testing,
Deployment, then Live. Also a percentage (APPROVED = 0%, MONITORING = 100%),
the current milestone, and the one thing needed from them. Internal stage
names, gates and agents never appear.

## Post-mortem at handover · PLANNED (Phase 4)

What went well, what went wrong, what caused rework, what was underestimated,
what should become reusable or automated, what should change in pricing or
process. Answers go into the knowledge base.

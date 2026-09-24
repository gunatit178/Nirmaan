# Agent architecture

Specialized agents, not one giant agent, coordinated by an orchestrator,
with humans at every irreversible decision.

```text
                 ORCHESTRATOR (dispatchTask, gates)
                          │
      ┌───────────────────┼───────────────────┐
  Discovery          Architecture          Planning
 (BA, PM, Research)  (Principal Architect)  (PM)  ← PLANNED: planner
      └───────────────────┼───────────────────┘
                   Implementation (FE, BE, DB, AI/ML)
                   ┌──────┴──────┐
                   QA         Security
                   └──────┬──────┘
                      Deployment (DevOps; no deploy tool exists, by design)
```

Every stage has **input** (artifacts plus structured records), **output** (a
versioned artifact with handoff frontmatter: status, confidence, assumptions,
risks, open questions), **validation** (reviewing agents plus eval checkers) and
an **approval gate** (human).

## What runs today

| Capability | Status |
|---|---|
| 25 agent specs in `/agents/*/agent.md` | IMPLEMENTED (specs) |
| `runAgent` / `dispatchTask`, review-task fan-out, complexity-based model tiering | IMPLEMENTED (tested with the mock provider; one live Product Manager run) |
| Business Analyst **discovery mode** from a raw customer problem, producing typed discovery items | IMPLEMENTED (tested with the mock provider; live runs use the founder's `claude` CLI) · treat as **EXPERIMENTAL** until reviewed on 10 real leads |
| Gate enforcement on stage moves | IMPLEMENTED |
| Scoped tools (project filesystem, fixed test runner; no deploy, no git) | IMPLEMENTED |
| Solution Architect run from approved requirements, reviewed by a person | IMPLEMENTED (Phase 2) · EXPERIMENTAL until reviewed on real projects |
| Planner creating FEAT/TASK with agent owners, on acceptance | IMPLEMENTED (Phase 2) · EXPERIMENTAL |
| Orchestrator loop with per-project budget, dependency order, stop on failure | IMPLEMENTED (Phase 2) |
| Implementation agents writing code into a client repository | PLANNED |

## Guardrails

- The model call itself has no tools (`--allowedTools ""`); tools go only
  through the scoped registry.
- Customer text is fenced and labelled as data, not instructions (prompt-injection hygiene).
- Output must match a strict contract (JSON for discovery). Anything else is
  rejected and recorded as such, never partially trusted.
- Agent output can never directly become a requirement, a price or a stage move.

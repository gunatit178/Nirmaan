# Agents

Each subdirectory is one Agency OS agent, defined as plain markdown rather than embedded in application code. This keeps agents human-reviewable and portable — see the architecture plan for the full rationale.

Every `agent.md` follows the same structure:

- **Mission** — one sentence, what this agent exists to do
- **Expertise** — what it knows
- **Responsibilities** — what it's on the hook for
- **Inputs** — what it needs to start work, and from where
- **Outputs** — what artifact(s) it produces, and where they're written (`/projects/{id}/...`)
- **Tools** — what it's allowed to touch (filesystem, web research, terminal, etc.) — least privilege
- **Constraints** — hard rules it must never break
- **Decision rules** — how it resolves ambiguity on its own vs. when it must ask
- **Quality criteria** — what "done well" looks like for this agent's output
- **Escalation rules** — when it must stop and hand off to the Orchestrator or a human, and why

## Status

Only two agents exist so far — this is Phase 1 of the roadmap (proving the pattern), not the full roster:

- [`orchestrator/`](orchestrator/agent.md) — plans work, dispatches to other agents, enforces quality gates
- [`product-manager/`](product-manager/agent.md) — the first specialist agent, turns a client brief into a PRD

The remaining ~21 agents (Business Analyst, Market Research, Brand Strategist, Content Strategist, Technical Writer, SEO, Creative Director, UX Designer, UI Designer, Design System Engineer, Principal Architect, Frontend/Backend/Database/AI-ML Engineers, DevOps, Security, QA, Performance, SRE, Legal, Client Communication, Finance) are scoped in the architecture plan's Agent Architecture table and get written in Phase 4, each tested against a real or realistic input before being trusted with anything client-facing.

No orchestration runtime exists yet (that's Phase 2) — these files are specifications to be executed by a future runtime, not currently wired into any code.

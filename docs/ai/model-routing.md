# Model routing · IMPLEMENTED (per task type + complexity nudge) / PLANNED (criticality)

`src/lib/model-router.ts` maps task types to models:

| Task type | Used for | Default tier |
|---|---|---|
| classification | cheap triage | Haiku |
| requirements, content, research, code | most agent work, including discovery | Sonnet |
| architecture | architecture, security, orchestration decisions | Opus |

Plus `complexityHeuristic.ts` nudges one tier up or down per task from its
text (free, no extra model call), logged when it fires.

**PLANNED:** criticality routing, so that critical architecture and security
output always gets the strongest model **and** a human review gate, while
low-risk bulk work (summaries, formatting) is pinned to the cheapest tier.
Overrides per task type via `AGENCY_OS_MODEL_<TYPE>_PROVIDER/_ID` env vars.

# Project knowledge graph · IMPLEMENTED

```text
Client → Lead → DiscoveryItem → REQ-104 ─SATISFIED_BY→ FEAT-027 ─IMPLEMENTED_BY→ TASK-088
                                   │                     │                          │
                                   └──────VERIFIED_BY────┴──────────────→ TEST-031 ─ Evidence (14/14 PASS)
                                                         └──SHIPPED_IN──→ DEPLOY-012
```

- Nodes are real rows with stable, human-readable codes. Edges are `TraceLink`
  rows. Only the sensible relations are allowed (REQ→FEAT, FEAT→TASK,
  REQ/FEAT/TASK→TEST, FEAT/TASK→DEPLOY), checked in code.
- Every requirement keeps its origin: the discovery item, and so the
  customer's words, it came from.

Questions it answers today (`src/lib/trace/service.ts`):

| Question | How |
|---|---|
| Which requirement does this feature satisfy? | edges into FEAT |
| Which tests validate this requirement? | `traceMatrix()` |
| Was this requirement deployed? | `traceMatrix().deployments` |
| Why does this code or deployment exist? | `upstreamRequirements(code)` |
| What's still unproven? | `traceMatrix().gaps`, shown on the project page |
| What could break if this requirement changes? | downstream traversal. Exposed in the UI: **PLANNED** |

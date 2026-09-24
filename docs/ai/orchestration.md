# Orchestration

**IMPLEMENTED:** `dispatchTask(taskId)` runs the task's owner agent, records
the artifact, advances task status from the agent's reported handoff status,
and creates review tasks for the agents in its `reviewed_by` list. Quality
gates block stage moves without a human approval.

**IMPLEMENTED (Phase 2):**

1. Planner: approved requirements → FEAT-### → TASK-### with owner agents,
   created only when a person accepts the plan (`src/lib/factory/planner.ts`).
2. Orchestrator loop (`src/lib/factory/orchestrate.ts`): dispatches READY tasks
   whose dependencies are at least in review, one at a time, re-checking the
   project's AI spend against its budget before each run; stops at the first
   failure.
3. Evidence capture: CI posts results to `/api/ci/evidence` (`src/lib/factory/ci.ts`).

**PLANNED:** a scheduled runner (today a person clicks "Run ready tasks"), and
code-writing agents working in a client repository.

Agents never call each other directly. All hand-offs go through tasks the
orchestrator creates, so every step is visible and stoppable.

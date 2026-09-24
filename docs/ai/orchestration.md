# Orchestration

**IMPLEMENTED:** `dispatchTask(taskId)` runs the task's owner agent, records
the artifact, advances task status from the agent's reported handoff status,
and creates review tasks for the agents in its `reviewed_by` list. Quality
gates block stage moves without a human approval.

**PLANNED (Phase 2):**

1. Planner: approved requirements → FEAT-### → TASK-### with owner agents
   (fills the known gap: nothing yet decides a task's owner).
2. Orchestrator loop: dispatch READY tasks in dependency order, with a
   per-project budget cap from the AI cost ledger.
3. Evidence capture: test-runner results written as Evidence rows against
   linked TEST-### items.

Agents never call each other directly. All hand-offs go through tasks the
orchestrator creates, so every step is visible and stoppable.

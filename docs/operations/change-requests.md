# Change requests · IMPLEMENTED

"Can you also add X?"

```text
Log it (CR-###) ─► assess against the approved proposal's scope list
   ├─ in scope  ─► becomes TASK-### in the backlog (no extra cost)
   └─ out of scope ─► impact + additional cost + additional days
                      └─ founder/CTO decision, only after the client agrees in writing
                         ├─ approved ─► TASK-### created, cost recorded
                         └─ rejected
```

Rules enforced in code:

- Out-of-scope with zero cost and zero time is refused ("free work"). Either
  it's in scope, or it's priced.
- A project manager can log and assess, but only `change:decide` (founder,
  CTO) can accept cost impact.
- Every step is on the project's activity feed and in the audit log.

Why: unpriced scope creep is the most common way a fixed-price project loses
its margin.

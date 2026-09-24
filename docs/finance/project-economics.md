# Project economics (financial model)

```text
Quoted revenue      = proposal.priceTotal (+ approved change requests)
Estimated cost      = human + AI/API + infrastructure + other   (on the proposal)
Expected gross profit = revenue − estimated cost
Expected gross margin = expected gross profit ÷ revenue

Actual cost         = Σ cost entries (hours × rate, AI usage, infra bills, other)
Actual gross margin = (revenue − actual cost) ÷ revenue
```

| Piece | Status |
|---|---|
| Quoted revenue, estimated cost, expected margin, estimated hours on every proposal | **IMPLEMENTED** (visible only with `economics:read`) |
| Approved change-request cost deltas | **IMPLEMENTED** (recorded on each CR) |
| AI cost per lead/project from the usage ledger | **IMPLEMENTED** for discovery, architecture, planning and every agent dispatch; converted to INR at the settings rate |
| Invoices, payments, outstanding balance | **IMPLEMENTED** (Phase 3) |
| Actual cost entries and actual margin; estimate-vs-actual per project and per service type | **IMPLEMENTED** (Phase 3), `/os/finance` and each project's Money panel |

## The learning loop (after every project)

What did we estimate incorrectly? What caused overruns? What can be
standardized? What should the price change to? Answers feed
`pricing-principles.md` and the reusable-IP library.

# Portal architecture (information architecture)

Two experiences, one data model, different permissions and UX.

## Customer surfaces

| Surface | Where | Status |
|---|---|---|
| Positioning, services, process, work | nirmaan.online (static) | IMPLEMENTED |
| Problem-first intake (3 progressive steps) | nirmaan.online/contact → OS `/api/intake` | IMPLEMENTED (the endpoint goes live when the OS is deployed) |
| Proposal review: approve / request changes / decline | OS `/p/<token>` | IMPLEMENTED |
| Project progress | OS `/status/<token>` | IMPLEMENTED |
| Deliverables, support requests, invoices, multi-project view | OS client accounts | PLANNED (Phase 3–4) |

## Internal OS (`/os`)

```text
Today (founder: exceptions + sales, delivery, money)
Pipeline
  Leads → lead detail (problem, discovery, requirements, proposals, notes)
  Proposals → editor (+ internal economics) → client preview → send
Delivery
  Projects → workspace (lifecycle, requirements & evidence, tests, change requests,
             deployments, tasks, artifacts, activity)
  Approvals (human gates)
Company
  AI usage · Audit log · Team
```

The lifecycle drives the navigation: a lead is worked in Pipeline until
approval, then lives in Delivery. Nothing internal is reachable from the
customer surfaces: different routes, no shared navigation, `noindex`
everywhere, and server-side capability checks.

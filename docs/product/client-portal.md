# Client portal

Principle: simple, honest, no internal complexity.

**IMPLEMENTED**

- Proposal page: problem, proposed solution, in and out of scope,
  deliverables, timeline, price with an exact payment schedule, optional
  maintenance, assumptions, change policy, validity; then approve / ask for
  changes / decline, with their name and a note.
- Status page: a progress bar, five plain phases, current milestone, "what we
  need from you", last updated.
- Both are private capability links (unguessable, hashed, revocable,
  `no-referrer`, `noindex`).

**IMPLEMENTED (Phase 4): client accounts** at `/portal`

- Client Admin and Client User logins, each bound to one client. The founder
  creates them on the Team screen.
- Every query is scoped by the user's client; a client role is redirected
  away from `/os`, and internal pages refuse client roles.
- Shows: projects with plain phases and "what we need from you", sent
  invoices with amounts due, and support requests with their status.
- Client Admins can ask for a change (it arrives as a change request for the
  team to estimate) and see invoices; Client Users see status and support.
- Never shows costs, margins, agents, AI usage or internal notes.

**PLANNED:** deliverable downloads and online payment.

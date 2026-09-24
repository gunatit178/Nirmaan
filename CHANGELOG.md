# Changelog

## 2026-09-25: Website: a quieter hero, and the name in Gujarati

- Hero: the pixel N on the left, the line on the right, nothing else. The
  studio line is larger and carries the name twice in Gujarati, set in
  Khastakshar by Bhaumik Suthar (CC BY-ND 4.0, unmodified, credited in the
  footer): નિર્માણ "to build" and નિર્માન "without ego".
- The problem → system box moved into "How we work": the customer's words
  as the opening statement, then each step stamps its outcome ("problem
  understood", "system designed"…) as the line reaches it, with "you
  approve" on the steps that need your sign-off.

## 2026-09-25: Website: page flow and a page for every plan and service

- Page transitions rebuilt: the next page is laid over the old one block by
  block (a stepped mask, portrait and landscape), the old page steps back the
  way you're travelling, and a clicked card's title flies into the next
  page's heading. Browsers without view transitions get the same block build
  from a small overlay. Links are prefetched on intent.
- Scroll motion on every screen size: headings uncover from the baseline,
  section rules draw across, prices count up, payment bars fill, cards get a
  pointer spotlight, and the homepage tower builds on phones too.
- New pages: /pricing/<plan>.html (4), /pricing/care/<plan>.html (3) and
  /services/<service>.html (17), each with fit, what's included and not,
  timeline, payments at the starting price, related plans or services, FAQ.
  Every card and "see more" link now opens its own page.
- Contact form knows where you came from (?plan=, ?care=, ?service=), shows
  it, pre-selects a budget range and sends it as `interest` (new
  `Lead.interest` column in the OS, shown on the lead page).

## 2026-09-24: Nirmaan OS, Phase 5 (Productization signals)

- `/os/patterns`: won projects grouped by kind of work, scored against the
  four productization criteria (pass / fail / unknown), with recorded
  pursue / not-now decisions in the knowledge base.

## 2026-09-24: Nirmaan OS, Phase 4 (Knowledge and IP)

- IP library with computed maturity, knowledge base with search, mandatory
  post-mortems before handover.
- Client accounts and a `/portal` scoped to one client: projects, invoices,
  support requests, change requests.
- Support queue for the team.

## 2026-09-24: Nirmaan OS, Phases 2 and 3

- AI software factory: architect, planner, budgeted orchestrator, metered
  dispatch, criticality routing, CI evidence endpoint.
- Financial OS: invoices from payment schedules, payments, GST, actual costs,
  project economics, care-plan billing, CFO screen.

## 2026-09-24: Nirmaan OS, Phase 1 (Business OS)

**Positioning** · The public site now leads with "You bring the problem. We build
the system." The contact page is a three-step, problem-first intake instead
of a project-type form. Services gained AI systems, mobile apps,
integrations, internal tools and modernisation. The public Agency OS page
was removed (it exposed internal agent architecture); its customer-relevant
ideas moved to Process → "How we keep it honest". Old links redirect.

**Nirmaan OS (`/app`)** · Authentication and capability-based RBAC; audit
log; human-readable IDs; leads and public intake API; Business Analyst
discovery mode with typed facts, assumptions, questions and
recommendations; requirements; structured proposals with internal
economics; client proposal links (approve, request changes, decline);
automatic project creation; traceability (REQ→FEAT→TASK→TEST→DEPLOY) with
evidence; change requests; 9 human gates; client status links; the
founder's Today screen; AI usage ledger; team management. 42 new tests
(149 total).

**Docs** · Full `/docs` structure with status labels (IMPLEMENTED / PLANNED /
PROPOSED / EXPERIMENTAL), including the current-state audit and roadmap.

**Not done yet (planned)** · Deploying the OS (so the website intake is not
live yet), Phase 2 AI software factory, Phase 3 financial OS, Phase 4
knowledge and IP, client accounts.

## 2026-09-23: "Block by block" redesign

New visual identity built from the Nirmaan logo; Tailwind and three.js removed.

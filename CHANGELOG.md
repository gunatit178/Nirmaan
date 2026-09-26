# Changelog

## 2026-09-26: Website: phones no longer zoom out at the pricing section, plus a review pass

- Fixed: on phones, scrolling to the homepage pricing section zoomed the whole
  page out and dropped you near the end. Hidden screen-reader text in the
  package buttons escaped the swipe row once the cards revealed, widening the
  page. Swipe-row cards now contain their own positioned content, rows never
  capture vertical swipes, and cards off to the side reveal with the first.
- Small phones (320–360px): process and case-study pages no longer zoom out
  (headline sizes, the system map and the dock now fit the screen).
- Search: canonical, link-preview and sitemap URLs now use
  www.nirmaan.online, the address the site is actually served from; the
  homepage describes the studio to search engines (structured data); page
  descriptions trimmed to fit search results.
- Copy: service names keep their acronyms mid-sentence ("AI systems", not
  "ai systems"); the closing headlines read correctly to search engines and
  screen readers ("Step one is a conversation."); one reply-time promise
  (24 hours) everywhere; project timelines on the process page match the
  pricing; "fixed quote" instead of "cost estimate"; curly quotes throughout.
- Accessibility: text-only swipe rows can be scrolled from the keyboard.
- OS: the CI evidence endpoint no longer returns internal error details; bad
  payloads get 400/422, unexpected failures a plain 500.

## 2026-09-25: Website: contact details, and the services rail on phones

- Contact email is now nirmaansoftware@gmail.com; X (@Nirmaansoftware) added
  to the footer, the contact page and the link-preview tags.
- The homepage services rail now moves sideways as you scroll on phones
  too (any screen at least 520px tall), sized to the visible screen and kept
  clear of the dock.

## 2026-09-25: Website: built for phones

- Hero fills the first screen: a large mark (finer grid on small screens),
  the headline at full column width, a full-width button; tapping the grid
  sends a ripple of blue blocks out from your finger.
- Page transitions on phones slide like a native app: forward, the new page
  arrives complete from the right while the old one eases left and dims;
  back, the page slides off to the right. The nav and dock stay put.
- The homepage layer tabs on phones light up as you read them, top to
  bottom, instead of building from the bottom.
- Long card lists (packages, principles, prices, care plans, related
  services, plan switcher) become swipe rows with dots and a "2 / 4" count.
- A dock keeps "Tell us your problem" within thumb reach once the page's own
  buttons scroll away, and steps aside for the closing call to action.
- The menu builds down row by row and ends with the call to action and email.
- Cards and buttons give a little under your thumb; the footer is two
  columns instead of one long list.

## 2026-09-25: Website: a quieter hero, led by the mark

- Hero: the headline on the left, a large pixel N on the right leading the
  composition; the build-log box is gone.
- A larger studio line with both meanings of the name: निर्माण "to build"
  and निर्मान "without ego".
- The problem → system story moved into "How we work": the customer's
  words as the opening statement, then each step stamps its outcome as the
  line reaches it, with "you approve" on the steps that need sign-off.

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

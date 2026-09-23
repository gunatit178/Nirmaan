/**
 * One-off dogfood run: dispatch Nirmaan's own agent roster, for real,
 * against Nirmaan's own marketing site (the static site at the repo root,
 * not this Next.js app). Calls runAgent() directly — same production code
 * path as dispatchTask(), just without the Project/Task DB rows, since
 * this isn't a client project in the Prisma DB.
 *
 * Run from app/:  npx tsx scripts/nirmaan-website-review.ts
 */
import { runAgent } from "../src/lib/agents/runAgent";
import { ClaudeCodeCliProvider } from "../src/lib/providers/claudeCodeCli";
import type { TaskType } from "../src/lib/model-router";

const PROJECT_ID = "nirmaan-website";

// Generous timeout — architecture-tier (Opus) responses run longer than
// the provider's 180s default under load.
const provider = new ClaudeCodeCliProvider(undefined, 300_000);

const SITE_CONTEXT = `
## What this is

Nirmaan is a small custom website & software development studio. This is a
review of Nirmaan's OWN public marketing site — not a client project, not a
new product brief. The site is live today; you're critiquing something real
and shipped, not speccing something from zero.

## Current implementation

Plain static HTML/CSS/JS, no framework. Tailwind utility classes for layout
plus a hand-authored styles.css for the rest. Six pages: Home (index.html),
Services, Projects, Process, Technology, Contact. Supporting scripts:
page-transitions.js (direction-aware page transitions), layers-3d.js
(Three.js 3D layer scenes in the hero and an "architecture" section),
tilt.js (tilt-on-hover for cards), contact-form.js (form validation,
posts to a Formspree-style endpoint), device-switcher.js (device-preview
toggle on the Projects page). All motion respects prefers-reduced-motion
and degrades to a static page if a feature can't run.

## Visual system today

Dark theme, fixed (no light mode): background #080C14, surface #0D1117,
elevated #111827, indigo accent #6366f1 / #818cf8, text #F8FAFC / #94A3B8 /
#475569. Typography: Inter for body/UI, Manrope (extrabold) for display/
headings. Recurring motifs: a faint indigo grid background, soft glow
"orb" blurs, gradient-text spans on hero headlines, glassy cards with a
tilt-on-hover interaction, numbered "01 / 02 / 03" step markers on the
Process page.

## Actual homepage hero copy (verbatim)

Eyebrow: "Website & Software Development Studio"
H1: "We Build / Digital Experiences / That Work."
Subhead: "Custom websites, web applications and software systems —
designed, developed and built around your business." followed by "We
don't just build the front end. We build the complete digital solution —
website, backend, database, APIs, admin systems and business logic."
CTAs: "Start Your Project" (primary), "View Our Work" (secondary).
Social proof line: "Trusted by businesses including Sudaangeo.in and
Khelshiksha.com" (two real client sites).

## Other page headlines (verbatim)

Services: "From idea to fully working / digital product." — 13 service
cards (Custom Website Development, Business Websites, Website Redesign,
E-commerce Websites, Performance Optimization, Website Maintenance &
Support, Custom Web Applications, Backend & API Development, Database &
API Development, Business Automation, Custom Admin Panels & Dashboards,
Mobile-Responsive Web Development).
Projects: "Work that speaks / for itself."
Process: "A clear process. / No surprises." — five steps: Discover, Plan,
Design, Build, Launch & Support.
Technology: "Tools of / the trade." — Frontend / Backend / Database /
Tools & Infrastructure groupings.
Contact: "Have an idea? / Let's build it." — includes a "Project
Estimator" widget.

## Brand

The studio just adopted the name "Nirmaan" (Gujarati: નિર્માણ — read one
way, "creation"; read another, "nir + maan", without ego). The founder
decided the site stays English-only — no Gujarati script anywhere on the
site itself; the name's dual meaning is backstory, not a visual motif to
force onto the page.

## The actual ask driving this review

The founder's own words: "current website is too basic and seems vibe
coded, needs highly human touch like designer, CTO, QA and creativity."
Take that at face value — it's a working site, not a broken one, but it
reads as templated/generic rather than considered, and the founder wants
your honest, specific judgment on why and what to actually change. Ground
every point in what's ACTUALLY on this site (quoted above), not generic
best-practice advice that could apply to any site. Vague praise or vague
criticism is a failure mode here — cite the actual section, copy, or
pattern you mean.
`.trim();

interface Task {
  agentSlug: string;
  taskType: TaskType;
  outputRelativePath: string;
  brief: string;
}

const tasks: Task[] = [
  {
    agentSlug: "creative-director",
    taskType: "content",
    outputRelativePath: "design/visual-direction.md",
    brief: `
Your job: judge whether this site has a coherent, deliberate visual
direction or just an assemblage of trendy dark-SaaS patterns (grid bg,
glow orbs, gradient-text, glassy tilt cards). Name the specific things
that read as generic/templated vs. genuinely considered. Then give this
site an actual point of view — mood, hierarchy principles, an
interaction philosophy (what should motion communicate here, not just
"it has motion") — specific enough that a UX and UI designer could work
from it without re-guessing your intent. Since there's no separate
brand-strategist artifact yet, ground your direction in the "Nirmaan"
brand meaning already given to you.

Cover, in one document: what's working and should be protected, what
reads as generic and why, 4-6 concrete visual-direction principles, and
explicit do/don't examples anchored to real elements of this site (name
the section).`.trim(),
  },
  {
    agentSlug: "ux-designer",
    taskType: "content",
    outputRelativePath: "design/ux-spec.md",
    brief: `
This runtime writes one artifact per agent call, so put everything in
this single document rather than the separate sitemap/flows/wireframes
files your spec normally produces: a short structural sitemap, the core
user flows and states worth calling out (first-time visitor → contact,
mobile nav, the Contact page's Project Estimator flow specifically),
and explicit accessibility/responsive rules.

Your job: independent of visual polish, is the actual structure and
flow of this six-page site doing its job for a visitor trying to decide
whether to hire this studio? Look specifically at: the path from
landing on the homepage to actually starting a conversation (two CTAs:
"Start Your Project" vs "View Our Work" — do they serve different
intents or fragment attention?), whether 13 service cards on one page
is discoverable or overwhelming, and what's structurally missing (e.g.
no visible pricing signal, no case-study depth from "Work that speaks
for itself" alone). Call out specific usability or conversion friction
points, not generic UX-heuristics language.`.trim(),
  },
  {
    agentSlug: "ui-designer",
    taskType: "content",
    outputRelativePath: "design/ui-spec.md",
    brief: `
This runtime writes one artifact per agent call, so put your full spec
in this single document rather than separate files.

Your job: turn "needs a human touch, not vibe-coded" into an actual
visual design spec against the CURRENT token set (bg #080C14, surface
#0D1117, elevated #111827, accent #6366f1/#818cf8, text #F8FAFC/#94A3B8/
#475569, Inter + Manrope). Don't propose a different theme unless the
current one is genuinely the problem — say explicitly whether the
palette/type pairing itself is the issue or whether it's execution
(spacing, hierarchy, restraint, component consistency) layered on a
fine foundation, because those get very different fixes. Give a type
scale, a spacing scale, and concrete component-state specs (hover/
focus/active) for the two most template-feeling patterns on this site:
the tilt-hover cards used across Services/Projects/Technology, and the
numbered 01-05 step cards on the Process page. Flag anything you'd
outright remove as a "vibe-coded" default (e.g. is gradient-text on
every hero headline actually a considered choice or a reflex?).`.trim(),
  },
  {
    agentSlug: "principal-architect",
    taskType: "architecture",
    outputRelativePath: "architecture/adr.md",
    brief: `
You're the CTO-level read on this, not a designer. This is a static
HTML/CSS/JS site (no framework, no build step besides a Tailwind CSS
compile) that a solo founder maintains directly by hand-editing 6 HTML
files with a lot of duplicated markup between them (nav, footer, CTA
sections repeated per page). Judge the technical foundation, not the
visuals: is staying framework-free and hand-duplicated across 6 pages
still the right call at this size, or is the maintenance cost (a
content change needs editing in up to 6 places) already past where a
templating layer, a static-site generator, or even just a small build-
time include step would pay for itself? Also assess: page-weight/perf
posture given Three.js is loaded for 3D hero scenes, whether the current
approach to SEO/meta tags across pages is sound, and one clear
recommendation with real tradeoffs stated (not "just use Next.js"
without justifying the migration cost against a solo founder's time).
Write this as a real ADR: decision, context, alternatives considered,
consequences.`.trim(),
  },
  {
    agentSlug: "qa-engineer",
    taskType: "code",
    outputRelativePath: "testing/test-report.md",
    brief: `
This runtime writes one artifact, so fold test plan, key test cases, and
your release-recommendation verdict into this single document.

There's no formal PRD for this site, so treat the hero copy and page
purposes given to you as the acceptance criteria: the site should let a
prospective client understand what Nirmaan does and reach the contact
flow, on both desktop and mobile, without broken states. Actively look
for what a "vibe-coded" site tends to get wrong that a careful QA pass
would catch: reduced-motion and no-JS fallbacks actually degrading
gracefully (the README claims every 3D/motion feature falls back — is
that a real guarantee or an aspiration?), the contact form's behavior
before a real Formspree endpoint is wired up on a live domain, keyboard/
focus behavior on the tilt-hover cards and page-transition links,
mobile behavior of the 13-card Services grid and the device-switcher
on Projects, and cross-page consistency (do nav/footer/CTA sections
actually match across all six hand-maintained pages, or have they
already drifted?). Give a go / no-go / go-with-known-issues verdict.`.trim(),
  },
];

async function main() {
  const only = process.argv[2];
  const toRun = only ? tasks.filter((t) => t.agentSlug === only) : tasks;
  for (const task of toRun) {
    process.stdout.write(`Dispatching ${task.agentSlug} (${task.taskType})... `);
    const start = Date.now();
    try {
      const result = await runAgent({
        agentSlug: task.agentSlug,
        taskType: task.taskType,
        projectId: PROJECT_ID,
        userInput: `${SITE_CONTEXT}\n\n## Your specific task\n\n${task.brief}`,
        outputRelativePath: task.outputRelativePath,
        provider,
      });
      const secs = ((Date.now() - start) / 1000).toFixed(1);
      console.log(
        `done in ${secs}s -> ${result.filePath}\n  status=${result.metadata.status} confidence=${result.metadata.confidence} model=${result.model} cost=${
          result.costUsd !== undefined ? `$${result.costUsd.toFixed(4)}` : "unknown"
        }`
      );
    } catch (err) {
      console.log(`FAILED: ${(err as Error).message}`);
    }
  }
}

main();

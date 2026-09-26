# Deployment

## Public site · IMPLEMENTED

Vercel from `main`; static output of Eleventy (`npm run build` at the root).
`.vercelignore` keeps `app/`, `agents/`, `docs/`, `projects/` and `scripts/` out of
the site deploy. `vercel.json` holds redirects (for example `/agency-os.html` →
`/process.html#honest`) and baseline headers.

## Nirmaan OS · PLANNED (not deployed yet; runs locally)

Recommended first deployment (see `procurement.md`):

1. A small VM or container host with a **persistent disk** for SQLite (for
   example a basic Fly.io machine or a VPS), because serverless platforms
   don't keep a writable SQLite file. Or switch to managed Postgres first if
   the host must be serverless.
2. Environment: `NODE_ENV=production`, `NIRMAAN_OS_URL=https://os.nirmaan.online`,
   `NIRMAAN_INTAKE_ORIGINS=https://nirmaan.online,https://www.nirmaan.online`,
   and the `claude` CLI logged in, or `ANTHROPIC_API_KEY` plus a routing override.
   For prospecting, optionally `GOOGLE_PLACES_API_KEY`, and `OUTREACH_FROM` with
   `SMTP_URL` (or `RESEND_API_KEY`) to send approved emails
   (see `../product/prospecting.md`).
3. Ship `/agents` alongside the app (the runtime reads specs from `../agents`,
   or set `AGENTS_ROOT`).
4. `npx prisma migrate deploy`, then create the founder:
   `NIRMAAN_PASSWORD=... npm run user:create -- you@… "Name" FOUNDER`.
5. Set `intakeEndpoint` in the site's `src/_data/site.json` to
   `https://os.nirmaan.online/api/intake` and redeploy the site.
6. Nightly database backup off the machine, and a restore drill once.

## Standard pipeline for client projects · PLANNED (Phase 2 automates it)

```text
Code → lint → typecheck → unit → build → integration → security checks → preview
→ human approval (PRODUCTION gate) → production → smoke test → DEPLOY-### recorded
```

Today the OS already enforces the human step: a production DEPLOY record
can't be created without an approved PRODUCTION gate and a rollback plan.

## GitHub Pages: keep it off

The public site is served only by Vercel (www.nirmaan.online). GitHub Pages
must stay disabled for this repository: its Jekyll build can't read the
Eleventy templates in `src/` (every push fails with "Unknown tag 'set'"), and
while it was on it kept serving an outdated copy of the site at
`nirmaansoftware.github.io/Nirmaan`. Only the repository owner can change
this, in Settings → Pages.

# Agency OS

Internal multi-agent platform. See [`/docs/architecture-plan.md`](../docs/architecture-plan.md) at the repo root for the full architecture, agent roster, and roadmap. Separate from the public marketing site at the repo root — this is its own Next.js project with its own `package.json`.

## Getting started

```bash
npm install
npm run dev       # http://localhost:3000
```

## Agent runtime (Phase 2)

`src/lib/agents/` loads an `/agents/<slug>/agent.md` definition, runs it against structured input through the model router (`src/lib/model-router.ts`), and writes the result as a versioned artifact with handoff-metadata frontmatter into `/projects/{project-id}/...`.

```bash
npm test           # plumbing tests — mock provider, no network call, no API key needed
```

Verified so far against the mock provider only (`src/lib/providers/mock.ts`) — no live model has been run against this yet. `src/lib/providers/anthropic.ts` implements the real provider and is wired into the model router, but isn't currently exercised by anything in this repo; running an agent against a live model requires setting `ANTHROPIC_API_KEY` in the environment and calling `runAgent()` yourself (e.g. from a script or an API route added in a later phase).

Only two agents exist so far (`orchestrator`, `product-manager`) — see `/agents/README.md` for status and the rest of the planned roster.

## Learn more (Next.js)

- [Next.js Documentation](https://nextjs.org/docs)
- [Learn Next.js](https://nextjs.org/learn)

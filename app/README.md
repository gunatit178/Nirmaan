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
npm run demo:pm    # live run: Product Manager agent against a sample brief, real Anthropic call
```

`npm run demo:pm` requires `ANTHROPIC_API_KEY` — copy `.env.example` to `.env.local` and fill it in. Without a key it fails with a clear error rather than pretending to succeed.

Only two agents exist so far (`orchestrator`, `product-manager`) — see `/agents/README.md` for status and the rest of the planned roster.

## Learn more (Next.js)

- [Next.js Documentation](https://nextjs.org/docs)
- [Learn Next.js](https://nextjs.org/learn)

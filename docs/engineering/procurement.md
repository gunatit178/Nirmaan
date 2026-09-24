# Technology procurement

Before paying for anything, answer: (1) do we need it now? (2) what problem
does it solve? (3) what's the free tier's limit? (4) at what scale does it
become necessary? (5) can we migrate away? (6) monthly cost? (7) does it
improve revenue, reliability or velocity enough to justify it?

| Need | Recommendation | Status |
|---|---|---|
| Public site hosting | Vercel (free tier, already in use) | IMPLEMENTED |
| OS hosting | Small VM or container with a persistent disk; a few dollars a month | PROPOSED |
| Database | SQLite now; managed Postgres only on the trigger in `architecture.md` | IMPLEMENTED / PROPOSED |
| Model access | The founder's Claude subscription via the `claude` CLI (no metered API budget); API key as an opt-in override | IMPLEMENTED |
| Email sending (proposal links, notifications) | Not needed yet: links are copied into the founder's own email. Add a transactional email service when volume makes that painful. | PROPOSED |
| Error tracking / APM | Not yet. Host logs are enough at this scale. | PROPOSED |
| Auth provider | Not yet. The built-in auth is small and tested; switch if SSO, MFA or client accounts arrive. | PROPOSED |
| Payments / invoicing | Decide in Phase 3 (manual bank transfer plus an invoice PDF may be enough) | PLANNED |

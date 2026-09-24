# Risks and mitigations

| Risk | Severity | Mitigation | Status |
|---|---|---|---|
| **Public repository** exposes internal docs, agent specs and strategy | High | Docs hold no real figures or client data. **Recommend making the repository private** (Vercel deploys work the same). | PROPOSED (founder decision) |
| Repo lives in an iCloud-synced folder; iCloud evicted ~20k `node_modules` files, which made lint hang and slowed the tests 150× | Medium | Reinstalled dependencies. **Recommend moving the repo out of `~/Documents`/iCloud Drive or turning off "Optimize Mac Storage"**, which also stops the `node_modules 2` / `package-lock 2.json` duplicates. | PROPOSED |
| Website intake not connected until the OS is deployed | Medium | The form says so honestly and shows the email address | IMPLEMENTED (behaviour) / PLANNED (deploy) |
| Over-building before revenue | Medium | Phase gates; Phase 2 starts only once Phase 1 is used on real leads | IMPLEMENTED (plan) |
| Custom auth bugs | Medium | Small surface, tests, hashed tokens, rate limits; move to a library if it grows | IMPLEMENTED |
| AI output treated as fact | Medium | Typed discovery, human decisions, strict parsing, gates | IMPLEMENTED |
| SQLite on serverless hosting | Medium | Deploy on a persistent-disk host, or migrate to Postgres first | PLANNED |
| Single founder as the only approver | Medium | Gates are role-based (a CTO can decide), and the audit trail supports delegation | IMPLEMENTED |
| Capability link forwarded | Low | One object, one action, revocable, invalidated on use | IMPLEMENTED |

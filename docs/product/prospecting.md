# Prospecting · IMPLEMENTED (EXPERIMENTAL until used on real outreach)

Finding businesses Nirmaan could help, before they ask. Lives in the Nirmaan OS
at **Pipeline → Prospects** (`/os/prospects`), code in `app/src/lib/prospecting/`.

The website waits for people to bring a problem. Prospecting goes looking for the
problem: businesses that match the [ideal customer](../company/ideal-customer-profile.md)
and show a visible sign of it (no website, phone-only bookings, a site that isn't
built for phones, a busy business running on WhatsApp).

## The flow

```text
Search            "dental clinics" in "Ahmedabad", for Local service businesses
  ↓               Google Places + a web search (Claude, read-only web tools)
Prospects         PROS-###, one per real business (merged by place, website or name+city)
  ↓
Check             their homepage is read (phones? booking? store? how old?),
  ↓               then Claude scores the fit 0–100 and suggests a package
Draft             Claude writes a short first message by email or WhatsApp
  ↓
Approve           a person reads and edits the exact words, then:
  ↓                 email → "Approve and send" (founder/CTO), sent by the OS
  ↓                 WhatsApp → "Open in WhatsApp", sent from your phone
Replied?          "They replied" → "Create lead": LEAD-### (source OUTBOUND),
                  and from there the normal pipeline (discovery → proposal → project)
```

Nothing reaches a business without a person approving the exact message. The fit
score is advice, never a trigger.

## Guard rails (enforced in code, not just the UI)

- **Approval:** only roles with `outreach:send` (founder, CTO) can send or mark a
  message sent. Project managers can search, check and draft (`prospect:run`).
- **Do not contact:** an email, phone or website domain on the list is left out of
  searches and can't be drafted to or sent to. "They asked not to be contacted"
  on a prospect adds its email, phone and domain and cancels its drafts. Anyone who
  replies "stop" goes on the list.
- **Opt-out line:** every message ends with "Not relevant? Reply “stop” and we
  won’t contact you again." It's added when sending and can't be edited away.
- **One message per business per week**, and at most `OUTREACH_DAILY_LIMIT` emails
  a day (default 20). Small batches keep the address out of spam folders.
- **Only published emails:** the web search drops any email it can't say where it
  saw; the site check only picks up addresses on the business's own site.
- **Web content is data:** search results and web pages are parsed strictly as JSON
  or plain signals. The web search runs `claude` with exactly `WebSearch` and
  `WebFetch` allowed (no files, no shell), and nothing it returns can act.
- **Safe site checks:** the fetcher refuses private and internal addresses (including
  after redirects), odd ports and non-web schemes, with time and size caps.
- **Everything is logged:** searches, checks, drafts, sends and do-not-contact
  changes go to the audit log; every Claude call to the AI usage ledger
  (`prospect-search`, `prospect-audit`, `outreach-draft`).

## Setup

| Variable | What it does |
|---|---|
| `GOOGLE_PLACES_API_KEY` | Enables Google Places. A Google Cloud key with the **Places API (New)** enabled, restricted to that API. Without it, searches use the web only. |
| `OUTREACH_FROM` | Sender, e.g. `Nirmaan <you@example.com>`. Required for the OS to send email. |
| `SMTP_URL` | e.g. `smtps://you%40gmail.com:APP-PASSWORD@smtp.gmail.com:465` (a Gmail **app password**, never the account password). |
| `RESEND_API_KEY` | Alternative to SMTP (needs a verified sending domain). |
| `OUTREACH_REPLY_TO` | Optional: where replies go, if not `OUTREACH_FROM`. |
| `OUTREACH_DAILY_LIMIT` | Emails per day, default 20 (max 200). |
| `OUTREACH_SENDER_NAME` | Sign-off name, e.g. `Asha` → "Asha, Nirmaan". Default "Team Nirmaan". |

Without email settings, approved emails are copied and sent by hand, then marked
with "I sent it myself". The web search and all Claude calls use the same model
routing as the rest of the OS (the `claude` CLI by default).

## Cost

- **Google Places:** one Text Search request per search (up to 20 businesses),
  billed by Google per request after the monthly free credit.
- **Claude:** one call per web search, one per check, one per draft. All appear
  under AI usage with their task names.

## Before relying on it · PROPOSED

- **Google's terms:** Places content other than the place ID generally shouldn't be
  stored long term. Keep only prospects you're actively working, and dismiss the
  rest. A clean-up of old untouched prospects is a candidate next step.
- **Privacy law (India, DPDP Act):** outreach goes to published business contact
  details, one message at a time, with an opt-out that's always honoured. Keep it
  that way. No bought lists, no scraping personal numbers.
- **Email reputation:** a sending domain (not a free mailbox) with SPF, DKIM and
  DMARC set up is better for deliverability once volume grows.
- **First real run:** the web search is unit-tested against recorded replies, not
  yet run live against the `claude` CLI. Try one small search and check the
  results before relying on it.

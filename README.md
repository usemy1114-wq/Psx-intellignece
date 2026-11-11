# PSX AI Financial Intelligence Dashboard

A private, research-only terminal for the Pakistan Stock Exchange. It scans the
whole listed universe, ranks it, matches news to companies, and produces AI
research signals — with every number traceable to a real source and timestamp.

**It never trades.** There is no broker connection and no order path anywhere in
the codebase. Signals and proposals are research artefacts for a human to read.

---

## 1. Running it

```bash
cd app
pnpm install
pnpm dev          # API on :3001, web on :3000
```

Open `http://localhost:3000`, click **Create account**, and sign up. The first
account is a normal account — there is no admin role and no seeded user.

### Environment

`.env` is written by the scaffold and already contains what the app needs
(`DATABASE_URL`, `JWT_SECRET`). Nothing else is required for the app to run.

| Key | Needed for | Status |
|---|---|---|
| `DATABASE_URL` | Postgres | set by scaffold |
| `JWT_SECRET` | session signing | set by scaffold |
| `RESEND_API_KEY` | **sending the password-reset code by email** | optional — see below |
| `RESET_EMAIL_FROM` | the verified sender address for that email | optional — see below |
| `SUPPORT_EMAIL` | only referenced by `_core/env.test.ts` | optional |
| `STRIPE_SECRET_KEY` | only referenced by `_core/env.test.ts` | not used by this app |

No third-party API key is required for market data. Every data source below is
public and keyless.

### Serving under a path prefix (why the app works in a new tab)

The app is served at the origin root in local dev and in a published app, but the
platform's preview proxy serves it under a path prefix:

```
https://<host>/swarm/api/webapps/<id>/preview
```

The template this app was built from assumed a per-app origin at `/`, so every
URL it emitted was root-absolute (`/trpc`, `/src/main.tsx`, `/assets/*.js`) and
the router had no base. Opened **inside the Studio iframe** that happened to
work, because the iframe is served from the sandbox host where `/` *is* the app.
Opened **directly in a new tab** at the prefixed URL, the same URLs asked the
host for those paths, got 404s, and the page rendered an empty shell — the HTML
loaded and nothing else did.

The fix resolves the mount path at runtime and routes every URL through it:

| Where | What it does |
|---|---|
| `client/src/lib/base-path.ts` | Resolves the base once from `<base>` / `window.__APP_BASE__` / `import.meta.url`; exposes `withBase()`, `apiUrl()`, `stripBase()` |
| `client/src/_core/trpc.ts` | API URL is `apiUrl("/trpc")`, not a bare `/trpc`; fetch sends credentials explicitly |
| `client/src/main.tsx` | `<Router base={ROUTER_BASE}>` so links, redirects and `navigate()` emit and match app-relative paths |
| `vite.config.ts` | Dev plugin strips the prefix from incoming requests and rewrites `index.html` with the real prefix + a matching absolute `<base href="{prefix}/">` |
| `server/_core/base-path.ts` | `detectBase()` + `rewriteIndexHtml()` — matches the platform prefix by shape, then peels known routes |
| `server/_core/serve.ts` | `withBaseStripping()` rewrites the URL **before** Hono routes; `index.html` served explicitly so the rewrite always runs; SPA fallback for deep links |

Two details are load-bearing and easy to get wrong again:

- **The `<base>` must be absolute with a trailing slash.** A relative base
  (`./`) resolves against the document URL, and `…/preview` has no trailing
  slash — so the browser treats `preview` as a file name and every asset
  resolves one directory too high.
- **The URL must be rewritten before routing, not in a middleware.** Hono
  captures route params from the original URL, and `serveStatic` resolves the
  file from it, so a middleware that swaps `c.req.raw` is too late.

`server/_core/base-path.test.ts` covers all of this, including a guard that fails
if a route is added to `App.tsx` without its segment being added to
`APP_ROUTE_SEGMENTS` — the one way this can silently break again.

### Password reset email — read this before promising anyone an email

The "Forgot password" flow issues a 6-digit code. **By default no email is sent,
because no email provider is configured.** The platform's own email primitive
(`server/_core/email.ts`) is a signature whose endpoint is not wired, so it
throws; this app therefore has its own transport layer
(`server/services/mailer.ts`) and prints the code to the **server log** when no
provider is configured:

```
[password-reset] No email provider configured — no email was sent.
[password-reset]   email: you@example.com
[password-reset]   code : 123456
[password-reset]   valid: 10 minutes, single use
[password-reset]   set these to enable real delivery: RESET_EMAIL_FROM, RESEND_API_KEY (or SENDGRID_API_KEY, or SMTP_HOST)
```

The UI repeats that fact verbatim — it says *"No email provider is configured, so
no email was sent"* and names the exact variables still missing. It never claims
an email was sent when one was not.

#### Turning on real delivery

`server/services/mailer.ts` supports **three** providers and picks the first one
with complete credentials, in this order. Set the variables in
**Settings → Environment variables**; nothing else changes, and the same code
path starts returning `delivered: true`.

| Order | Provider | Variables | Notes |
|---|---|---|---|
| 1 | **Resend** | `RESEND_API_KEY`, `RESET_EMAIL_FROM` | simplest; free tier is enough |
| 2 | **SendGrid** | `SENDGRID_API_KEY`, `RESET_EMAIL_FROM` | free tier available |
| 3 | **SMTP** | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `RESET_EMAIL_FROM` | any mailbox; port 465 = implicit TLS, 587/25 = STARTTLS |

`RESET_EMAIL_FROM` is required by all three — a verified sender such as
`PSX Intelligence <no-reply@yourdomain.com>`. For SendGrid the bare address is
extracted automatically from the `Name <addr>` form.

The email itself is a table-based HTML template with inline styles (Outlook and
several webmail clients strip `<style>` blocks, so a modern-CSS template would
arrive unstyled). It carries the app name, the code set large and letter-spaced,
the 10-minute expiry, a "if you did not request this, ignore it" line, and a
"we will never ask you for this code" security note.

If a configured provider **rejects** the message, the UI shows the provider's own
error text rather than a success message, and the code is still written to the
server log as a fallback.

**Security properties of the code** (all enforced server-side, in
`server/services/passwordReset.ts`):

- stored as a **bcrypt hash**, never in plain text — the app cannot read a code
  back, which is why the UI never displays one
- **10-minute expiry**, single use
- **only one code can be live per address** — issuing a new one consumes every
  earlier unconsumed row
- **60-second resend cooldown** and a **5-per-hour cap** per address
- **5 wrong attempts** void the code
- the response to a request is **identical whether or not the address has an
  account**, so the flow cannot be used to discover who has registered
- the reset step needs a short-lived signed token minted only after a correct
  code, so the code cannot be replayed

---

## 2. Data sources (all verified live, 2026-11-09)

| Source | What it gives | Endpoint |
|---|---|---|
| PSX Data Portal — screener | 754 equities: price, change %, 1Y change, P/E, dividend yield, market cap, free float, 30-day avg volume, sector | `dps.psx.com.pk/screener` |
| PSX Data Portal — indices | 18 indices incl. KSE-100, KSE-30, KMI-30, All Share | `dps.psx.com.pk/market-summary/indices` |
| PSX Data Portal — company page | annual + quarterly Sales / Profit after Tax / EPS / margins, ratios, 52-week range, market cap, shares, free float, announcements with PDF links | `dps.psx.com.pk/company/{SYMBOL}` |
| PSX Data Portal — sector summary | sector-level movement | `dps.psx.com.pk/market-summary/sector` |
| Dawn Business, Express Tribune Business, ARY News, Associated Press of Pakistan | news RSS | see `server/services/rss.ts` |
| metals.live | gold, silver, platinum | `api.metals.live/v1/spot` |
| open.er-api.com | USD/PKR | `open.er-api.com/v6/latest/USD` |
| Yahoo Finance chart API | Brent, WTI, natural gas, copper, wheat, palm oil, coal, steel, gold, silver, platinum, USD/PKR | `query1.finance.yahoo.com/v8/finance/chart/{TICKER}` |
| FRED (St. Louis Fed) | fallback for Brent (`DCOILBRENTEU`), WTI (`DCOILWTICO`), gas (`DHHNGSP`), copper (`PCOPPUSDM`), wheat (`PWHEAMTUSDM`), palm oil (`PPOILUSDM`), steel PPI (`WPU1017`) | `fred.stlouisfed.org/graph/fredgraph.csv?id={SERIES}` |

**Market data is approximately 5-minute delayed.** The PSX public portal is not a
real-time feed, and the UI labels it that way everywhere — it is never called
"live".

### Commodities: all 12 instruments are live

The earlier build listed Brent, WTI, gas, copper, wheat and palm oil as
unavailable. That gap is closed: Yahoo Finance's chart endpoint needs no key and
covers all of them, and FRED's CSV endpoint is a second independent source for
seven of them. Each row records which source actually answered, so a FRED-sourced
Brent price is labelled FRED, not Yahoo.

The Dashboard's Commodities & FX panel is now driven **entirely by the stored
rows** — it renders whatever the refresh engine actually fetched, with each
instrument's source and age, and lists any instrument that returned no quote
under "No quote returned by any source" with the reason on hover. It can no
longer drift from the data, because there is no hardcoded list left in the UI.

Two caveats that are shown in the UI rather than hidden:

- **FRED series are daily, not intraday.** A FRED-sourced price carries the
  observation date, not a tick time.
- **Steel is a producer-price index (`WPU1017`), not a spot price.** It is
  labelled as such; it is not comparable to a mill quote.

If both sources fail for an instrument, the row keeps its previous value with its
age, or shows "unavailable" — never a placeholder number.

---

## 3. How the refresh works

There are **two** mechanisms, and the first one is a real background loop.

### 3a. In-process scheduler (`server/services/scheduler.ts`)

The server starts a scheduler on boot. It ticks every 15 seconds and runs each
dataset when its TTL has expired:

| Dataset | TTL | What it does |
|---|---|---|
| Market quotes + indices | 15 min | screener + index levels |
| News | 10 min | all RSS feeds, then re-maps new stories to symbols |
| Fundamentals | 24 h | company pages, rotating through the universe |
| Commodities | 30 min | 12 instruments, Yahoo then FRED |
| Discovery / signals / events | derived | recomputed after the above |

This runs **whether or not anyone has the dashboard open**, including nights,
weekends and PSX holidays. Every run writes a row to `refresh_log` with its
status, row count and error, and the Dashboard's "Data source health" panel reads
that table — so "it is automatic" is a claim you can check, not a promise.

`GET /api/scheduler` returns the live state (last tick, next due per dataset,
consecutive failures). The scheduler backs off after repeated failures instead of
hammering a source that is down.

**What the platform does not provide:** a separate worker process or external
cron. The scheduler lives inside the web server process, so it runs while the
server is up. If the server is asleep (a scaled-to-zero preview), nothing ticks
until it wakes — which is why refresh-on-open still exists as the second
mechanism. This is stated plainly rather than described as a daemon.

### 3b. Refresh on open + "Refresh now"

Every page load asks the server for data; the server re-fetches only what is
stale. The header's **Refresh now** button forces a full pass.

**On failure the previous snapshot is kept and its age is shown.** A failed fetch
never blanks a panel and never invents a value. Every panel carries its
`updated_at` and its source name.

### 3c. Live polling in the browser — and the bug it fixes

**The symptom:** the dashboard looked live inside the chat sidebar but appeared
frozen in its own tab — indices and prices "stuck at last updated".

**The cause was a policy with three holes, not one broken query:**

1. The `QueryClient` was built with **no default options** (`new QueryClient()`),
   so every query used react-query's defaults: `refetchOnWindowFocus: true` but
   `refetchInterval: undefined` and `staleTime: 0`. With no interval, nothing
   ever re-fetched on its own.
2. Only **two** queries in the whole app asked for an interval (the index strip's
   `market.indices` at 60 s, and `scheduler.status` at 30 s). Every price, index,
   news item, discovery list and AI signal on every other page sat at whatever it
   was when the page mounted.
3. The index strip's interval ran in **both** contexts — which is exactly why the
   strip alone looked alive in the sidebar and the rest looked dead in a tab.

Nothing keyed off `window.parent`, `postMessage` or `document.hasFocus()`. The
real distinction was simply *which queries happened to carry an interval*.

**The fix, at all three layers so no page can drift out of date again:**

| Layer | File | What it does |
|---|---|---|
| Query defaults | `client/src/main.tsx` | `makeQueryClient()` sets a stale window per data family and **one shared refetch interval**, so a page added later inherits live behaviour instead of opting in by hand. |
| Visibility-aware poller | `client/src/lib/live-poller.ts` | A single module-level poller per tab, shared by every mounted hook (so N panels do not mean N timers). It **never branches on "am I framed"** — a standalone tab polls exactly like an embedded one. It pauses only when the tab is genuinely hidden, and refetches **immediately** on `visibilitychange` → visible, on `focus`, and on `online`. |
| Failure handling | same | Consecutive failed rounds back off exponentially (30 s → 60 s → … capped at 5 min) and recover to the normal cadence on the first success. The header shows the failure count and the last error. |

The header's freshness indicator reads the **most recent successful data read**,
not the mount time — using the mount time made the age climb forever even while
polls were succeeding, which is the same "stuck" symptom in a different place.

A full pass over all 754 company pages takes roughly 25 minutes at the polite
rate limit (one request at a time, ~200 ms apart). It runs in the background and
is resumable: a symbol whose fundamentals are newer than the TTL is skipped, so an
interrupted run continues where it stopped.

---

## 4. Scoring model

Weights are fixed and displayed on every ranked row:

| Component | Weight |
|---|---|
| Fundamental strength | 25% |
| Earnings & revenue growth | 20% |
| Financial health | 15% |
| Valuation | 10% |
| News sentiment | 15% |
| Momentum & volume | 10% |
| Sector outlook | 5% |

A component with no data is **excluded and the confidence is lowered** — it is
never scored as neutral-positive. `score_breakdown` on each stock records which
components were available and which were missing, and the UI shows that list.

### What the ranked rows show

Each row on `/bullish`, `/bearish` and `/discovery` carries the **reported**
figures, not just the score components:

- revenue, profit-after-tax and EPS growth **versus the prior year**, read from
  the stored annual financials, with the period they belong to
- net margin, financial health score, P/E, dividend yield
- the composite score, its confidence level, and the full component breakdown
- the time horizon and the potential impact
- **that stock's own news feed** — headline, source, publication time, detection
  time, sentiment, estimated impact and a clickable link to the original article

A symbol with no stored annual financials shows `—` in the growth columns and an
explicit note in its "Why" panel saying no financials are stored, rather than a
zero that would read as "no growth". A symbol with no matching story says
**"No recent news found"** and explains that this is an absence of coverage, not
evidence that nothing happened.

---

## 5. Pages

| Route | Page |
|---|---|
| `/` | Dashboard Overview — indices, market status, top bullish/bearish, critical news, most affected companies, announcements, commodities, AI sentiment, watchlist alerts |
| `/bullish` | Top 20 Bullish Stocks |
| `/bearish` | Top 20 Bearish Stocks |
| `/discovery` | Stock Discovery — all 15 categories |
| `/news` | Breaking News Center |
| `/events` | Event Impact Analysis |
| `/mapping` | News → Stock Mapping |
| `/research` | AI Buy/Sell Research |
| `/proposals` | Trade Proposal Center |
| `/portfolio` | Portfolio Intelligence |
| `/performance` | Historical AI Performance |
| `/watchlist` | Watchlist |
| `/settings` | Settings |
| `/stock/:symbol` | Company detail — fundamentals, news feed, signal, announcements |
| `/index/:symbol` | **Index detail** — level, change, day high/low, derived previous close, observed-level chart, weighted sector split, full constituents table with search and sort |
| `/login`, `/register` | Auth — includes the 3-step **Forgot password** flow |

### Global elements (on every page)

| Element | What it does |
|---|---|
| **Disclaimer gate** | A blocking modal shown before any data is reachable. It cannot be dismissed by the backdrop, Escape, or scrolling past — only by ticking the box and pressing the button. The acknowledgement is recorded with a timestamp in `localStorage` and re-armed after each sign-in. The same text is always one click away from the footer's **Disclaimer & terms** link. |
| **Index strip** (sticky, top) | Every headline index is a **link to its detail page**, and each carries a **mini sparkline** of the levels this deployment has actually observed, with an as-of tooltip. |
| **Freshness indicator** (header) | A colour dot plus the exact age of the most recent successful data read — green ≤20 min, amber ≤45 min, red beyond. Thresholds are set around the server's 15-minute market TTL so a healthy cache is never painted amber. It also shows the live poll interval and, when polling is paused, why. |
| **PSX Assistant** (bottom-right) | A chat panel that answers from this app's own stored snapshot. See §6. |

---

## 6. The PSX Assistant (chat)

The floating **Ask PSX** panel answers questions about a company, the market,
commodities, news, the discovery lists, your portfolio and your watchlist.

**It is not a language model and it does not guess.** Every figure in an answer is
read from the database by `server/services/chat.ts`, and every answer carries:

- the **age of the data** it used ("data as of 13m ago"),
- its **sources as clickable links**,
- a **confidence level**, and
- any **warning** the server attached — stale quotes, low-confidence scores, or
  instruments with no reachable source.

When the snapshot cannot answer something it says so and lists what it *can*
answer, rather than inventing a number. A question phrased as *"should I buy
X?"* is answered with the stored research signal and the facts behind it, plus an
explicit statement that this is not advice — the assistant never tells you to buy
or sell.

It is behind the same session guard as every other read, so an anonymous visitor
cannot query the database through the widget.

---

## 7. Privacy model

Accounts are on. Every user-scoped table (`portfolio_holdings`, `watchlist`,
`proposals`, `user_notes`, `alert_prefs`) is filtered by `ctx.user.id` on every
read and write — enforced in `server/db.ts`, not in the UI. Market data
(`stocks`, `news_items`, `discovery_lists`, …) is shared reference data.

A second account cannot see the first account's portfolio. This is covered by
tests in `server/routers.test.ts`.

---

## 8. Tests

```bash
pnpm test        # vitest
pnpm typecheck   # tsc --noEmit
```

`server/routers.test.ts` asserts the properties that would be security or
correctness bugs if they regressed: every data read requires a session (including
the chat), every user-scoped write carries the session user's id, a duplicate
signup maps to CONFLICT without leaking the bcrypt hash, the scoring weights total
100, the 15 discovery categories are present with unique keys, and the
password-reset procedures are public but reject malformed input.

`server/test-setup.ts` loads `.env` before any test module is imported, so
`pnpm test` works on its own — `_core/env.ts` reads `DATABASE_URL` / `JWT_SECRET`
at module load and throws without them.

---

## 9. Known limitations

- **The scheduler is in-process, not a separate worker.** It runs while the web
  server is up. The platform offers no external cron or worker process, so a
  scaled-to-zero preview does not tick. Refresh-on-open covers that case. For a
  guaranteed 7:30 AM briefing independent of the app, a scheduled agent task is
  the right tool.
- **No email / Telegram / push alerts.** Alerts are in-dashboard only. The one
  exception is the password-reset code, which needs `RESEND_API_KEY` +
  `RESET_EMAIL_FROM` to leave the server (see §1) — without them it goes to the
  server log and the UI says so.
- **No PDF export.**
- **Fundamentals coverage is 639 of 754 symbols** (4,819 annual + quarterly
  periods). The remaining ~115 are symbols whose PSX company page carries no
  financial statements at all — ETFs, preference shares, rights, and a few
  newly-listed names. They show "unavailable" for fundamentals-derived fields
  rather than a guess. A full pass takes ~25 minutes and is resumable.
- **Gross margin is only available where PSX publishes it** (1,635 periods). Net
  margin is derived as PAT / Sales wherever both exist (3,288 periods) and is
  labelled as derived. Where neither exists the cell shows "—".
- **News→stock matching is keyword + sector-topic based**, not semantic. It is
  deliberately conservative: word-boundary matched, aliases per symbol, capped at
  12 direct + 30 sector-topic symbols per story, and every mapping carries a
  confidence level, a relation (direct/indirect) and a stated reason. A story that
  names no company still maps to its sector with `confidence: low` and
  `exposure: mixed` — because "a policy was announced" is not evidence that every
  company in the sector gains. The practical consequence is that a stock's news
  feed is often empty: only 33 of the ranked symbols had a matching story in the
  current window, and the UI says "No recent news found" for the rest rather than
  padding the feed.
- **Event status is `unverified` until a second independent source carries the
  story.** The app never promotes a single-source claim to "confirmed".
- **Historical performance is empty until signals age.** Signals are stored with
  their original timestamp and evidence; the 1-day / 1-week / 1-month / 3-month
  evaluations populate as those horizons pass. Nothing is back-filled or
  rewritten.
- **The chat answers from the stored snapshot, not from a live feed.** If the
  snapshot is stale the answer says so and tells you to press Refresh now. It
  cannot answer a question the stored data does not cover, and it will say that
  rather than guess.

---

## 10. Disclaimer

As an AI Agent, I cannot provide legally protected, personalized investment
advice. This analysis is for informational purposes only and does not constitute
investment advice or recommendations. Consult a licensed financial advisor before
making investment decisions.

# Verified data sources (probed live from the sandbox, 2026-11-09)

Every endpoint below was actually fetched and its response inspected. Anything that
returned 403/404 is listed as **unavailable** and the app degrades honestly instead
of inventing a value.

## PSX Data Portal — `https://dps.psx.com.pk` (primary)

| Endpoint | Status | What it gives | Parser |
|---|---|---|---|
| `/screener` | **200**, 702 KB, server-rendered | Full universe. `<table id="screenerTable">`, one `<tr>` per symbol. Columns: symbol, sector code, listed-in, market cap, price, change %, 1-year change %, PE ratio (TTM), dividend yield %, free float, 30-day avg volume. Every numeric cell carries `data-order` (raw value) and `data-filter` — parse `data-order`, never the formatted text. | `parseScreener()` |
| `/company/{SYMBOL}` | **200**, 75 KB, server-rendered | `#quote` (name, sector, price, change, change %, "As of <date>"), `#profile` (business description, key people, address, website, registrar, auditor, fiscal year end), `#equity` (market cap, shares, face value, free float + %), `#financials` (**annual** Sales / Profit after Taxation / EPS for 4 years **and quarterly** for 4 quarters), `#ratios` (gross margin, net margin, EPS growth, PEG), `#announcements` (date, title, View + PDF links) | `parseCompany()` |
| `/indices` | **200**, 57 KB | `#indicesSlider` — KSE100, KSE100PR, ALLSHR, KSE30, KMI30, BKTI, OGTI, KMIALLSHR, PSXDIV20, UPP9, NITPGI, NBPPGI, MZNPI, JSMFI, ACI, JSGBKTI, HBLTTI with value, change, change % | `parseIndices()` |
| `/indices` (table) | **200** | The same page also carries `#indicesTable` — a proper table with **High, Low, Current, Change, % Change** per index. This is the **only** place the portal publishes an index day range, so the index detail page reads it. Parsed from `data-order` (exact) with a text fallback. | `parseIndicesTable()` |
| `/indices/{CODE}` | **200** | Constituents table, 11 columns: SYMBOL, NAME, LDCP, CURRENT, CHANGE, CHANGE %, **IDX WTG (%)**, **IDX POINT**, VOLUME, FREEFLOAT (M), MARKET CAP (M). Verified: KSE-100 = 100 members summing to 99.99% weight; KSE-30 = 30; KMI-30 = 30; ALLSHR = 558. | `parseConstituents()` |
| `/announcements` | **200**, 50 KB | Announcement search page (keyword + type filters). The table is populated client-side, so the app reads announcements from each company page instead. | — |
| `/sector-summary` | **200**, 48 KB | Page shell only — the sector table is loaded client-side. | — |
| `/timeseries/{int,eod}/{SYMBOL}` | **404** | The endpoint the portal's own charts call. It is **session/IP gated**: it answers 404 to this deployment even with the page's own `X-Req-Id` token, a warmed cookie jar, `X-Requested-With`, and a matching `Referer`. **Unavailable** — no OHLCV or index history. | — |
| `/sector-summary/sectorwise` | **403** | Blocked. **Unavailable** — no sector turnover table. |
| `/historical` (POST) | **404** | The form endpoint is gated the same way. **Unavailable.** |
| `/daily-downloads`, `/historical-downloads` | **200** shell | The download links are injected client-side; no static file URL is exposed. **Unavailable.** |
| `/symbols`, `/market-watch`, `/live`, `/data/*` | **404** | Do not exist. | — |

**Consequence for the app:** sparklines and momentum are derived from the screener's
own fields (1-year change %, 30-day average volume vs current volume, 52-week range
position) rather than from an OHLCV series. The UI says so. No OHLCV row is ever
fabricated.

**Index history — what the app does instead.** Because `/timeseries` is gated and no
keyless replacement exists (checked: Yahoo has no `^KSE` series, stooq is behind a JS
challenge, investing.com returns 403), the app **records what it observes**: every
market refresh appends the index levels it actually read to `index_history`. The
index detail chart and the strip sparklines plot that real series, and the caption
states the window ("observed levels since …") rather than implying a full intraday or
1-year history. Rows older than 400 days are pruned.

**Index fields that are deliberately absent.** The portal publishes no **open** and no
explicit **previous close** for indices, and no **52-week range**. Previous close is
exactly derivable (current − change) and is shown labelled *derived*; open and the
52-week band are shown as **"not available"** with the reason, never estimated.

## News RSS — all fetched and parsed

| Feed | Status | Notes |
|---|---|---|
| `https://www.dawn.com/feeds/business` | **200**, 304 KB | Dawn Business. `<item>` with title, link, description, pubDate. |
| `https://tribune.com.pk/feed/business` | **200**, 98 KB | Express Tribune Business. |
| `https://arynews.tv/feed` | **200**, 68 KB | ARY News (redirects from `/feed/`). |
| `https://www.app.com.pk/feed/` | **200**, 21 KB | Associated Press of Pakistan. |
| `https://www.brecorder.com/feed` | **403** | Blocked. Unavailable. |
| `https://www.sbp.org.pk/rss.xml` | **403** | Blocked. Unavailable. |
| `https://profit.pakistantoday.com.pk/feed/` | **404** | Unavailable. |

## Commodities / FX

| Source | Status | Gives |
|---|---|---|
| `https://api.gold-api.com/price/XAU` | **200** | Gold spot USD/oz + `updatedAt` |
| `https://api.gold-api.com/price/XAG` | **200** | Silver spot USD/oz |
| `https://api.gold-api.com/price/XPT` | **200** | Platinum spot USD/oz |
| `https://open.er-api.com/v6/latest/USD` | **200** | FX rates incl. PKR |
| `https://api.frankfurter.app/latest?from=USD&to=PKR` | 301 → empty | Unavailable |
| `https://stooq.com/q/l/?s=cl.f...` | **404** | Unavailable — no Brent/WTI feed |
| `https://api.coingecko.com/...` | **000** | Unreachable |

**Consequence:** gold, silver, platinum and USD/PKR are real and timestamped. Brent,
WTI, natural gas, coal, copper, steel, wheat and palm oil have **no reachable free
source** — the commodities panel renders them as "unavailable" with the reason,
rather than showing a made-up number.

## Rate-limit / access posture

- One shared `User-Agent` identifying the app, a 10–25 s timeout, and a small
  concurrency cap (4) with a delay between company-page fetches.
- Company pages are fetched only for symbols that need fundamentals, and cached for
  24 h — the full 754-symbol universe is never crawled in one pass.
- No protection is bypassed: a 403 is recorded as a failure in `refresh_log` and the
  previous snapshot is kept with its age.

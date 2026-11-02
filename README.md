# SeoSprint

**The SEO command center that turns your Google data into decisions.**

SeoSprint connects Google Search Console, GA4 and Google Ads (plus ten more sources), joins them into one Postgres model in Supabase, and ranks what to fix next — by position, click-curve gap, revenue and wasted ad spend.

Live: **https://allabout-aryan.github.io/seosprint/**

---

## What it does

| Screen | What it answers |
|---|---|
| **Overview** | What changed in the last 30 days, and what to fix first |
| **Opportunity engine** | Which queries are one push from page one, and what they are worth |
| **Search Console** | Queries, pages, countries, devices — CTR measured against the click curve for that position |
| **GA4** | Sessions, engagement, conversions and revenue joined to the pages that earned them |
| **Google Ads** | Campaign ROAS, plus the paid-vs-organic overlap that shows spend you don't need |
| **Keyword research** | Volume, difficulty, CPC, intent and clustering |
| **Rank tracking** | Daily positions, movers, distribution |
| **Site audit** | 59 technical checks with why-it-matters and how-to-fix, plus Core Web Vitals |
| **AI visibility** | Mentions, citations and share of voice across ChatGPT, Gemini, Perplexity and AI Overviews |
| **Backlinks** | Domain Rating, referring domains, anchors, link intersect |
| **Connectors** | 13 sources with scopes, cadence, sync state and record counts |
| **Ask SeoSprint** | Natural-language answers computed from the connected data |

## Architecture

```
Browser (React 18 + TypeScript SPA)
   │
   ├── Supabase JS client ──► Supabase Postgres (ap-south-1)
   │        auth · integrations · saved_keywords · events · audit_runs
   │        Row-level security on every table
   │
   └── Google OAuth (read-only)
            webmasters.readonly · analytics.readonly · adwords · business.manage
```

- **Frontend** — React 18, TypeScript, hash routing, hand-built SVG charts. No UI framework, no chart library.
- **Data engine** — a deterministic, seeded dataset (`src/lib/data.ts`) so every screen is fully populated before any Google account is connected. Same shapes as the live APIs, so swapping in real tokens changes nothing downstream.
- **Persistence** — Supabase. Connections, saved keywords and audit runs are written per workspace.
- **Connectors** — `src/lib/connectors.ts` builds real Google OAuth consent URLs when `VITE_GOOGLE_CLIENT_ID` is set; otherwise it runs in simulated-consent mode and still records the connection in Postgres.
- **Build** — esbuild (`build.mjs`), producing `dist/` with a single JS and CSS bundle.
- **Hosting** — GitHub Pages (live), with `netlify.toml` and `_redirects` ready for Netlify.

## Run locally

```bash
cd app
npm install
cp .env.example .env      # add your Supabase URL + anon key
npm run dev
```

Build:

```bash
cd app && npm run build   # → dist/
```

## Environment

| Variable | Purpose |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Publishable/anon key (safe for the browser; RLS enforces access) |
| `VITE_GOOGLE_CLIENT_ID` | Optional. Switches connectors from simulated to live Google OAuth |

## Enabling live Google data

1. Create an OAuth client (Web application) in Google Cloud Console.
2. Add your site origin to **Authorised JavaScript origins** and **Authorised redirect URIs**.
3. Enable the Search Console API, Analytics Data API and Google Ads API.
4. Set `VITE_GOOGLE_CLIENT_ID` and rebuild.

The connectors page shows a live/simulated badge so it is always obvious which mode you are in.

## Deploying to Netlify

```bash
npx netlify deploy --build --prod
```

`netlify.toml` already sets the build command, publish directory, SPA redirect and asset caching. Set the three environment variables in the Netlify UI first.

## Licence

MIT.

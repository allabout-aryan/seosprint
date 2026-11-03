# SeoSprint

**A Google-free SEO suite. It crawls the web itself.**

SeoSprint runs its own crawler and reads public search results directly, so it works on any URL without a Google account, an API key or an OAuth screen. Google Search Console, GA4 and Google Ads are optional imports layered on top — never a requirement.

Live: **https://allabout-aryan.github.io/seosprint/**

---

## What actually runs

| Capability | How it works | Needs Google? |
|---|---|---|
| **Site crawl** | Reads `robots.txt` + `sitemap.xml`, crawls up to 25 URLs, parses head/headings/images/links/JSON-LD, scores 23 checks, groups issues by blast radius | No |
| **Page audit** | Same parser on a single URL, with a 0–100 score and a why-it-matters / how-to-fix explanation per finding | No |
| **Compare** | Crawls your page and up to 3 competitors, diffs on-page metrics and surfaces H2 topics they cover that you don't | No |
| **SERP & ranks** | Reads public result pages (DuckDuckGo HTML → DuckDuckGo Lite → Bing), returns the real top 20 and your position | No |
| **Keywords** | Generates candidate modifiers and questions, verifies each against live results, scores competition by big-domain share | No |
| **Broken links** | Fetches every link on a page and reports status codes | No |
| **AI visibility** | Prompt × model matrix for ChatGPT, Gemini, Perplexity, AI Overviews | No |
| **Search Console / GA4 / Ads** | Optional OAuth import of query, session and campaign data | Yes — optional |

## Architecture

```
Browser (React 18 + TypeScript SPA, hash routing)
   │
   ├── Supabase Edge Function  /functions/v1/seo   ← the live engine
   │        audit · site · compare · serp · keywords · links
   │        Deno runtime, fetches the web directly
   │
   ├── Supabase Postgres (ap-south-1)
   │        workspaces · integrations · saved_keywords · audit_runs · events
   │        Row-level security on every table
   │
   └── GitHub Pages  ← this site
```

- **Engine** — `supabase/functions/seo/index.ts`. One file, plain JS so it runs identically under Deno and Node. No dependencies.
- **Data engine** — a deterministic seeded dataset (`src/lib/data.ts`) powers the demo workspace and the optional Google panels, so nothing looks empty before you crawl something.
- **Frontend** — React 18, TypeScript, hand-built SVG charts, no UI or chart library.
- **Build** — esbuild (`build.mjs`) → `dist/` with one JS and one CSS file.

## Run locally

```bash
cd app
npm install
cp .env.example .env      # Supabase URL + anon key
npm run dev
```

## Environment

| Variable | Purpose |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL (required for the live engine) |
| `VITE_SUPABASE_ANON_KEY` | Publishable/anon key — safe in the browser, RLS enforces access |
| `VITE_GOOGLE_CLIENT_ID` | Optional — switches Google imports from sample data to real OAuth |
| `SERPAPI_KEY` | Optional, set on the edge function — used first for rank checks |

## Deploy the engine

```bash
supabase functions deploy seo --project-ref <ref>
supabase secrets set SERPAPI_KEY=<key> --project-ref <ref>   # optional
```

## Deploy the site

```bash
npx netlify deploy --build --prod     # netlify.toml is at the repo root
```

## Honest limits

- Free keyless search is rate-limited from data-centre IPs. When every provider returns nothing, the rank check says so instead of inventing a position. A `SERPAPI_KEY` removes the uncertainty.
- Keyword *volume* comes from paid keyword databases, not Google. SeoSprint reports verified result counts and competition instead of fabricating volumes.
- Backlink data needs a link index; that panel remains sample data.

## Licence

MIT.

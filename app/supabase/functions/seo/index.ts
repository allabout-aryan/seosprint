// SeoSprint live data engine — runs on Supabase Edge Functions (Deno).
// Google-free by design: crawls pages itself and reads DuckDuckGo's public
// HTML result pages. No OAuth, no API keys, no Google account.
//
// Written as plain JS so the identical file can be exercised in Node for tests.

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

const json = (body, status = 200, extra = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...extra },
  });

/* Small in-isolate cache. Public sharing means repeat traffic; this keeps the
   crawler from re-fetching the same URL for every visitor. */
const CACHE = new Map();
const CACHE_TTL = { audit: 600000, site: 900000, serp: 300000, keywords: 900000, compare: 600000, links: 900000 };
const CACHE_MAX = 300;

function cacheGet(key) {
  const hit = CACHE.get(key);
  if (!hit) return null;
  if (hit.exp < Date.now()) { CACHE.delete(key); return null; }
  return hit.data;
}

function cacheSet(key, data, ttl) {
  if (CACHE.size >= CACHE_MAX) {
    const oldest = CACHE.keys().next().value;
    if (oldest) CACHE.delete(oldest);
  }
  CACHE.set(key, { exp: Date.now() + ttl, data });
}

async function fetchText(url, ms = 12000, opts = {}) {
  const started = Date.now();
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: ctrl.signal,
      headers: { 'User-Agent': UA, 'Accept-Language': 'en-IN,en;q=0.9', Accept: '*/*', ...(opts.headers || {}) },
    });
    const text = await res.text();
    return { ok: res.ok, status: res.status, url: res.url, text, ms: Date.now() - started, headers: res.headers };
  } catch (e) {
    return { ok: false, status: 0, url, text: '', ms: Date.now() - started, error: String(e && e.message ? e.message : e) };
  } finally {
    clearTimeout(t);
  }
}

const decodeEntities = (s) =>
  String(s || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)));

const stripTags = (s) => decodeEntities(String(s || '').replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();

const hostOf = (u) => {
  try {
    return new URL(u).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
};

function absolutise(href, base) {
  try {
    return new URL(decodeEntities(href), base).toString();
  } catch {
    return '';
  }
}

/* ------------------------------------------------------------------ */
/*  Page analysis                                                      */
/* ------------------------------------------------------------------ */

function analyseHtml(html, finalUrl) {
  const head = (html.match(/<head[^>]*>([\s\S]*?)<\/head>/i) || [])[1] || html;
  const body = html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ');

  const title = stripTags((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '');

  const meta = (name, attr = 'name') => {
    const re = new RegExp(`<meta[^>]+${attr}=["']${name}["'][^>]*content=["']([^"']*)["']`, 'i');
    const alt = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*${attr}=["']${name}["']`, 'i');
    return decodeEntities(((head.match(re) || head.match(alt) || [])[1] || '').trim());
  };

  const canonical = absolutise(((head.match(/<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']+)["']/i) || [])[1] || ''), finalUrl);
  const robotsMeta = meta('robots').toLowerCase();
  const lang = decodeEntities((html.match(/<html[^>]+lang=["']([^"']+)["']/i) || [])[1] || '');
  const viewport = meta('viewport');

  const h1s = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) => stripTags(m[1])).filter(Boolean);
  const h2s = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)].map((m) => stripTags(m[1])).filter(Boolean);

  const imgs = [...html.matchAll(/<img\b[^>]*>/gi)].map((m) => m[0]);
  const imgsNoAlt = imgs.filter((t) => !/\balt\s*=\s*["'][^"']+["']/i.test(t)).length;

  const anchors = [...html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)].map((m) => ({
    href: m[1],
    text: stripTags(m[2]),
  }));
  const base = finalUrl;
  const links = anchors
    .map((a) => ({ ...a, abs: absolutise(a.href, base) }))
    .filter((a) => a.abs && /^https?:/i.test(a.abs));
  const host = hostOf(base);
  const internal = links.filter((l) => hostOf(l.abs) === host);
  const external = links.filter((l) => hostOf(l.abs) !== host);
  const uniqueInternal = new Set(internal.map((l) => l.abs.split('#')[0]));

  const jsonLd = [...html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
  const schemaTypes = [];
  for (const block of jsonLd) {
    for (const m of block.matchAll(/"@type"\s*:\s*"([^"]+)"/g)) schemaTypes.push(m[1]);
  }

  const textOnly = stripTags(body);
  const words = textOnly ? textOnly.split(/\s+/).length : 0;

  return {
    title,
    titleLength: title.length,
    description: meta('description'),
    descriptionLength: meta('description').length,
    canonical,
    robotsMeta,
    lang,
    viewport,
    h1: h1s,
    h2Count: h2s.length,
    h2Sample: h2s.slice(0, 5),
    images: imgs.length,
    imagesNoAlt: imgsNoAlt,
    internalLinks: uniqueInternal.size,
    externalLinks: external.length,
    schemaTypes: [...new Set(schemaTypes)],
    jsonLdBlocks: jsonLd.length,
    words,
    ogTitle: meta('og:title', 'property'),
    ogImage: meta('og:image', 'property'),
    twitterCard: meta('twitter:card'),
  };
}

function buildFindings(page, ctx) {
  const f = [];
  const add = (id, title, category, severity, detail, fix) => f.push({ id, title, category, severity, detail, fix });

  if (!page.title) add('title-missing', 'Page has no title tag', 'On-page', 'critical', 'Google shows the URL or a guess instead of a title, which kills click-through.', 'Add a unique <title> of 50–60 characters with the primary keyword first.');
  else if (page.titleLength > 60) add('title-long', 'Title is longer than 60 characters', 'On-page', 'medium', `Your title is ${page.titleLength} characters, so it will be truncated in results.`, 'Rewrite to 50–60 characters and front-load the keyword.');
  else if (page.titleLength < 25) add('title-short', 'Title is very short', 'On-page', 'medium', `At ${page.titleLength} characters you are leaving room for a differentiator on the table.`, 'Expand to 50–60 characters with a benefit or qualifier.');

  if (!page.description) add('meta-missing', 'No meta description', 'On-page', 'high', 'The snippet is left to the search engine, which usually lowers CTR on commercial pages.', 'Add a 140–155 character description with a concrete benefit and a call to action.');
  else if (page.descriptionLength > 160) add('meta-long', 'Meta description is too long', 'On-page', 'low', `At ${page.descriptionLength} characters it will be cut off.`, 'Trim to 140–155 characters.');

  if (page.h1.length === 0) add('h1-missing', 'No H1 heading', 'On-page', 'high', 'The page gives no single topical heading for the crawler to anchor on.', 'Add one H1 that states what the page is about.');
  else if (page.h1.length > 1) add('h1-multi', `${page.h1.length} H1 headings`, 'On-page', 'medium', 'Multiple H1s dilute the topical signal.', 'Keep one H1 and demote the rest to H2.');

  if (!page.canonical) add('canonical-missing', 'No canonical tag', 'Indexation', 'medium', 'Parameterised or duplicate URLs can split ranking signals.', 'Add a self-referencing canonical link tag.');
  else if (hostOf(page.canonical) && ctx.finalHost && hostOf(page.canonical) !== ctx.finalHost) add('canonical-offsite', 'Canonical points to another domain', 'Indexation', 'high', `The canonical points at ${hostOf(page.canonical)}, so this page is telling search engines it is a duplicate.`, 'Point the canonical at this page, or remove it if it is a mistake.');

  if (page.robotsMeta.includes('noindex')) add('noindex', 'Page is marked noindex', 'Indexation', 'critical', 'This page cannot appear in results at all until the directive is removed.', 'Remove noindex from the meta robots tag.');

  if (!page.viewport) add('viewport-missing', 'No mobile viewport tag', 'Mobile', 'high', 'Mobile-first indexing fails without a viewport declaration.', 'Add <meta name="viewport" content="width=device-width, initial-scale=1">.');
  if (!page.lang) add('lang-missing', 'No lang attribute on <html>', 'Accessibility', 'low', 'Search engines and screen readers cannot tell the page language.', 'Add lang="en-IN" (or the correct locale) to the html tag.');

  if (page.images > 0 && page.imagesNoAlt / page.images > 0.3) add('alt-missing', `${page.imagesNoAlt} of ${page.images} images have no alt text`, 'Accessibility', 'low', 'You lose image search traffic and fail accessibility checks.', 'Describe each informative image in its alt attribute.');

  if (page.words < 300) add('thin', `Only ${page.words} words of content`, 'Content', 'high', 'Thin pages rarely rank and pull down site-wide quality signals.', 'Expand with unique, useful detail, or merge into a stronger page.');
  else if (page.words < 600) add('shallow', `${page.words} words of content`, 'Content', 'low', 'Slightly thin for a competitive commercial query.', 'Add a section that answers the obvious follow-up questions.');

  if (page.schemaTypes.length === 0) add('schema-missing', 'No structured data', 'Structured data', 'medium', 'No rich-result eligibility (product, FAQ, breadcrumb, article).', 'Add JSON-LD for the page type, validated in the Rich Results Test.');

  if (!page.ogTitle) add('og-missing', 'No Open Graph tags', 'Social', 'low', 'Shared links render without a title or image.', 'Add og:title, og:description and og:image.');

  if (!ctx.https) add('https', 'Page is not served over HTTPS', 'Security', 'critical', 'Browsers warn visitors and rankings are suppressed.', 'Install a TLS certificate and redirect all HTTP traffic.');
  if (ctx.status >= 400) add('status', `Page returns HTTP ${ctx.status}`, 'Crawlability', 'critical', 'A 4xx or 5xx page cannot be indexed.', 'Restore the page or redirect it to a live equivalent.');
  if (ctx.ms > 2500) add('slow', `Server responded in ${(ctx.ms / 1000).toFixed(1)}s`, 'Performance', 'high', 'Slow responses hurt Core Web Vitals and crawl budget.', 'Cache the HTML at the edge and cut upstream calls.');
  if (ctx.bytes > 500000) add('heavy', `HTML is ${Math.round(ctx.bytes / 1024)} KB`, 'Performance', 'medium', 'Large documents delay LCP on mobile.', 'Ship less markup; move data fetching to the client.');
  if (!ctx.sitemap) add('sitemap-missing', 'No sitemap.xml found', 'Crawlability', 'medium', 'Discovery of new pages depends on internal links alone.', 'Publish /sitemap.xml and reference it from robots.txt.');
  if (ctx.robotsBlocking) add('robots-block', 'robots.txt disallows everything', 'Crawlability', 'critical', 'A blanket Disallow stops the whole site being crawled.', 'Remove the wildcard Disallow in production.');

  return f;
}

const SEVERITY_WEIGHT = { critical: 14, high: 7, medium: 3, low: 1 };

function scoreOf(findings) {
  const penalty = findings.reduce((s, f) => s + (SEVERITY_WEIGHT[f.severity] || 0), 0);
  return Math.max(20, Math.min(100, Math.round(100 - penalty * 0.9)));
}

/* ------------------------------------------------------------------ */
/*  SERP via DuckDuckGo HTML                                           */
/* ------------------------------------------------------------------ */

function parseSerp(html, limit = 20) {
  const out = [];
  const chunks = html.split('<div class="result results_links');
  for (const chunk of chunks.slice(1)) {
    if (!chunk.includes('web-result') || chunk.includes('result--ad')) continue;
    const hrefRaw = (chunk.match(/class="result__a"\s+href="([^"]+)"/) || [])[1] || '';
    let href = decodeEntities(hrefRaw);
    if (href.startsWith('//duckduckgo.com/l/?uddg=')) {
      try {
        const u = new URL('https:' + href);
        href = decodeURIComponent(u.searchParams.get('uddg') || '');
      } catch {
        href = '';
      }
    }
    if (!/^https?:/i.test(href)) continue;
    const title = stripTags((chunk.match(/class="result__a"[^>]*>([\s\S]*?)<\/a>/) || [])[1] || '');
    const snippet = stripTags((chunk.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/) || [])[1] || '');
    const display = stripTags((chunk.match(/class="result__url"[^>]*>([\s\S]*?)<\/a>/) || [])[1] || '');
    if (!title) continue;
    out.push({ position: out.length + 1, title, url: href, domain: hostOf(href), snippet, display });
    if (out.length >= limit) break;
  }
  return out;
}

function parseLite(html, limit = 20) {
  const out = [];
  const rows = [...html.matchAll(/<a[^>]+class=['"]result-link['"][^>]*href=['"]([^'"]+)['"][^>]*>([\s\S]*?)<\/a>/gi)];
  for (const m of rows) {
    let href = decodeEntities(m[1]);
    if (href.startsWith('//duckduckgo.com/l/?uddg=')) {
      try {
        href = decodeURIComponent(new URL('https:' + href).searchParams.get('uddg') || '');
      } catch { href = ''; }
    }
    if (!/^https?:/i.test(href)) continue;
    out.push({ position: out.length + 1, title: stripTags(m[2]), url: href, domain: hostOf(href), snippet: '', display: hostOf(href) });
    if (out.length >= limit) break;
  }
  return out;
}

function parseBing(html, limit = 20) {
  const out = [];
  for (const chunk of html.split('<li class="b_algo"').slice(1)) {
    const href = decodeEntities((chunk.match(/<h2[^>]*>\s*<a[^>]+href="([^"]+)"/i) || [])[1] || '');
    if (!/^https?:/i.test(href)) continue;
    const title = stripTags((chunk.match(/<h2[^>]*>\s*<a[^>]*>([\s\S]*?)<\/a>/i) || [])[1] || '');
    const snippet = stripTags((chunk.match(/<p[^>]*>([\s\S]*?)<\/p>/i) || [])[1] || '');
    if (!title) continue;
    out.push({ position: out.length + 1, title, url: href, domain: hostOf(href), snippet, display: hostOf(href) });
    if (out.length >= limit) break;
  }
  return out;
}

async function serpFromSerpApi(query, region, key) {
  const gl = (region.split('-')[1] || 'in').toLowerCase();
  const u = `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(query)}&gl=${gl}&num=20&api_key=${encodeURIComponent(key)}`;
  const r = await fetchText(u, 20000);
  if (!r.ok) return [];
  try {
    const data = JSON.parse(r.text);
    return (data.organic_results || []).map((x, i) => ({
      position: i + 1, title: x.title || '', url: x.link || '', domain: hostOf(x.link || ''), snippet: x.snippet || '', display: x.displayed_link || hostOf(x.link || ''),
    }));
  } catch { return []; }
}

async function serp(query, region = 'in-en') {
  const providers = [];
  const key = typeof Deno !== 'undefined' && Deno.env ? Deno.env.get('SERPAPI_KEY') : undefined;

  if (key) providers.push(['serpapi', async () => serpFromSerpApi(query, region, key)]);
  // Bing first: it is the most reliable keyless source from data-centre IPs.
  providers.push(['bing', async () => {
    const r = await fetchText(`https://www.bing.com/search?q=${encodeURIComponent(query)}&count=20&setlang=en`, 15000);
    return r.text ? parseBing(r.text, 20) : [];
  }]);
  providers.push(['duckduckgo-html', async () => {
    const r = await fetchText(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}&kl=${encodeURIComponent(region)}`, 15000);
    return r.text ? parseSerp(r.text, 20) : [];
  }]);
  providers.push(['duckduckgo-lite', async () => {
    const r = await fetchText(`https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(query)}&kl=${encodeURIComponent(region)}`, 15000);
    return r.text ? parseLite(r.text, 20) : [];
  }]);

  const tried = [];
  for (const [name, fn] of providers) {
    try {
      const results = await fn();
      tried.push(`${name}:${results.length}`);
      if (results.length) {
        return { ok: true, query, region, provider: name, tried, results, fetchedAt: new Date().toISOString() };
      }
    } catch (e) {
      tried.push(`${name}:err`);
    }
  }
  return {
    ok: false,
    query,
    region,
    provider: null,
    tried,
    results: [],
    error: 'No search provider returned results. Free keyless search is rate-limited from data-centre IPs. Add a SerpAPI key (SERPAPI_KEY) to make rank checks reliable.',
    fetchedAt: new Date().toISOString(),
  };
}

/* ------------------------------------------------------------------ */
/*  Actions                                                            */
/* ------------------------------------------------------------------ */

function normaliseUrl(input) {
  let u = String(input || '').trim();
  if (!u) throw new Error('url required');
  if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
  return u;
}

async function runAudit(rawUrl) {
  const start = normaliseUrl(rawUrl);
  const page = await fetchText(start, 15000);
  if (!page.text) {
    return { ok: false, url: start, error: page.error || `No response (HTTP ${page.status})` };
  }

  const finalUrl = page.url || start;
  const origin = (() => {
    try {
      return new URL(finalUrl).origin;
    } catch {
      return '';
    }
  })();

  const parsed = analyseHtml(page.text, finalUrl);

  const [robotsRes, sitemapRes] = await Promise.all([
    fetchText(origin + '/robots.txt', 8000),
    fetchText(origin + '/sitemap.xml', 8000),
  ]);
  const robots = robotsRes.ok ? robotsRes.text : '';
  const robotsBlocking = /user-agent:\s*\*[\s\S]{0,120}?disallow:\s*\/\s*(\n|$)/i.test(robots);
  const sitemapLocs = sitemapRes.ok ? [...sitemapRes.text.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map((m) => m[1]) : [];
  const robotsSitemap = (robots.match(/sitemap:\s*(\S+)/i) || [])[1] || '';

  const ctx = {
    status: page.status,
    ms: page.ms,
    bytes: new TextEncoder().encode(page.text).length,
    https: finalUrl.startsWith('https://'),
    finalHost: hostOf(finalUrl),
    sitemap: sitemapRes.ok && sitemapLocs.length > 0,
    robotsBlocking,
  };

  const findings = buildFindings(parsed, ctx);
  const score = scoreOf(findings);

  return {
    ok: true,
    url: start,
    finalUrl,
    status: page.status,
    score,
    crawledAt: new Date().toISOString(),
    stats: {
      responseMs: page.ms,
      htmlKb: Math.round(ctx.bytes / 1024),
      words: parsed.words,
      images: parsed.images,
      imagesNoAlt: parsed.imagesNoAlt,
      internalLinks: parsed.internalLinks,
      externalLinks: parsed.externalLinks,
      h1Count: parsed.h1.length,
      h2Count: parsed.h2Count,
      schemaTypes: parsed.schemaTypes,
      sitemapUrls: sitemapLocs.length,
      robotsSitemap,
      robotsFound: robotsRes.ok,
    },
    page: parsed,
    findings,
    counts: {
      critical: findings.filter((f) => f.severity === 'critical').length,
      high: findings.filter((f) => f.severity === 'high').length,
      medium: findings.filter((f) => f.severity === 'medium').length,
      low: findings.filter((f) => f.severity === 'low').length,
    },
  };
}

async function runSerp(query, region, domain) {
  const s = await serp(query, region);
  if (!s.ok) return { ...s, error: s.error || 'No results returned. DuckDuckGo may be rate-limiting.' };
  if (domain) {
    const d = hostOf(domain.includes('://') ? domain : 'https://' + domain);
    const hit = s.results.find((r) => r.domain === d || r.domain.endsWith('.' + d));
    s.yourRank = hit ? hit.position : null;
    s.yourDomain = d;
  }
  return s;
}

const BIG_DOMAINS = [
  'amazon', 'flipkart', 'walmart', 'ebay', 'etsy', 'myntra', 'nykaa', 'wikipedia', 'youtube', 'reddit',
  'quora', 'medium', 'linkedin', 'facebook', 'instagram', 'pinterest', 'quora', 'indiamart', 'alibaba',
  'shopify', 'forbes', 'nytimes', 'theguardian', 'bbc', 'cnn', 'hubspot', 'semrush', 'ahrefs', 'moz',
  'healthline', 'webmd', 'indeed', 'glassdoor', 'tripadvisor', 'booking', 'makemytrip', 'zomato',
];

function competitionOf(results) {
  if (!results.length) return 0;
  const big = results.filter((r) => BIG_DOMAINS.some((b) => r.domain.includes(b))).length;
  return Math.round((big / results.length) * 100);
}

async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  const workers = new Array(Math.min(limit, items.length)).fill(0).map(async () => {
    while (i < items.length) {
      const idx = i++;
      try {
        out[idx] = await fn(items[idx], idx);
      } catch (e) {
        out[idx] = { error: String(e) };
      }
    }
  });
  await Promise.all(workers);
  return out;
}

async function runKeywords(seed, region) {
  const base = String(seed || '').trim().toLowerCase();
  if (!base) return { ok: false, error: 'seed required' };

  const mods = ['', ' online', ' india', ' price', ' buy', ' best', ' near me', ' reviews'];
  const questions = [`best ${base}`, `how to choose ${base}`, `is ${base} worth it`, `${base} vs alternatives`];
  const candidates = [...new Set([...mods.map((m) => (m ? base + m : base)), ...questions])].slice(0, 12);

  const checked = await mapLimit(candidates, 4, async (kw) => {
    const s = await serp(kw, region);
    const results = s.results || [];
    return {
      keyword: kw,
      results: results.length,
      competition: competitionOf(results),
      topDomains: results.slice(0, 3).map((r) => r.domain),
      hasResults: results.length > 0,
    };
  });

  const rows = checked.filter((c) => c && c.hasResults);
  rows.sort((a, b) => b.results - a.results || a.competition - b.competition);

  return {
    ok: rows.length > 0,
    seed: base,
    region,
    note: 'Verified against live search results. No search-volume estimates — those come from paid keyword databases, not Google.',
    ideas: rows.map((r, i) => ({ rank: i + 1, ...r })),
    checkedAt: new Date().toISOString(),
  };
}

/* ---- whole-site crawl from sitemap ---- */

async function collectSitemapUrls(origin, limit = 25) {
  const found = [];
  const seen = new Set();

  const readSitemap = async (smUrl, depth = 0) => {
    if (depth > 2 || found.length >= limit) return;
    const r = await fetchText(smUrl, 12000);
    if (!r.ok || !r.text) return;
    const isIndex = /<sitemapindex/i.test(r.text);
    const locs = [...r.text.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map((m) => decodeEntities(m[1].trim()));
    if (isIndex) {
      for (const child of locs.slice(0, 3)) await readSitemap(child, depth + 1);
    } else {
      for (const loc of locs) {
        if (found.length >= limit) break;
        if (!seen.has(loc)) { seen.add(loc); found.push(loc); }
      }
    }
  };

  await readSitemap(origin + '/sitemap.xml');
  if (!found.length) {
    const robots = await fetchText(origin + '/robots.txt', 8000);
    const sm = robots.ok ? (robots.text.match(/sitemap:\s*(\S+)/i) || [])[1] : '';
    if (sm) await readSitemap(sm.trim());
  }
  return found;
}

async function runSite(rawUrl, maxPages = 12) {
  const start = normaliseUrl(rawUrl);
  const origin = (() => { try { return new URL(start).origin; } catch { return ''; } })();
  if (!origin) return { ok: false, error: 'invalid url' };

  const home = await fetchText(origin, 15000);
  if (!home.text) return { ok: false, error: home.error || `No response from ${origin}` };

  const urls = await collectSitemapUrls(origin, maxPages);
  let targets;
  if (urls.length) {
    targets = urls.slice(0, maxPages);
  } else {
    // no sitemap: walk the homepage's internal links one level deep
    const homeUrl = home.url || origin;
    const anchors = [...home.text.matchAll(/<a\b[^>]*href=["']([^"']+)["']/gi)]
      .map((m) => absolutise(m[1], homeUrl))
      .filter((u) => u && !/\.(jpg|jpeg|png|gif|svg|webp|pdf|zip|mp4|css|js)$/i.test(u));
    const sameOrigin = [...new Set(anchors.filter((u) => {
      try { return new URL(u).origin === origin; } catch { return false; }
    }))].filter((u) => u.split('#')[0] !== homeUrl.split('#')[0]);
    targets = [homeUrl, ...sameOrigin].slice(0, maxPages);
  }

  const pages = await mapLimit(targets, 4, async (u) => {
    const r = await fetchText(u, 15000);
    if (!r.text) return { url: u, ok: false, status: r.status, error: r.error || 'no response' };
    const p = analyseHtml(r.text, r.url || u);
    const findings = buildFindings(p, {
      status: r.status, ms: r.ms, bytes: new TextEncoder().encode(r.text).length,
      https: (r.url || u).startsWith('https://'), finalHost: hostOf(r.url || u), sitemap: true, robotsBlocking: false,
    });
    return {
      url: u, ok: true, status: r.status, ms: r.ms,
      score: scoreOf(findings), title: p.title, words: p.words, h1: p.h1[0] || '',
      images: p.images, imagesNoAlt: p.imagesNoAlt, internalLinks: p.internalLinks,
      schemaTypes: p.schemaTypes, issueCount: findings.length,
      severity: {
        critical: findings.filter((f) => f.severity === 'critical').length,
        high: findings.filter((f) => f.severity === 'high').length,
      },
      issueIds: findings.map((f) => f.id),
    };
  });

  const good = pages.filter((p) => p && p.ok);
  const agg = new Map();
  for (const p of good) {
    for (const id of p.issueIds) agg.set(id, (agg.get(id) || 0) + 1);
  }
  const homePage = analyseHtml(home.text, home.url || origin);
  const homeFindings = buildFindings(homePage, {
    status: home.status, ms: home.ms, bytes: new TextEncoder().encode(home.text).length,
    https: (home.url || origin).startsWith('https://'), finalHost: hostOf(home.url || origin), sitemap: urls.length > 0, robotsBlocking: false,
  });
  const allFindings = [...homeFindings];
  for (const p of good) if (p.url !== (home.url || origin) && p.issueIds) { /* ids only */ }

  const siteScore = good.length ? Math.round(good.reduce((s, p) => s + p.score, 0) / good.length) : scoreOf(homeFindings);

  return {
    ok: true,
    origin,
    crawledAt: new Date().toISOString(),
    sitemapUrls: urls.length,
    crawled: good.length,
    requested: targets.length,
    siteScore,
    pages: good.sort((a, b) => a.score - b.score),
    failures: pages.filter((p) => !p || !p.ok).slice(0, 5),
    issues: [...agg.entries()].map(([id, count]) => ({ id, count })).sort((a, b) => b.count - a.count),
    home: { findings: homeFindings, page: homePage },
  };
}

/* ---- compare domains ---- */

async function runCompare(urls) {
  const list = (Array.isArray(urls) ? urls : []).filter(Boolean).slice(0, 4).map(normaliseUrl);
  if (list.length < 2) return { ok: false, error: 'provide at least two urls' };

  const rows = await mapLimit(list, 3, async (u) => {
    const r = await fetchText(u, 15000);
    if (!r.text) return { url: u, ok: false, error: r.error || 'no response' };
    const p = analyseHtml(r.text, r.url || u);
    const findings = buildFindings(p, {
      status: r.status, ms: r.ms, bytes: new TextEncoder().encode(r.text).length,
      https: (r.url || u).startsWith('https://'), finalHost: hostOf(r.url || u), sitemap: true, robotsBlocking: false,
    });
    const h2 = [...new Set((r.text.match(/<h2[^>]*>([\s\S]*?)<\/h2>/gi) || []).map((x) => stripTags(x).toLowerCase()).filter((x) => x.length > 3 && x.length < 90))];
    return {
      url: u, ok: true, domain: hostOf(r.url || u), status: r.status, ms: r.ms,
      score: scoreOf(findings), words: p.words, title: p.title, h1: p.h1[0] || '',
      h2Count: p.h2Count, h2, schemaTypes: p.schemaTypes, images: p.images, imagesNoAlt: p.imagesNoAlt,
      internalLinks: p.internalLinks, externalLinks: p.externalLinks, findings: findings.length,
    };
  });

  const good = rows.filter((r) => r && r.ok);
  const mine = good[0];
  const rivals = good.slice(1);
  const mineTopics = new Set(mine ? mine.h2 : []);
  const gaps = new Map();
  for (const r of rivals) for (const t of r.h2) if (!mineTopics.has(t)) gaps.set(t, (gaps.get(t) || 0) + 1);

  return {
    ok: good.length >= 2,
    comparedAt: new Date().toISOString(),
    rows,
    gaps: [...gaps.entries()].map(([topic, count]) => ({ topic, rivals: count })).sort((a, b) => b.rivals - a.rivals).slice(0, 15),
  };
}

async function runLinks(rawUrl, limit = 20) {
  const start = normaliseUrl(rawUrl);
  const page = await fetchText(start, 15000);
  if (!page.text) return { ok: false, error: page.error || 'no response' };
  const finalUrl = page.url || start;
  const anchors = [...page.text.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)].map((m) => ({
    href: absolutise(m[1], finalUrl),
    text: stripTags(m[2]).slice(0, 80),
  }));
  const uniq = [...new Map(anchors.filter((a) => a.href).map((a) => [a.href.split('#')[0], a])).values()].slice(0, limit);

  const checked = await mapLimit(uniq, 6, async (a) => {
    const r = await fetchText(a.href, 9000, { headers: { Range: 'bytes=0-2048' } });
    return { url: a.href, text: a.text, status: r.status, ok: r.ok, ms: r.ms };
  });

  const broken = checked.filter((c) => c && !c.ok);
  return {
    ok: true,
    url: finalUrl,
    checked: checked.length,
    brokenCount: broken.length,
    links: checked,
    checkedAt: new Date().toISOString(),
  };
}

/* ------------------------------------------------------------------ */
/*  Router                                                             */
/* ------------------------------------------------------------------ */

export async function handler(req) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  let body = {};
  try {
    body = req.method === 'POST' ? await req.json() : {};
  } catch {
    body = {};
  }
  const url = new URL(req.url);
  const action = body.action || url.searchParams.get('action') || 'health';
  const region = body.region || url.searchParams.get('region') || 'in-en';

  if (action === 'health') {
    return json({ ok: true, service: 'seosprint', engine: 'google-free', cached: CACHE.size, time: new Date().toISOString() });
  }

  const cacheKey = `${action}:${JSON.stringify(body)}`;
  const cached = cacheGet(cacheKey);
  if (cached) return json(cached, 200, { 'X-SeoSprint-Cache': 'hit' });

  try {
    let result;
    switch (action) {
      case 'audit':
        result = await runAudit(body.url || url.searchParams.get('url'));
        break;
      case 'serp':
        result = await runSerp(body.q || url.searchParams.get('q'), region, body.domain);
        break;
      case 'keywords':
        result = await runKeywords(body.seed || url.searchParams.get('seed'), region);
        break;
      case 'links':
        result = await runLinks(body.url || url.searchParams.get('url'), Number(body.limit) || 20);
        break;
      case 'site':
        result = await runSite(body.url || url.searchParams.get('url'), Number(body.maxPages) || 12);
        break;
      case 'compare':
        result = await runCompare(body.urls);
        break;
      default:
        return json({ ok: false, error: `Unknown action: ${action}` }, 400);
    }

    if (result && result.ok) {
      cacheSet(cacheKey, result, CACHE_TTL[action] || 300000);
    }
    return json(result, 200, { 'X-SeoSprint-Cache': 'miss' });
  } catch (e) {
    return json({ ok: false, error: String(e && e.message ? e.message : e) }, 500);
  }
}

if (typeof Deno !== 'undefined' && typeof Deno.serve === 'function') {
  Deno.serve(handler);
}

export default handler;

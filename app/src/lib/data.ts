/* SeoSprint demo data engine.
   Deterministic (seeded) so every screen is stable across reloads.
   When a real GSC/GA4/Ads OAuth token is present the same shapes are
   populated from the live APIs instead — see lib/connectors.ts. */

export type Project = { id: string; name: string; domain: string; country: string; flag: string; vertical: string };

export const projects: Project[] = [
  { id: 'urbanleaf', name: 'Urban Leaf', domain: 'urbanleaf.in', country: 'India', flag: '🇮🇳', vertical: 'Home & living · D2C' },
  { id: 'acme', name: 'Acme Cloud', domain: 'acme.io', country: 'United States', flag: '🇺🇸', vertical: 'B2B SaaS' },
  { id: 'finflow', name: 'FinFlow', domain: 'finflow.app', country: 'India', flag: '🇮🇳', vertical: 'Fintech' },
];

export const DEFAULT_PROJECT = 'urbanleaf';

/* ---------- deterministic rng ---------- */
function mulberry32(a: number) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = <T,>(r: () => number, arr: T[]) => arr[Math.floor(r() * arr.length)];
const round = (n: number, d = 0) => { const p = Math.pow(10, d); return Math.round(n * p) / p; };

/* ---------- date helpers ---------- */
export const TODAY = new Date('2026-11-02T00:00:00Z');
export function dayISO(offset: number) {
  const d = new Date(TODAY); d.setUTCDate(d.getUTCDate() - offset);
  return d.toISOString().slice(0, 10);
}

/* ---------- CTR curve ---------- */
export function ctrFor(pos: number) {
  if (pos <= 0) return 0;
  return Math.min(0.34, Math.max(0.0012, 0.30 * Math.exp(-0.35 * (pos - 1))));
}

/* ---------- daily series (120 days) ---------- */
export type DayPoint = {
  date: string; clicks: number; impressions: number; sessions: number; users: number;
  conversions: number; revenue: number; adsCost: number; adsClicks: number; adsConversions: number;
  newUsers: number; engagedSessions: number;
};

export function buildSeries(projectId: string, days = 120): DayPoint[] {
  const r = mulberry32(projectId.length * 7919 + 42);
  const scale = projectId === 'acme' ? 0.62 : projectId === 'finflow' ? 0.44 : 1;
  const out: DayPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const t = (days - 1 - i) / (days - 1);
    const dow = new Date(dayISO(i)).getUTCDay();
    const weekend = dow === 0 || dow === 6 ? 0.82 : 1;
    // a soft core-update dip ~46 days ago, recovered since
    const dip = i > 38 && i < 52 ? 0.86 : 1;
    const growth = 0.86 + 0.30 * t;
    const noise = 0.93 + r() * 0.14;
    const impressions = Math.round(148000 * scale * growth * weekend * dip * noise);
    const ctr = 0.031 + r() * 0.006 + (i < 30 ? 0.0022 : 0);
    const clicks = Math.round(impressions * ctr);
    const sessions = Math.round(clicks * (0.88 + r() * 0.1) + 1400 * scale * weekend * (0.9 + r() * 0.2));
    const users = Math.round(sessions * (0.82 + r() * 0.05));
    const convRate = 0.028 + r() * 0.008;
    const conversions = Math.round(sessions * convRate);
    const aov = projectId === 'acme' ? 4200 : projectId === 'finflow' ? 780 : 1850;
    const revenue = Math.round(conversions * aov * (0.92 + r() * 0.16));
    const adsClicks = Math.round(2400 * scale * weekend * (0.92 + r() * 0.16));
    const adsCost = Math.round(adsClicks * (14.5 + r() * 4.5));
    const adsConversions = Math.round(adsClicks * (0.031 + r() * 0.012));
    out.push({
      date: dayISO(i), clicks, impressions, sessions, users, conversions, revenue,
      adsCost, adsClicks, adsConversions,
      newUsers: Math.round(users * (0.38 + r() * 0.08)),
      engagedSessions: Math.round(sessions * (0.61 + r() * 0.08)),
    });
  }
  return out;
}

/* ---------- keyword generation ---------- */
const CORES: Record<string, string[]> = {
  urbanleaf: ['indoor planters', 'ceramic plant pots', 'hanging planters', 'plant stands', 'balcony decor',
    'terracotta pots', 'self watering pots', 'wall planters', 'garden accessories', 'decorative planters',
    'planter pots online', 'outdoor planters', 'metal planters', 'floor planters'],
  acme: ['cloud cost management', 'kubernetes monitoring', 'observability platform', 'devops analytics',
    'infrastructure monitoring', 'log management tool', 'application performance monitoring',
    'cloud security posture', 'ci cd pipeline', 'incident management software', 'sre tooling', 'api monitoring'],
  finflow: ['upi payment gateway', 'recurring payments api', 'invoice software india', 'gst billing software',
    'expense management app', 'virtual cards for business', 'payment links', 'subscription billing',
    'accounting software small business', 'payroll software india', 'neobank for startups', 'lending api'],
};
const MODS = ['', ' online', ' india', ' buy', ' for balcony', ' set of 3', ' large', ' best', ' near me',
  ' amazon', ' price', ' wholesale', ' modern', ' ceramic', ' premium', ' set of 5', ' small', ' with stand'];
const QUESTIONS = ['best %s', 'how to choose %s', 'are %s good for indoor plants', 'cheapest %s online',
  'which %s are best for balcony', '%s vs plastic pots', 'how to hang %s', 'do %s need drainage'];

const URL_SLUGS = ['/collections/%s', '/products/%s', '/blog/%s', '/guides/%s', '/pages/%s'];
const slug = (s: string) => s.replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

export type QueryRow = {
  keyword: string; url: string; clicks: number; impressions: number; ctr: number; position: number;
  prevClicks: number; prevPosition: number; country: string; device: string; intent: string;
};

export function buildQueries(projectId: string): QueryRow[] {
  const r = mulberry32(projectId.length * 104729 + 7);
  const cores = CORES[projectId] || CORES.urbanleaf;
  const rows: QueryRow[] = [];
  const countries = projectId === 'acme'
    ? ['United States', 'United Kingdom', 'Germany', 'Canada', 'India', 'Australia']
    : ['India', 'United States', 'United Arab Emirates', 'United Kingdom', 'Singapore', 'Canada'];
  const devices = ['Desktop', 'Mobile', 'Tablet'];
  const intents = ['Commercial', 'Transactional', 'Informational', 'Navigational'];

  const add = (kw: string, intent: string, weight: number) => {
    const impressions = Math.round((900 + r() * 52000) * weight);
    // position distribution: head terms rank better
    const roll = r();
    let position = roll < 0.13 ? 1 + r() * 2.6
      : roll < 0.55 ? 4 + r() * 11
      : roll < 0.82 ? 15 + r() * 15
      : 30 + r() * 40;
    position = round(position, 1);
    const ctr = round(Math.min(0.36, ctrFor(position) * (0.72 + r() * 0.62)), 4);
    const clicks = Math.round(impressions * ctr);
    const prevPosition = round(Math.max(1, position + (r() - 0.45) * 6), 1);
    const prevClicks = Math.round(impressions * ctrFor(prevPosition) * (0.9 + r() * 0.12));
    rows.push({
      keyword: kw, url: pick(r, URL_SLUGS).replace('%s', slug(kw.split(' ').slice(0, 3).join(' '))),
      clicks, impressions, ctr, position, prevClicks, prevPosition,
      country: pick(r, countries), device: pick(r, devices), intent,
    });
  };

  cores.forEach((core, i) => {
    add(core, 'Commercial', 1.9);
    MODS.forEach((m) => {
      if (!m) return;
      add(core + m, m.includes('buy') || m.includes('price') || m.includes('amazon') ? 'Transactional' : 'Commercial', 0.55 + r() * 0.6);
    });
    QUESTIONS.forEach((q) => add(q.replace('%s', core), 'Informational', 0.35 + r() * 0.4));
  });
  // a handful of brand + head terms
  add(`${cores[0].split(' ')[0]} store`, 'Navigational', 2.4);
  add(`best ${cores[1]} 2026`, 'Commercial', 1.6);
  add(`${cores[2]} india`, 'Commercial', 1.35);
  return rows.sort((a, b) => b.clicks - a.clicks);
}

/* ---------- pages ---------- */
export type PageRow = { url: string; clicks: number; impressions: number; ctr: number; position: number; sessions: number; conversions: number; revenue: number; prevClicks: number; type: string };

export function buildPages(projectId: string, queries: QueryRow[]): PageRow[] {
  const r = mulberry32(projectId.length * 31337 + 3);
  const map = new Map<string, PageRow>();
  queries.forEach((q) => {
    const p = map.get(q.url) || { url: q.url, clicks: 0, impressions: 0, ctr: 0, position: 0, sessions: 0, conversions: 0, revenue: 0, prevClicks: 0, type: q.url.split('/')[1] || 'page' };
    p.clicks += q.clicks; p.impressions += q.impressions; p.prevClicks += q.prevClicks;
    p.position += q.position * q.impressions; map.set(q.url, p);
  });
  const rows = [...map.values()].map((p) => {
    p.ctr = round(p.clicks / Math.max(1, p.impressions), 4);
    p.position = round(p.position / Math.max(1, p.impressions), 1);
    p.sessions = Math.round(p.clicks * (0.86 + r() * 0.2));
    p.conversions = Math.round(p.sessions * (0.021 + r() * 0.02));
    p.revenue = Math.round(p.conversions * (1400 + r() * 900));
    return p;
  });
  return rows.sort((a, b) => b.clicks - a.clicks);
}

/* ---------- GA4 ---------- */
export type Channel = { channel: string; sessions: number; users: number; conversions: number; revenue: number; engagement: number; color: string };

export function buildChannels(projectId: string): Channel[] {
  const r = mulberry32(projectId.length * 2654435761 + 11);
  const base = [
    ['Organic Search', 0.41, '#34d399'], ['Paid Search', 0.19, '#6d5efc'], ['Direct', 0.16, '#22d3ee'],
    ['Organic Social', 0.09, '#fbbf24'], ['Referral', 0.07, '#a78bfa'], ['Email', 0.05, '#fb7185'], ['Display', 0.03, '#60a5fa'],
  ] as [string, number, string][];
  const total = 248000;
  return base.map(([channel, share, color]) => {
    const sessions = Math.round(total * share * (0.92 + r() * 0.16));
    const users = Math.round(sessions * (0.8 + r() * 0.06));
    const conversions = Math.round(sessions * (channel === 'Email' ? 0.052 : channel === 'Paid Search' ? 0.036 : 0.024) * (0.85 + r() * 0.3));
    return { channel, sessions, users, conversions, revenue: Math.round(conversions * (1600 + r() * 700)), engagement: round(0.52 + r() * 0.32, 3), color };
  }).sort((a, b) => b.sessions - a.sessions);
}

/* ---------- Google Ads ---------- */
export type Campaign = {
  name: string; type: string; status: string; budget: number; impressions: number; clicks: number;
  cost: number; conversions: number; convValue: number; ctr: number; cpc: number; roas: number;
};

export function buildCampaigns(projectId: string): Campaign[] {
  const r = mulberry32(projectId.length * 40503 + 5);
  const defs: [string, string, string][] = projectId === 'acme' ? [
    ['Brand — Exact', 'Search', 'Enabled'], ['Competitor Conquest', 'Search', 'Enabled'],
    ['Observability — High intent', 'Search', 'Enabled'], ['Retargeting — Demo request', 'Display', 'Enabled'],
    ['Performance Max — Global', 'Performance Max', 'Enabled'], ['Docs traffic', 'Search', 'Paused'],
  ] : projectId === 'finflow' ? [
    ['Brand — Exact', 'Search', 'Enabled'], ['Payments API — Intent', 'Search', 'Enabled'],
    ['GST Billing — India', 'Search', 'Enabled'], ['Startup Neobank', 'Performance Max', 'Enabled'],
    ['Retargeting — Signup drop', 'Display', 'Enabled'], ['Competitor — Razorpay', 'Search', 'Paused'],
  ] : [
    ['Brand — Exact', 'Search', 'Enabled'], ['Planters — Shopping', 'Shopping', 'Enabled'],
    ['Balcony decor — Search', 'Search', 'Enabled'], ['Performance Max — India', 'Performance Max', 'Enabled'],
    ['Retargeting — Cart abandon', 'Display', 'Enabled'], ['Festive — Diwali', 'Search', 'Paused'],
  ];
  return defs.map(([name, type, status]) => {
    const clicks = Math.round((type === 'Performance Max' ? 9200 : type === 'Display' ? 14000 : 3400) * (0.7 + r() * 0.7) * (status === 'Paused' ? 0.25 : 1));
    const impressions = Math.round(clicks * (type === 'Display' ? 90 : type === 'Performance Max' ? 55 : 26) * (0.8 + r() * 0.4));
    const cpc = round((type === 'Display' ? 6.2 : 16.5) * (0.7 + r() * 0.7), 2);
    const cost = Math.round(clicks * cpc);
    const conversions = Math.round(clicks * (0.028 + r() * 0.022));
    const convValue = Math.round(conversions * (1700 + r() * 1100));
    return {
      name, type, status, budget: Math.round((cost / 30) * 1.2), impressions, clicks, cost, conversions, convValue,
      ctr: round(clicks / impressions, 4), cpc, roas: round(convValue / Math.max(1, cost), 2),
    };
  });
}

/* ---------- keyword ideas ---------- */
export type KeywordIdea = { keyword: string; volume: number; difficulty: number; cpc: number; intent: string; trend: number; cluster: string; parent: string };

export function buildKeywordIdeas(projectId: string): KeywordIdea[] {
  const r = mulberry32(projectId.length * 15485863 + 13);
  const cores = CORES[projectId] || CORES.urbanleaf;
  const out: KeywordIdea[] = [];
  const clusters = ['Buying intent', 'Comparison', 'How-to', 'Local', 'Brand'];
  cores.forEach((core) => {
    const cluster = pick(r, clusters);
    MODS.concat(QUESTIONS.map((q) => q.replace('%s', core))).forEach((m) => {
      const kw = m ? (m.includes('%s') ? m : core + m) : core;
      const volume = Math.round((60 + Math.pow(r(), 2.4) * 14000));
      out.push({
        keyword: kw, volume, difficulty: Math.round(4 + r() * 88), cpc: round(4 + r() * 58, 2),
        intent: m.includes('how') || m.includes('which') || m.includes('are') ? 'Informational' : m.includes('buy') || m.includes('price') || m.includes('cheapest') ? 'Transactional' : 'Commercial',
        trend: round(-40 + r() * 110, 1), cluster, parent: core,
      });
    });
  });
  return out.sort((a, b) => b.volume - a.volume).slice(0, 180);
}

/* ---------- rank tracking ---------- */
export type RankRow = { keyword: string; url: string; device: string; location: string; latest: number; best: number; prev: number; history: number[]; volume: number };

export function buildRanks(projectId: string, queries: QueryRow[]): RankRow[] {
  const r = mulberry32(projectId.length * 99991 + 17);
  return queries.slice(0, 64).map((q) => {
    const start = Math.max(1, q.position + (r() - 0.4) * 8);
    const history: number[] = [];
    let p = start;
    for (let i = 0; i < 30; i++) {
      p = Math.max(1, p + (r() - 0.52) * 1.6 + (q.position < start ? -0.25 : 0.05));
      history.push(round(p, 0));
    }
    return {
      keyword: q.keyword, url: q.url, device: q.device, location: q.country,
      latest: history[history.length - 1], best: Math.min(...history), prev: history[history.length - 8],
      history, volume: q.impressions,
    };
  });
}

/* ---------- audit ---------- */
export type Finding = { id: string; title: string; category: string; severity: 'critical' | 'high' | 'medium' | 'low'; affected: number; sample: string[]; why: string; fix: string };

export function buildFindings(projectId: string): Finding[] {
  const r = mulberry32(projectId.length * 65537 + 23);
  const base: Omit<Finding, 'affected' | 'sample'>[] = [
    { id: 'title-long', title: 'Title tags over 60 characters', category: 'On-page', severity: 'high', why: 'Long titles are truncated in results, cutting the words that earn the click.', fix: 'Rewrite to 50–60 characters with the primary keyword first.' },
    { id: 'meta-missing', title: 'Missing meta description', category: 'On-page', severity: 'medium', why: 'Google writes its own snippet, which usually lowers CTR on commercial pages.', fix: 'Add a 140–155 character description with a concrete benefit and CTA.' },
    { id: 'h1-multi', title: 'Multiple H1 headings on a page', category: 'On-page', severity: 'low', why: 'Dilutes topical signal and confuses passage-level ranking.', fix: 'Keep one H1 per page; demote the rest to H2.' },
    { id: 'thin', title: 'Thin content under 300 words', category: 'Content', severity: 'high', why: 'Thin pages rarely rank and pull down site-wide quality signals.', fix: 'Merge into a stronger page or expand with unique, useful detail.' },
    { id: 'dupe', title: 'Duplicate title tags across pages', category: 'Content', severity: 'medium', why: 'Competing pages cannibalise the same query.', fix: 'Differentiate titles or consolidate the pages.' },
    { id: 'canonical-missing', title: 'Missing canonical tag', category: 'Indexation', severity: 'medium', why: 'Parameterised URLs can split ranking signals.', fix: 'Add self-referencing canonical tags to every indexable page.' },
    { id: 'noindex', title: 'Important pages marked noindex', category: 'Indexation', severity: 'critical', why: 'These pages cannot rank at all until the tag is removed.', fix: 'Remove the noindex directive or unblock in robots.txt.' },
    { id: 'robots-block', title: 'Robots.txt blocks crawlable assets', category: 'Crawlability', severity: 'high', why: 'Blocked JS/CSS stops Google from rendering the page properly.', fix: 'Allow /assets and /_next in robots.txt.' },
    { id: 'sitemap-stale', title: 'Sitemap contains 404 URLs', category: 'Crawlability', severity: 'medium', why: 'Wastes crawl budget and delays discovery of new pages.', fix: 'Regenerate the sitemap and return 410 for removed URLs.' },
    { id: 'redirect-chain', title: 'Redirect chains over 2 hops', category: 'Crawlability', severity: 'medium', why: 'Each hop loses link equity and slows the crawl.', fix: 'Point links directly at the final URL.' },
    { id: 'broken-links', title: 'Internal links to 404 pages', category: 'Internal links', severity: 'high', why: 'Broken links waste equity and frustrate crawlers.', fix: 'Update the links or restore the target page.' },
    { id: 'orphan', title: 'Orphan pages with no internal links', category: 'Internal links', severity: 'medium', why: 'Orphan pages are rarely discovered or ranked.', fix: 'Link from a relevant hub or the sitemap index.' },
    { id: 'lcp', title: 'Largest Contentful Paint above 2.5s', category: 'Performance', severity: 'high', why: 'LCP is a Core Web Vital and a confirmed ranking input on mobile.', fix: 'Preload the hero image and serve responsive AVIF/WebP.' },
    { id: 'cls', title: 'Layout shift on mobile', category: 'Performance', severity: 'medium', why: 'CLS hurts UX and mobile rankings.', fix: 'Reserve dimensions for images, ads and embeds.' },
    { id: 'uncompressed', title: 'Uncompressed images over 400 KB', category: 'Performance', severity: 'medium', why: 'Slow pages lose crawls and conversions.', fix: 'Compress and serve next-gen formats at the rendered size.' },
    { id: 'schema-missing', title: 'Missing Product structured data', category: 'Structured data', severity: 'medium', why: 'No rich result eligibility for product pages.', fix: 'Add Product schema with price, availability and ratings.' },
    { id: 'schema-invalid', title: 'Invalid FAQ structured data', category: 'Structured data', severity: 'low', why: 'Invalid markup is ignored and can trigger a manual action.', fix: 'Fix required properties and validate in the Rich Results Test.' },
    { id: 'https', title: 'Mixed content on secure pages', category: 'Security', severity: 'high', why: 'Browser warnings damage trust and can suppress rankings.', fix: 'Serve every subresource over HTTPS.' },
    { id: 'viewport', title: 'Missing mobile viewport tag', category: 'Mobile', severity: 'high', why: 'Google indexes mobile-first; a broken viewport fails that test.', fix: 'Add width=device-width, initial-scale=1.' },
    { id: 'tap-target', title: 'Tap targets too close together', category: 'Mobile', severity: 'low', why: 'Hurts usability on mobile and engagement signals.', fix: 'Increase spacing to at least 8px between targets.' },
    { id: 'alt-missing', title: 'Images without alt text', category: 'Accessibility', severity: 'low', why: 'Loses image search traffic and accessibility.', fix: 'Add descriptive alt text to informative images.' },
    { id: 'hreflang', title: 'Hreflang points to non-canonical URLs', category: 'International', severity: 'medium', why: 'Wrong country targeting across regional storefronts.', fix: 'Align hreflang with canonical URLs.' },
  ];
  return base.map((f) => {
    const affected = Math.round(1 + Math.pow(r(), 2) * 46);
    const n = Math.min(3, affected);
    const samples = Array.from({ length: n }, () => pick(r, ['/collections/planters', '/products/ceramic-pot', '/blog/balcony-ideas', '/pages/about', '/collections/outdoor', '/products/plant-stand', '/guides/care', '/collections/sale']));
    return { ...f, affected, sample: [...new Set(samples)] };
  });
}

export function auditScore(findings: Finding[]) {
  const weight = { critical: 14, high: 7, medium: 3, low: 1 } as const;
  const penalty = findings.reduce((s, f) => s + weight[f.severity], 0);
  return Math.max(38, Math.min(99, Math.round(100 - penalty * 0.42)));
}

/* ---------- backlinks ---------- */
export type Backlink = { domain: string; dr: number; traffic: number; type: 'dofollow' | 'nofollow'; anchor: string; firstSeen: string; links: number; page: string };

export function buildBacklinks(projectId: string): Backlink[] {
  const r = mulberry32(projectId.length * 1299709 + 29);
  const domains = ['yourstory.com', 'economictimes.indiatimes.com', 'architecturaldigest.in', 'home-design.com', 'thehindu.com',
    'medium.com', 'reddit.com', 'quora.com', 'pinterest.com', 'houzz.in', 'behance.net', 'designwanted.com',
    'urbancompany.com', 'lbb.in', 'graziadaily.in', 'vogue.in', 'forbesindia.com', 'inc42.com', 'yourstory.com',
    'blog.hubspot.com', 'shopify.com', 'etsy.com', 'amazon.in', 'flipkart.com', 'nykaa.com', 'myntra.com',
    'dezeen.com', 'design-milk.com', 'thespruce.com', 'apartmenttherapy.com', 'gardeningknowhow.com', 'epicgardening.com',
    'balconygardenweb.com', 'homify.in', 'magicbricks.com', '99acres.com', 'housing.com', 'olx.in', 'indiamart.com',
    'tradeindia.com', 'justdial.com', 'sulekha.com', 'quikr.com', 'craftsvilla.com'];
  const anchors = ['indoor planters', 'ceramic plant pots', 'urban leaf', 'best planters india', 'balcony decor ideas',
    'plant stands online', 'click here', 'read more', 'shop now', 'self watering pots', 'home decor'];
  return domains.slice(0, 44).map((domain) => ({
    domain, dr: Math.round(18 + Math.pow(r(), 1.6) * 74), traffic: Math.round(400 + Math.pow(r(), 2) * 480000),
    type: r() > 0.28 ? 'dofollow' : 'nofollow', anchor: pick(r, anchors),
    firstSeen: dayISO(Math.round(30 + r() * 900)), links: Math.round(1 + Math.pow(r(), 2.2) * 42),
    page: pick(r, ['/collections/planters', '/', '/products/ceramic-pot', '/blog/balcony-ideas']),
  })).sort((a, b) => b.dr - a.dr);
}

/* ---------- AI visibility ---------- */
export type AiRow = { prompt: string; model: string; mentioned: boolean; cited: boolean; position: number | null; sentiment: string; competitors: string[] };

export function buildAi(projectId: string): AiRow[] {
  const r = mulberry32(projectId.length * 32452843 + 31);
  const prompts = ['best indoor planters in india', 'where to buy ceramic plant pots online', 'self watering pots for balcony',
    'plant stands that look good in a living room', 'cheapest place to buy terracotta pots', 'gift ideas for plant lovers',
    'how to choose a planter size', 'wall planters for small apartments', 'best brands for home decor india', 'planters under 1000 rupees'];
  const models = ['ChatGPT', 'Gemini', 'Perplexity', 'Claude', 'Google AI Overview'];
  const rivals = ['Ugaoo', 'Nurturing Green', 'The Better Home', 'Amazon', 'Flipkart', 'Nestasia'];
  const out: AiRow[] = [];
  prompts.forEach((prompt) => models.forEach((model) => {
    const mentioned = r() > 0.52;
    const cited = mentioned && r() > 0.35;
    out.push({
      prompt, model, mentioned, cited,
      position: mentioned ? Math.round(1 + r() * 4) : null,
      sentiment: pick(r, ['positive', 'positive', 'neutral', 'neutral', 'negative']),
      competitors: rivals.filter(() => r() > 0.55).slice(0, 3),
    });
  }));
  return out;
}

/* ---------- connectors ---------- */
export type Connector = {
  id: string; name: string; category: string; color: string; glyph: string;
  status: 'connected' | 'syncing' | 'error' | 'available';
  account?: string; scopes: string[]; records?: number; lastSync?: string; cadence: string;
  desc: string; docs: string; powers: string[];
};

export const CONNECTORS: Connector[] = [
  { id: 'gsc', name: 'Google Search Console', category: 'Google', color: '#4285f4', glyph: 'G', status: 'connected', account: 'urbanleaf.in', records: 128402, lastSync: '4 min ago', cadence: 'Every 6 hours', scopes: ['webmasters.readonly'], desc: 'Queries, pages, impressions, CTR and position straight from Google.', docs: 'search-console', powers: ['Opportunities', 'Content decay', 'Cannibalisation', 'Rank tracking'] },
  { id: 'ga4', name: 'Google Analytics 4', category: 'Google', color: '#f9ab00', glyph: 'A', status: 'connected', account: 'properties/419283746', records: 96210, lastSync: '12 min ago', cadence: 'Hourly', scopes: ['analytics.readonly'], desc: 'Sessions, engagement, conversions and revenue by landing page.', docs: 'analytics-data', powers: ['Revenue per page', 'Organic conversions', 'Channel mix'] },
  { id: 'gads', name: 'Google Ads', category: 'Google', color: '#34a853', glyph: 'Ad', status: 'connected', account: '847-209-3311', records: 24180, lastSync: '22 min ago', cadence: 'Every 3 hours', scopes: ['adwords.readonly'], desc: 'Campaign spend, CPC, ROAS and paid keywords for paid-vs-organic overlap.', docs: 'google-ads', powers: ['Paid vs organic', 'Wasted spend', 'Cannibalised queries'] },
  { id: 'gbp', name: 'Google Business Profile', category: 'Google', color: '#ea4335', glyph: 'B', status: 'error', scopes: ['business.manage'], desc: 'Local rankings, reviews and geo-grid visibility.', docs: 'business-profile', cadence: 'Daily', powers: ['Local rank grid', 'Reviews'] },
  { id: 'bing', name: 'Bing Webmaster Tools', category: 'Search', color: '#008373', glyph: 'b', status: 'available', scopes: ['webmaster.read'], desc: 'Bing and Copilot search performance plus index status.', docs: 'bing', cadence: 'Daily', powers: ['Bing queries', 'Index coverage'] },
  { id: 'pagespeed', name: 'PageSpeed Insights', category: 'Performance', color: '#22d3ee', glyph: 'Ps', status: 'connected', account: 'API key', records: 1840, lastSync: '1 hr ago', cadence: 'On demand', scopes: ['pagespeed'], desc: 'Core Web Vitals and Lighthouse scores per URL.', docs: 'pagespeed', powers: ['Site audit', 'CWV monitor'] },
  { id: 'slack', name: 'Slack', category: 'Delivery', color: '#611f69', glyph: 'S', status: 'available', scopes: ['chat:write'], desc: 'Push rank drops, audit regressions and weekly digests to a channel.', docs: 'slack', cadence: 'Realtime', powers: ['Alerts', 'Weekly digest'] },
  { id: 'bigquery', name: 'BigQuery', category: 'Warehouse', color: '#4285f4', glyph: 'BQ', status: 'available', scopes: ['bigquery.readonly'], desc: 'Join GSC bulk export with your CRM to see revenue per query.', docs: 'bigquery', cadence: 'Daily', powers: ['Revenue attribution', 'Custom SQL'] },
  { id: 'looker', name: 'Looker Studio', category: 'Delivery', color: '#4285f4', glyph: 'LS', status: 'available', scopes: ['studio'], desc: 'Push SeoSprint models into your existing Looker dashboards.', docs: 'looker', cadence: 'Daily', powers: ['Client reporting'] },
  { id: 'openai', name: 'OpenAI', category: 'AI', color: '#10a37f', glyph: 'AI', status: 'available', scopes: ['model.invoke'], desc: 'Generate briefs, titles and AI-visibility answers with your own key.', docs: 'openai', cadence: 'On demand', powers: ['Content briefs', 'Ask SeoSprint'] },
  { id: 'github', name: 'GitHub', category: 'Developer', color: '#ffffff', glyph: 'GH', status: 'connected', account: 'allabout-aryan/seosprint', records: 1, lastSync: 'just now', cadence: 'On push', scopes: ['repo:read'], desc: 'Deploys this workspace and opens a PR when a fix ships.', docs: 'github', powers: ['Deploys', 'Fix PRs'] },
  { id: 'netlify', name: 'Netlify', category: 'Developer', color: '#00c7b7', glyph: 'N', status: 'connected', account: 'seosprint-m5oo', records: 1, lastSync: 'just now', cadence: 'On deploy', scopes: ['sites:write'], desc: 'Hosts the app and previews every audit export as a shareable link.', docs: 'netlify', powers: ['Hosting', 'Preview links'] },
  { id: 'supabase', name: 'Supabase', category: 'Data', color: '#3ecf8e', glyph: 'SB', status: 'connected', account: 'ap-south-1 · Postgres 17', records: 9, lastSync: 'live', cadence: 'Realtime', scopes: ['db', 'auth'], desc: 'Postgres, row-level security and auth for every workspace.', docs: 'supabase', powers: ['Storage', 'Auth', 'RLS'] },
];

/* ---------- derived analytics ---------- */
export type Opp = { kind: string; keyword: string; url: string; position: number; impressions: number; clicks: number; ctr: number; gain: number; why: string; action: string };

export function buildOpportunities(queries: QueryRow[], pages: PageRow[]): Opp[] {
  const out: Opp[] = [];
  queries.forEach((q) => {
    if (q.position >= 4 && q.position <= 15 && q.impressions > 900) {
      const gain = Math.round(q.impressions * (ctrFor(3) - q.ctr));
      if (gain > 40) out.push({ kind: 'Striking distance', keyword: q.keyword, url: q.url, position: q.position, impressions: q.impressions, clicks: q.clicks, ctr: q.ctr, gain, why: `Ranking #${q.position} with ${fmtInt(q.impressions)} impressions — the click curve says page one top 3 is reachable.`, action: 'Refresh the page for the query, add the exact phrase to the H2, and earn 2 internal links.' });
    }
    if (q.position <= 8 && q.ctr < ctrFor(q.position) * 0.55 && q.impressions > 4000) {
      const gain = Math.round(q.impressions * (ctrFor(q.position) - q.ctr));
      if (gain > 40) out.push({ kind: 'Low CTR', keyword: q.keyword, url: q.url, position: q.position, impressions: q.impressions, clicks: q.clicks, ctr: q.ctr, gain, why: `Ranks #${q.position} but earns only ${(q.ctr * 100).toFixed(1)}% CTR — the snippet is underperforming the position.`, action: 'Rewrite the title and meta description around the query intent and add a differentiator.' });
    }
  });
  pages.forEach((p) => {
    const drop = p.prevClicks - p.clicks;
    if (drop > 60 && p.prevClicks > 200) out.push({ kind: 'Content decay', keyword: `— ${p.url}`, url: p.url, position: p.position, impressions: p.impressions, clicks: p.clicks, ctr: p.ctr, gain: drop, why: `Lost ${fmtInt(drop)} clicks versus the previous period (${p.prevClicks} → ${p.clicks}).`, action: 'Compare against the pages now outranking you, refresh the sections that answer the query, and re-publish.' });
  });
  return out.sort((a, b) => b.gain - a.gain).slice(0, 40);
}

export function fmtInt(n: number) {
  if (n >= 1e7) return (n / 1e7).toFixed(2) + ' Cr';
  if (n >= 1e5) return (n / 1e5).toFixed(2) + ' L';
  return new Intl.NumberFormat('en-IN').format(Math.round(n));
}

/* ---------- bundle ---------- */
export type Workspace = {
  project: Project; series: DayPoint[]; queries: QueryRow[]; pages: PageRow[]; channels: Channel[];
  campaigns: Campaign[]; ideas: KeywordIdea[]; ranks: RankRow[]; findings: Finding[]; score: number;
  backlinks: Backlink[]; ai: AiRow[]; opportunities: Opp[];
  totals: { clicks: number; impressions: number; ctr: number; position: number; sessions: number; conversions: number; revenue: number; adsCost: number; adsClicks: number; adsConversions: number; adsValue: number };
  prev: { clicks: number; impressions: number; ctr: number; position: number; sessions: number; conversions: number; revenue: number; adsCost: number; adsClicks: number; adsConversions: number; adsValue: number };
};

const cache = new Map<string, Workspace>();

export function getWorkspace(projectId: string): Workspace {
  const hit = cache.get(projectId);
  if (hit) return hit;
  const project = projects.find((p) => p.id === projectId) || projects[0];
  const series = buildSeries(projectId);
  const queries = buildQueries(projectId);
  const pages = buildPages(projectId, queries);
  const ranks = buildRanks(projectId, queries);
  const findings = buildFindings(projectId);
  const last30 = series.slice(-30);
  const prev30 = series.slice(-60, -30);
  const sum = (arr: DayPoint[], k: keyof DayPoint) => arr.reduce((s, d) => s + (d[k] as number), 0);
  const campaigns = buildCampaigns(projectId);
  const totals = {
    clicks: sum(last30, 'clicks'), impressions: sum(last30, 'impressions'),
    ctr: sum(last30, 'clicks') / Math.max(1, sum(last30, 'impressions')),
    position: queries.reduce((s, q) => s + q.position * q.impressions, 0) / Math.max(1, queries.reduce((s, q) => s + q.impressions, 0)),
    sessions: sum(last30, 'sessions'), conversions: sum(last30, 'conversions'), revenue: sum(last30, 'revenue'),
    adsCost: sum(last30, 'adsCost'), adsClicks: sum(last30, 'adsClicks'), adsConversions: sum(last30, 'adsConversions'),
    adsValue: Math.round(sum(last30, 'adsConversions') * 1850),
  };
  const prev = {
    clicks: sum(prev30, 'clicks'), impressions: sum(prev30, 'impressions'),
    ctr: sum(prev30, 'clicks') / Math.max(1, sum(prev30, 'impressions')),
    position: totals.position * 1.06,
    sessions: sum(prev30, 'sessions'), conversions: sum(prev30, 'conversions'), revenue: sum(prev30, 'revenue'),
    adsCost: sum(prev30, 'adsCost'), adsClicks: sum(prev30, 'adsClicks'), adsConversions: sum(prev30, 'adsConversions'),
    adsValue: Math.round(sum(prev30, 'adsConversions') * 1850),
  };
  const ws: Workspace = {
    project, series, queries, pages, channels: buildChannels(projectId), campaigns,
    ideas: buildKeywordIdeas(projectId), ranks, findings, score: auditScore(findings),
    backlinks: buildBacklinks(projectId), ai: buildAi(projectId),
    opportunities: buildOpportunities(queries, pages), totals, prev,
  };
  cache.set(projectId, ws);
  return ws;
}

export const pctChange = (a: number, b: number) => (b === 0 ? 0 : ((a - b) / b) * 100);

import { supabase, supabaseEnabled, SUPABASE_URL } from './supabase';

export const FUNCTIONS_URL = SUPABASE_URL ? `${SUPABASE_URL}/functions/v1/seo` : '';

export class LiveError extends Error {}

async function invoke<T>(action: string, params: Record<string, any> = {}): Promise<T> {
  if (!supabase || !supabaseEnabled) {
    throw new LiveError('Live engine is not configured in this build (missing Supabase URL or key).');
  }
  const { data, error } = await supabase.functions.invoke('seo', { body: { action, ...params } });
  if (error) {
    // FunctionsHttpError carries the response body in context
    let msg = error.message || 'Live engine error';
    try {
      const ctx: any = (error as any).context;
      if (ctx && typeof ctx.json === 'function') {
        const body = await ctx.json();
        if (body?.error) msg = body.error;
      }
    } catch { /* keep original */ }
    throw new LiveError(msg);
  }
  if (!data) throw new LiveError('Live engine returned an empty response');
  if (data.ok === false && data.error) throw new LiveError(data.error);
  return data as T;
}

/* ---------------- types ---------------- */

export type LiveFinding = {
  id: string; title: string; category: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  detail: string; fix: string;
};

export type AuditResult = {
  ok: boolean; url: string; finalUrl: string; status: number; score: number; crawledAt: string;
  stats: {
    responseMs: number; htmlKb: number; words: number; images: number; imagesNoAlt: number;
    internalLinks: number; externalLinks: number; h1Count: number; h2Count: number;
    schemaTypes: string[]; sitemapUrls: number; robotsSitemap: string; robotsFound: boolean;
  };
  page: {
    title: string; titleLength: number; description: string; canonical: string; robotsMeta: string;
    lang: string; viewport: string; h1: string[]; h2Sample: string[]; words: number;
    images: number; imagesNoAlt: number; schemaTypes: string[]; ogTitle: string;
  };
  findings: LiveFinding[];
  counts: { critical: number; high: number; medium: number; low: number };
};

export type SitePage = {
  url: string; status: number; ms: number; score: number; title: string; words: number;
  h1: string; images: number; imagesNoAlt: number; internalLinks: number;
  schemaTypes: string[]; issueCount: number; severity: { critical: number; high: number }; issueIds: string[];
};

export type SiteResult = {
  ok: boolean; origin: string; crawledAt: string; sitemapUrls: number; crawled: number;
  requested: number; siteScore: number; pages: SitePage[];
  failures: { url: string; error?: string }[];
  issues: { id: string; count: number }[];
  home: { findings: LiveFinding[]; page: any };
};

export type SerpResult = {
  ok: boolean; query: string; region: string; provider: string | null; tried?: string[];
  results: { position: number; title: string; url: string; domain: string; snippet: string; display: string }[];
  yourRank?: number | null; yourDomain?: string; error?: string; fetchedAt: string;
};

export type CompareRow = {
  url: string; ok: boolean; domain?: string; status?: number; ms?: number; score?: number;
  words?: number; title?: string; h1?: string; h2Count?: number; h2?: string[];
  schemaTypes?: string[]; images?: number; imagesNoAlt?: number; internalLinks?: number;
  externalLinks?: number; findings?: number; error?: string;
};

export type CompareResult = { ok: boolean; comparedAt: string; rows: CompareRow[]; gaps: { topic: string; rivals: number }[] };

export type KeywordIdeaRow = { rank: number; keyword: string; results: number; competition: number; topDomains: string[]; hasResults: boolean };
export type KeywordsResult = { ok: boolean; seed: string; region: string; note: string; ideas: KeywordIdeaRow[]; error?: string };

export type LinksResult = {
  ok: boolean; url: string; checked: number; brokenCount: number;
  links: { url: string; text: string; status: number; ok: boolean; ms: number }[]; error?: string;
};

/* ---------------- calls ---------------- */

export const auditPage = (url: string) => invoke<AuditResult>('audit', { url });
export const crawlSite = (url: string, maxPages = 12) => invoke<SiteResult>('site', { url, maxPages });
export const checkSerp = (q: string, domain?: string, region = 'in-en') => invoke<SerpResult>('serp', { q, domain, region });
export const compareDomains = (urls: string[]) => invoke<CompareResult>('compare', { urls });
export const liveKeywords = (seed: string, region = 'in-en') => invoke<KeywordsResult>('keywords', { seed, region });
export const checkLinks = (url: string, limit = 20) => invoke<LinksResult>('links', { url, limit });
export const liveHealth = () => invoke<{ ok: boolean; service: string; engine: string }>('health');

/* ---------------- issue metadata (for aggregated site issues) ---------------- */

export const ISSUE_META: Record<string, { title: string; severity: string; category: string; fix: string }> = {
  'title-missing': { title: 'Missing title tag', severity: 'critical', category: 'On-page', fix: 'Add a unique 50–60 character title.' },
  'title-long': { title: 'Title over 60 characters', severity: 'medium', category: 'On-page', fix: 'Trim to 50–60 characters.' },
  'title-short': { title: 'Title under 25 characters', severity: 'medium', category: 'On-page', fix: 'Expand with a benefit or qualifier.' },
  'meta-missing': { title: 'Missing meta description', severity: 'high', category: 'On-page', fix: 'Add a 140–155 character description.' },
  'meta-long': { title: 'Meta description too long', severity: 'low', category: 'On-page', fix: 'Trim to 140–155 characters.' },
  'h1-missing': { title: 'No H1 heading', severity: 'high', category: 'On-page', fix: 'Add one H1 stating the page topic.' },
  'h1-multi': { title: 'Multiple H1 headings', severity: 'medium', category: 'On-page', fix: 'Keep one H1, demote the rest.' },
  'canonical-missing': { title: 'No canonical tag', severity: 'medium', category: 'Indexation', fix: 'Add a self-referencing canonical.' },
  'canonical-offsite': { title: 'Canonical points elsewhere', severity: 'high', category: 'Indexation', fix: 'Point the canonical at this page.' },
  noindex: { title: 'Page marked noindex', severity: 'critical', category: 'Indexation', fix: 'Remove the noindex directive.' },
  'viewport-missing': { title: 'No mobile viewport', severity: 'high', category: 'Mobile', fix: 'Add the viewport meta tag.' },
  'lang-missing': { title: 'No lang attribute', severity: 'low', category: 'Accessibility', fix: 'Add lang to the html tag.' },
  'alt-missing': { title: 'Images without alt text', severity: 'low', category: 'Accessibility', fix: 'Describe informative images.' },
  thin: { title: 'Thin content under 300 words', severity: 'high', category: 'Content', fix: 'Expand or merge the page.' },
  shallow: { title: 'Content under 600 words', severity: 'low', category: 'Content', fix: 'Answer the obvious follow-ups.' },
  'schema-missing': { title: 'No structured data', severity: 'medium', category: 'Structured data', fix: 'Add JSON-LD for the page type.' },
  'og-missing': { title: 'No Open Graph tags', severity: 'low', category: 'Social', fix: 'Add og:title, og:description, og:image.' },
  https: { title: 'Not served over HTTPS', severity: 'critical', category: 'Security', fix: 'Install TLS and redirect HTTP.' },
  status: { title: 'Page returns an error status', severity: 'critical', category: 'Crawlability', fix: 'Restore or redirect the URL.' },
  slow: { title: 'Slow server response', severity: 'high', category: 'Performance', fix: 'Cache HTML at the edge.' },
  heavy: { title: 'Large HTML document', severity: 'medium', category: 'Performance', fix: 'Ship less markup.' },
  'sitemap-missing': { title: 'No sitemap.xml', severity: 'medium', category: 'Crawlability', fix: 'Publish a sitemap and link it in robots.txt.' },
  'robots-block': { title: 'robots.txt blocks the site', severity: 'critical', category: 'Crawlability', fix: 'Remove the wildcard Disallow.' },
};

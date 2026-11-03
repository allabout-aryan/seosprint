import React, { useState } from 'react';
import {
  Play, Globe, ChevronRight, ShieldCheck, Loader2, AlertTriangle, CheckCircle2, Link2, ExternalLink, Zap,
} from 'lucide-react';
import { useApp } from '../lib/store';
import { Card, CardHead, Kpi, PageHead, Badge, Segmented, Empty, ConnectorGlyph } from '../components/ui';
import { Donut } from '../components/charts';
import { fmtNum } from '../lib/format';
import {
  crawlSite, auditPage, checkLinks, ISSUE_META, LiveError,
  type SiteResult, type AuditResult, type LinksResult, type LiveFinding,
} from '../lib/live';

const SEV_TONE: Record<string, string> = { critical: 'neg', high: 'warn', medium: 'info', low: '' };

export default function Crawl() {
  const { ws, toast } = useApp();
  const [target, setTarget] = useState(ws.project.domain);
  const [maxPages, setMaxPages] = useState('12');
  const [busy, setBusy] = useState<'site' | 'page' | 'links' | null>(null);
  const [site, setSite] = useState<SiteResult | null>(null);
  const [page, setPage] = useState<AuditResult | null>(null);
  const [links, setLinks] = useState<LinksResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'issues' | 'pages' | 'links'>('issues');
  const [open, setOpen] = useState<string | null>(null);

  const run = async (kind: 'site' | 'page') => {
    const url = target.trim();
    if (!url) return;
    setError(null); setBusy(kind); setLinks(null);
    if (kind === 'site') { setSite(null); setPage(null); }
    else { setPage(null); setSite(null); }
    try {
      if (kind === 'site') {
        const r = await crawlSite(url, Number(maxPages) || 12);
        setSite(r);
        setTab('issues');
        toast(`Crawled ${r.crawled} page${r.crawled === 1 ? '' : 's'} on ${r.origin}`);
      } else {
        const r = await auditPage(url);
        setPage(r);
        toast(`Audited ${r.finalUrl}`);
      }
    } catch (e: any) {
      const msg = e instanceof LiveError ? e.message : e?.message || 'Crawl failed';
      setError(msg);
      toast('Crawl failed', 'err');
    } finally {
      setBusy(null);
    }
  };

  const runLinks = async () => {
    const url = site?.origin || target.trim();
    if (!url) return;
    setBusy('links'); setTab('links');
    try {
      const r = await checkLinks(url, 25);
      setLinks(r);
      toast(`Checked ${r.checked} links, ${r.brokenCount} broken`);
    } catch (e: any) {
      setError(e?.message || 'Link check failed');
    } finally {
      setBusy(null);
    }
  };

  const findings: LiveFinding[] = page?.findings || site?.home.findings || [];
  const metaOf = (id: string) => ISSUE_META[id] || findings.find((f) => f.id === id) || { title: id, severity: 'medium', category: 'Other', fix: '' };

  const score = site?.siteScore ?? page?.score ?? ws.score;
  const scoreColor = score >= 80 ? 'var(--pos)' : score >= 60 ? 'var(--warn)' : 'var(--neg)';
  const counts = page?.counts || {
    critical: site?.home.findings.filter((f) => f.severity === 'critical').length ?? ws.findings.filter((f) => f.severity === 'critical').length,
    high: site?.home.findings.filter((f) => f.severity === 'high').length ?? ws.findings.filter((f) => f.severity === 'high').length,
    medium: site?.home.findings.filter((f) => f.severity === 'medium').length ?? ws.findings.filter((f) => f.severity === 'medium').length,
    low: site?.home.findings.filter((f) => f.severity === 'low').length ?? ws.findings.filter((f) => f.severity === 'low').length,
  };
  const live = Boolean(site || page);

  return (
    <>
      <PageHead
        title="Site crawl"
        sub="Our own crawler. No Google account, no API key, no quotas — it fetches the pages itself."
        right={<Badge tone="pos"><i className="dot" />Engine live</Badge>}
      />

      <Card style={{ marginBottom: 14 }}>
        <div className="card-pad col gap12">
          <div className="row gap10 wrap">
            <div style={{ position: 'relative', flex: 1, minWidth: 260 }}>
              <Globe size={15} style={{ position: 'absolute', left: 11, top: 12, color: 'var(--muted)' }} />
              <input className="input" style={{ paddingLeft: 33, height: 40 }} placeholder="yourdomain.com or a full URL"
                value={target} onChange={(e) => setTarget(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') run('site'); }} />
            </div>
            <select className="input" style={{ width: 130, height: 40 }} value={maxPages} onChange={(e) => setMaxPages(e.target.value)}>
              <option value="6">6 pages</option>
              <option value="12">12 pages</option>
              <option value="25">25 pages</option>
            </select>
            <button className="btn btn-primary" style={{ height: 40 }} onClick={() => run('site')} disabled={!!busy}>
              {busy === 'site' ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Play size={15} />}
              {busy === 'site' ? 'Crawling…' : 'Crawl site'}
            </button>
            <button className="btn" style={{ height: 40 }} onClick={() => run('page')} disabled={!!busy}>
              {busy === 'page' ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <ShieldCheck size={15} />}
              Audit one page
            </button>
          </div>
          <div className="tiny muted">
            Reads robots.txt and sitemap.xml first, then crawls up to {maxPages} URLs. Falls back to following internal links when there is no sitemap.
          </div>
        </div>
      </Card>

      {error && (
        <Card style={{ marginBottom: 14, borderColor: 'rgba(251,113,133,.35)', background: 'rgba(251,113,133,.07)' }}>
          <div className="card-pad row gap10">
            <AlertTriangle size={16} color="var(--neg)" style={{ flex: 'none' }} />
            <div>
              <div className="sm strong">Crawl failed</div>
              <div className="tiny muted">{error}</div>
            </div>
          </div>
        </Card>
      )}

      {!live && (
        <Card style={{ marginBottom: 14, borderColor: 'rgba(109,94,252,.3)', background: 'linear-gradient(90deg, rgba(109,94,252,.1), transparent)' }}>
          <div className="card-pad row gap12 wrap">
            <span style={{ width: 34, height: 34, borderRadius: 9, background: 'rgba(109,94,252,.2)', display: 'grid', placeItems: 'center', color: '#b3a9ff' }}><Zap size={17} /></span>
            <div style={{ flex: 1, minWidth: 240 }}>
              <div className="strong sm">The report below is an example</div>
              <div className="tiny muted">Run a crawl above to replace it with a real report on any URL — it works on sites you don't own.</div>
            </div>
            <Badge tone="accent">Example report</Badge>
          </div>
        </Card>
      )}

      <div className="grid g-2-1" style={{ marginBottom: 14 }}>
        <Card>
          <div className="card-pad row gap20 wrap">
            <Donut size={150} thickness={15} center={
              <div>
                <div className="num" style={{ fontSize: 32, fontWeight: 780, color: scoreColor }}>{score}</div>
                <div className="tiny muted">{live ? (site ? 'site score' : 'page score') : 'demo score'}</div>
              </div>
            } rows={[
              { label: 'Critical', value: counts.critical, color: '#fb7185' },
              { label: 'High', value: counts.high, color: '#fbbf24' },
              { label: 'Medium', value: counts.medium, color: '#60a5fa' },
              { label: 'Low', value: counts.low, color: '#7f8aa3' },
            ]} />
            <div className="col gap12 grow" style={{ minWidth: 200 }}>
              {(['critical', 'high', 'medium', 'low'] as const).map((s) => (
                <div key={s} className="between">
                  <span className="row gap8">
                    <i className="dot" style={{ background: s === 'critical' ? '#fb7185' : s === 'high' ? '#fbbf24' : s === 'medium' ? '#60a5fa' : '#7f8aa3' }} />
                    <span className="sm" style={{ textTransform: 'capitalize' }}>{s}</span>
                  </span>
                  <span className="row gap8"><span className="num sm strong">{counts[s]}</span><span className="tiny muted">issues</span></span>
                </div>
              ))}
              <div className="tiny muted" style={{ marginTop: 4 }}>
                {counts.critical > 0
                  ? 'Fix critical issues first — they block indexing or ranking outright.'
                  : 'No critical blockers. Work down from high.'}
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <CardHead title={live ? 'Crawl facts' : 'What gets checked'} sub={live ? 'Measured on this run' : '23 automated checks'} />
          <div className="card-pad col gap10">
            {live ? (
              <>
                <Row k="Pages crawled" v={String(site?.crawled ?? 1)} />
                <Row k="URLs in sitemap" v={site ? String(site.sitemapUrls) : String(page?.stats.sitemapUrls ?? 0)} />
                <Row k="Response time" v={page ? `${page.stats.responseMs} ms` : site ? `${Math.round(site.pages.reduce((s, p) => s + p.ms, 0) / Math.max(1, site.pages.length))} ms avg` : '—'} />
                <Row k="HTML size" v={page ? `${page.stats.htmlKb} KB` : '—'} />
                <Row k="Words" v={page ? fmtNum(page.stats.words) : site ? `${fmtNum(Math.round(site.pages.reduce((s, p) => s + p.words, 0) / Math.max(1, site.pages.length)))} avg` : '—'} />
                <Row k="Internal links" v={page ? String(page.stats.internalLinks) : '—'} />
                <Row k="Structured data" v={page ? (page.stats.schemaTypes.length ? page.stats.schemaTypes.slice(0, 2).join(', ') : 'none') : '—'} />
              </>
            ) : (
              <>
                <Row k="On-page" v="title, meta, H1, H2, alt" />
                <Row k="Indexation" v="canonical, robots, noindex" />
                <Row k="Crawlability" v="robots.txt, sitemap.xml" />
                <Row k="Performance" v="response time, HTML size" />
                <Row k="Structured data" v="JSON-LD types" />
                <Row k="Social" v="Open Graph, Twitter" />
              </>
            )}
          </div>
        </Card>
      </div>

      <div className="row gap8 wrap" style={{ marginBottom: 12 }}>
        <Segmented value={tab} onChange={setTab} options={[
          { v: 'issues', label: `Issues${site ? ` (${site.issues.length})` : ''}` },
          { v: 'pages', label: `Pages${site ? ` (${site.crawled})` : ''}` },
          { v: 'links', label: 'Links' },
        ]} />
        <button className="btn btn-sm" onClick={runLinks} disabled={!!busy}>
          {busy === 'links' ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Link2 size={13} />}
          Check broken links
        </button>
      </div>

      {tab === 'issues' && (
        <Card>
          <CardHead title={site ? 'Issues across the crawl' : 'Findings'} sub={site ? 'Grouped by how many pages they affect' : 'Ordered by how much they cost you'} />
          <div>
            {site
              ? site.issues.map((iss) => {
                const m = metaOf(iss.id);
                return (
                  <div key={iss.id} style={{ borderBottom: '1px solid rgba(255,255,255,.045)' }}>
                    <button style={{ width: '100%', textAlign: 'left', background: 'transparent', border: 0, color: 'inherit', padding: '13px 16px' }}
                      onClick={() => setOpen(open === iss.id ? null : iss.id)}>
                      <div className="between">
                        <span className="row gap10" style={{ minWidth: 0 }}>
                          <ChevronRight size={15} style={{ transform: open === iss.id ? 'rotate(90deg)' : 'none', transition: 'transform .15s', color: 'var(--muted)', flex: 'none' }} />
                          <span style={{ minWidth: 0 }}>
                            <div className="sm strong truncate">{m.title}</div>
                            <div className="tiny muted">{m.category} · {iss.count} page{iss.count === 1 ? '' : 's'} affected</div>
                          </span>
                        </span>
                        <Badge tone={SEV_TONE[m.severity]}>{m.severity}</Badge>
                      </div>
                    </button>
                    {open === iss.id && (
                      <div style={{ padding: '0 16px 16px 41px' }}>
                        <div className="card card-pad" style={{ borderColor: 'rgba(52,211,153,.25)' }}>
                          <div className="tiny" style={{ color: 'var(--pos)', marginBottom: 4 }}>How to fix</div>
                          <div className="sm dim">{m.fix || 'See the page report for detail.'}</div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
              : findings.map((f) => (
                <div key={f.id} style={{ borderBottom: '1px solid rgba(255,255,255,.045)' }}>
                  <button style={{ width: '100%', textAlign: 'left', background: 'transparent', border: 0, color: 'inherit', padding: '13px 16px' }}
                    onClick={() => setOpen(open === f.id ? null : f.id)}>
                    <div className="between">
                      <span className="row gap10" style={{ minWidth: 0 }}>
                        <ChevronRight size={15} style={{ transform: open === f.id ? 'rotate(90deg)' : 'none', transition: 'transform .15s', color: 'var(--muted)', flex: 'none' }} />
                        <span style={{ minWidth: 0 }}>
                          <div className="sm strong truncate">{f.title}</div>
                          <div className="tiny muted">{f.category}</div>
                        </span>
                      </span>
                      <Badge tone={SEV_TONE[f.severity]}>{f.severity}</Badge>
                    </div>
                  </button>
                  {open === f.id && (
                    <div style={{ padding: '0 16px 16px 41px' }}>
                      <div className="grid g2 gap12">
                        <div className="card card-pad">
                          <div className="tiny muted" style={{ marginBottom: 4 }}>Why it matters</div>
                          <div className="sm dim">{f.detail}</div>
                        </div>
                        <div className="card card-pad" style={{ borderColor: 'rgba(52,211,153,.25)' }}>
                          <div className="tiny" style={{ color: 'var(--pos)', marginBottom: 4 }}>How to fix</div>
                          <div className="sm dim">{f.fix}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
          </div>
        </Card>
      )}

      {tab === 'pages' && (
        <Card>
          <CardHead title="Crawled pages" sub={site ? `${site.crawled} of ${site.requested} requested` : 'Run a site crawl to see every page'} />
          {site ? (
            <div className="tbl-scroll" style={{ maxHeight: '56vh' }}>
              <table className="tbl">
                <thead><tr><th>URL</th><th className="r">Score</th><th className="r">Words</th><th className="r">H1</th><th className="r">Images</th><th className="r">Links</th><th className="r">Issues</th></tr></thead>
                <tbody>
                  {site.pages.map((p) => (
                    <tr key={p.url}>
                      <td><div className="sm truncate" style={{ maxWidth: 320 }}>{p.title || '—'}</div><div className="tiny muted mono truncate" style={{ maxWidth: 320 }}>{p.url}</div></td>
                      <td className="r"><Badge tone={p.score >= 80 ? 'pos' : p.score >= 60 ? 'warn' : 'neg'}>{p.score}</Badge></td>
                      <td className="r num muted">{fmtNum(p.words)}</td>
                      <td className="r num muted">{p.h1 ? '1' : '0'}</td>
                      <td className="r num muted">{p.images}{p.imagesNoAlt ? ` (${p.imagesNoAlt} alt)` : ''}</td>
                      <td className="r num muted">{p.internalLinks}</td>
                      <td className="r num muted">{p.issueCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <Empty title="No crawl yet" sub="Enter a domain above and press Crawl site." />}
        </Card>
      )}

      {tab === 'links' && (
        <Card>
          <CardHead title="Broken link check" sub={links ? `${links.checked} checked · ${links.brokenCount} broken` : 'Fetches every link and reports the failures'} />
          {links ? (
            <div className="tbl-scroll" style={{ maxHeight: '52vh' }}>
              <table className="tbl">
                <thead><tr><th>Link</th><th>Text</th><th className="r">Status</th><th className="r">ms</th></tr></thead>
                <tbody>
                  {links.links.map((l) => (
                    <tr key={l.url}>
                      <td><span className="mono tiny truncate" style={{ display: 'inline-block', maxWidth: 380, color: 'var(--text-2)' }}>{l.url}</span></td>
                      <td className="tiny muted truncate" style={{ maxWidth: 160 }}>{l.text || '—'}</td>
                      <td className="r">{l.ok ? <Badge tone="pos">{l.status}</Badge> : <Badge tone="neg">{l.status || 'fail'}</Badge>}</td>
                      <td className="r num muted">{l.ms}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <Empty title="Nothing checked yet" sub="Press “Check broken links” to fetch every link on the page." action={<button className="btn btn-sm" onClick={runLinks}><Link2 size={13} /> Run check</button>} />}
        </Card>
      )}

      {site && site.failures.length > 0 && (
        <Card style={{ marginTop: 14 }}>
          <CardHead title="Pages that failed to load" sub={`${site.failures.length} of ${site.requested}`} />
          <div className="card-pad col gap6">
            {site.failures.map((f) => (
              <div key={f.url} className="row gap8 tiny">
                <AlertTriangle size={13} color="var(--warn)" />
                <span className="mono truncate" style={{ maxWidth: 460 }}>{f.url}</span>
                <span className="muted" style={{ marginLeft: 'auto' }}>{f.error || 'no response'}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return <div className="between"><span className="sm muted">{k}</span><span className="sm num" style={{ textAlign: 'right' }}>{v}</span></div>;
}

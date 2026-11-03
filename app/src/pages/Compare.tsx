import React, { useState } from 'react';
import { Play, Loader2, AlertTriangle, ArrowRight, Swords } from 'lucide-react';
import { useApp } from '../lib/store';
import { Card, CardHead, PageHead, Badge, Empty } from '../components/ui';
import { compareDomains, LiveError, type CompareResult } from '../lib/live';
import { fmtNum } from '../lib/format';

export default function Compare() {
  const { ws, toast } = useApp();
  const [urls, setUrls] = useState<string[]>([ws.project.domain, 'ugaoo.com', 'nurturinggreen.in', '']);
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<CompareResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const set = (i: number, v: string) => setUrls((u) => u.map((x, j) => (j === i ? v : x)));

  const run = async () => {
    const list = urls.map((u) => u.trim()).filter(Boolean);
    if (list.length < 2) { setError('Add at least two domains to compare.'); return; }
    setError(null); setBusy(true);
    try {
      const r = await compareDomains(list);
      setRes(r);
      toast(`Compared ${r.rows.filter((x) => x.ok).length} pages`);
    } catch (e: any) {
      setError(e instanceof LiveError ? e.message : e?.message || 'Compare failed');
    } finally {
      setBusy(false);
    }
  };

  const good = res?.rows.filter((r) => r.ok) || [];
  const best = (k: keyof typeof good[number], dir: 'max' | 'min') => {
    const vals = good.map((r) => Number(r[k]) || 0);
    const v = dir === 'max' ? Math.max(...vals) : Math.min(...vals);
    return v;
  };

  const metrics: { key: keyof typeof good[number]; label: string; dir: 'max' | 'min'; fmt?: (v: any) => string }[] = [
    { key: 'score', label: 'Health score', dir: 'max' },
    { key: 'words', label: 'Words on page', dir: 'max', fmt: (v) => fmtNum(v) },
    { key: 'h2Count', label: 'H2 sections', dir: 'max' },
    { key: 'internalLinks', label: 'Internal links', dir: 'max' },
    { key: 'externalLinks', label: 'External links', dir: 'min' },
    { key: 'images', label: 'Images', dir: 'max' },
    { key: 'findings', label: 'Issues found', dir: 'min' },
  ];

  return (
    <>
      <PageHead title="Compare" sub="Crawl your page and your competitors' side by side — same engine, same checks, no third-party data." />

      <Card style={{ marginBottom: 14 }}>
        <div className="card-pad col gap12">
          <div className="grid g4 gap10">
            {urls.map((u, i) => (
              <div key={i}>
                <label className="tiny muted">{i === 0 ? 'Your page' : `Competitor ${i}`}</label>
                <input className="input" style={{ marginTop: 5, height: 38, borderColor: i === 0 ? 'rgba(109,94,252,.5)' : undefined }}
                  placeholder={i === 0 ? 'yourdomain.com' : 'competitor.com'}
                  value={u} onChange={(e) => set(i, e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') run(); }} />
              </div>
            ))}
          </div>
          <div className="row gap10 wrap">
            <button className="btn btn-primary" onClick={run} disabled={busy}>
              {busy ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Swords size={15} />}
              {busy ? 'Crawling…' : 'Compare pages'}
            </button>
            <span className="tiny muted">Up to 4 URLs. Each is fetched and parsed exactly like a crawl.</span>
          </div>
        </div>
      </Card>

      {error && (
        <Card style={{ marginBottom: 14, borderColor: 'rgba(251,113,133,.35)', background: 'rgba(251,113,133,.07)' }}>
          <div className="card-pad row gap10"><AlertTriangle size={16} color="var(--neg)" /><span className="sm">{error}</span></div>
        </Card>
      )}

      {!res && (
        <Card>
          <Empty title="Nothing compared yet" sub="Put your page in the first field and up to three competitors after it." />
        </Card>
      )}

      {res && good.length >= 2 && (
        <>
          <Card style={{ marginBottom: 14 }}>
            <CardHead title="Side by side" sub={`Crawled ${new Date(res.comparedAt).toLocaleString('en-IN')}`} />
            <div className="tbl-scroll">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Metric</th>
                    {res.rows.map((r, i) => (
                      <th key={i} className="r">{r.ok ? r.domain : (r.url || '—')}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="sm strong">Title</td>
                    {res.rows.map((r, i) => <td key={i} className="r tiny muted truncate" style={{ maxWidth: 220 }}>{r.title || '—'}</td>)}
                  </tr>
                  {metrics.map((m) => {
                    const b = good.length ? best(m.key, m.dir) : 0;
                    return (
                      <tr key={String(m.key)}>
                        <td className="sm">{m.label}</td>
                        {res.rows.map((r, i) => {
                          const v = r[m.key] as any;
                          const isBest = r.ok && Number(v) === b && good.length > 1;
                          return (
                            <td key={i} className="r">
                              <span className={isBest ? 'num strong' : 'num muted'} style={isBest ? { color: 'var(--pos)' } : undefined}>
                                {r.ok ? (m.fmt ? m.fmt(v) : String(v ?? '—')) : '—'}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                  <tr>
                    <td className="sm">Structured data</td>
                    {res.rows.map((r, i) => (
                      <td key={i} className="r tiny muted">{r.ok ? (r.schemaTypes?.length ? r.schemaTypes.slice(0, 2).join(', ') : 'none') : '—'}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="sm">H1</td>
                    {res.rows.map((r, i) => <td key={i} className="r tiny muted truncate" style={{ maxWidth: 200 }}>{r.h1 || '—'}</td>)}
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>

          <Card>
            <CardHead title="Topics they cover that you don't" sub="H2 headings found on competitor pages and missing from yours" right={<Badge tone="accent">{res.gaps.length} gaps</Badge>} />
            <div className="card-pad col gap8">
              {res.gaps.length === 0 && <Empty title="No heading gaps found" sub="Your page covers every H2 your competitors use." />}
              {res.gaps.map((g) => (
                <div key={g.topic} className="between" style={{ background: 'rgba(255,255,255,.03)', borderRadius: 9, padding: '9px 12px' }}>
                  <span className="row gap8 sm" style={{ minWidth: 0 }}>
                    <ArrowRight size={13} color="var(--accent)" style={{ flex: 'none' }} />
                    <span className="truncate" style={{ textTransform: 'capitalize' }}>{g.topic}</span>
                  </span>
                  <Badge tone="warn">{g.rivals} competitor{g.rivals === 1 ? '' : 's'}</Badge>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}

      {res && good.length < 2 && (
        <Card><Empty title="Could not reach enough pages" sub="At least two URLs must load. Check the domains and try again." /></Card>
      )}
    </>
  );
}

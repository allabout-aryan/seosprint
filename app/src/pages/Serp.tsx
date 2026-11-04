import React, { useState } from 'react';
import { Search, Loader2, AlertTriangle, Info, ExternalLink, Share2 } from 'lucide-react';
import { useApp } from '../lib/store';
import { Card, CardHead, PageHead, Badge, Empty } from '../components/ui';
import { checkSerp, LiveError, type SerpResult } from '../lib/live';
import { saveReport, shareUrl } from '../lib/reports';

export default function Serp() {
  const { ws, toast } = useApp();
  const [q, setQ] = useState('indoor planters');
  const [domain, setDomain] = useState(ws.project.domain);
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<SerpResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);

  const share = async () => {
    if (!res || !res.ok) return;
    setSharing(true);
    const id = await saveReport('serp', res, { url: res.yourDomain || null, title: res.query });
    setSharing(false);
    if (!id) { toast('Could not create a share link', 'err'); return; }
    try { await navigator.clipboard.writeText(shareUrl(id)); toast('Share link copied to clipboard'); }
    catch { toast('Could not copy the link', 'err'); }
  };

  const run = async () => {
    if (!q.trim()) return;
    setError(null); setBusy(true); setRes(null);
    try {
      const r = await checkSerp(q.trim(), domain.trim() || undefined);
      setRes(r);
      if (r.ok) toast(`Found ${r.results.length} results via ${r.provider}`);
    } catch (e: any) {
      setError(e instanceof LiveError ? e.message : e?.message || 'Search failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHead
        title="SERP & ranks"
        sub="Live top-20 results for any query, and where your domain actually sits."
        right={<Badge tone="accent"><i className="dot" />Live search</Badge>}
      />

      <Card style={{ marginBottom: 14 }}>
        <div className="card-pad row gap10 wrap">
          <div style={{ position: 'relative', flex: 2, minWidth: 240 }}>
            <Search size={15} style={{ position: 'absolute', left: 11, top: 12, color: 'var(--muted)' }} />
            <input className="input" style={{ paddingLeft: 33, height: 40 }} placeholder="Search query"
              value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') run(); }} />
          </div>
          <input className="input" style={{ flex: 1, minWidth: 180, height: 40 }} placeholder="yourdomain.com (optional)"
            value={domain} onChange={(e) => setDomain(e.target.value)} />
          <button className="btn btn-primary" style={{ height: 40 }} onClick={run} disabled={busy}>
            {busy ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Search size={15} />}
            {busy ? 'Searching…' : 'Check'}
          </button>
        </div>
      </Card>

      {error && (
        <Card style={{ marginBottom: 14, borderColor: 'rgba(251,191,36,.3)', background: 'rgba(251,191,36,.06)' }}>
          <div className="card-pad row gap10">
            <AlertTriangle size={16} color="var(--warn)" style={{ flex: 'none' }} />
            <div>
              <div className="sm strong">Search provider unavailable</div>
              <div className="tiny muted">{error}</div>
            </div>
          </div>
        </Card>
      )}

      {res && res.ok && (
        <>
          <Card style={{ marginBottom: 14, borderColor: res.yourRank ? 'rgba(52,211,153,.3)' : 'rgba(251,191,36,.3)' }}>
            <div className="card-pad row gap16 wrap">
              <div>
                <div className="tiny muted">Your position for “{res.query}”</div>
                <div className="num" style={{ fontSize: 32, fontWeight: 780, color: res.yourRank ? 'var(--pos)' : 'var(--warn)' }}>
                  {res.yourRank ? `#${res.yourRank}` : 'Not in top 20'}
                </div>
              </div>
              <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                <div className="tiny muted">Provider</div>
                <div className="sm strong">{res.provider}</div>
                <div className="tiny muted">{res.results.length} organic results</div>
                <button className="btn btn-sm" onClick={share} disabled={sharing} style={{ marginTop: 8 }}>
                  {sharing ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Share2 size={13} />}
                  {sharing ? 'Creating…' : 'Share'}
                </button>
              </div>
            </div>
          </Card>

          <Card>
            <CardHead title="Top results" sub={`Live for “${res.query}” · ${res.region}`} />
            <div className="tbl-scroll" style={{ maxHeight: '60vh' }}>
              <table className="tbl">
                <thead><tr><th className="r">#</th><th>Result</th><th className="r">Domain</th></tr></thead>
                <tbody>
                  {res.results.map((r) => {
                    const mine = res.yourDomain && (r.domain === res.yourDomain || r.domain.endsWith('.' + res.yourDomain));
                    return (
                      <tr key={r.position} style={mine ? { background: 'rgba(52,211,153,.07)' } : undefined}>
                        <td className="r num muted">{r.position}</td>
                        <td>
                          <a href={r.url} target="_blank" rel="noreferrer" className="sm strong" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                            <span className="truncate" style={{ maxWidth: 420 }}>{r.title}</span>
                            <ExternalLink size={11} style={{ opacity: .5, flex: 'none' }} />
                          </a>
                          <div className="tiny muted truncate" style={{ maxWidth: 520 }}>{r.snippet || r.url}</div>
                        </td>
                        <td className="r">{mine ? <Badge tone="pos">you</Badge> : <span className="tiny muted">{r.domain}</span>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {res && !res.ok && (
        <Card>
          <CardHead title="No results returned" sub={res.tried ? `Tried: ${res.tried.join(' · ')}` : undefined} />
          <div className="card-pad row gap10">
            <Info size={16} color="var(--warn)" style={{ flex: 'none' }} />
            <div className="sm dim">{res.error || 'The search providers returned nothing for this query.'}</div>
          </div>
        </Card>
      )}

      {!res && !error && (
        <Card>
          <CardHead title="How this works" sub="Honest about the limits" />
          <div className="card-pad col gap10">
            <div className="sm dim">
              SeoSprint reads public search result pages directly — DuckDuckGo first, then Bing — so it needs no Google account and no API key.
            </div>
            <div className="sm dim">
              Free keyless search is rate-limited from data-centre IPs, so a query can occasionally come back empty. When that happens the rank check says so rather than inventing a number.
            </div>
            <div className="tiny muted">
              For guaranteed rank tracking at scale, add a SerpAPI key as <span className="mono">SERPAPI_KEY</span> on the edge function — it is used first and the free providers become the fallback.
            </div>
          </div>
        </Card>
      )}
    </>
  );
}

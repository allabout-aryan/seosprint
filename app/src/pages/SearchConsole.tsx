import React, { useMemo, useState } from 'react';
import { Search, Download, Filter, ArrowUpDown, Sparkles } from 'lucide-react';
import { useApp } from '../lib/store';
import { Card, CardHead, PageHead, Badge, Segmented, PositionPill, CtrBar, Modal, Empty } from '../components/ui';
import { TrendChart } from '../components/charts';
import { fmtCompact, fmtNum, fmtDate } from '../lib/format';
import { ctrFor, type QueryRow } from '../lib/data';

type Tab = 'queries' | 'pages' | 'countries' | 'devices';
type Filter = 'all' | 'striking' | 'lowctr' | 'decay';

export default function SearchConsole() {
  const { ws } = useApp();
  const [tab, setTab] = useState<Tab>('queries');
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<{ k: string; dir: 1 | -1 }>({ k: 'clicks', dir: -1 });
  const [row, setRow] = useState<QueryRow | null>(null);

  const filtered = useMemo(() => {
    let rows = ws.queries.filter((r) => r.keyword.toLowerCase().includes(q.toLowerCase()) || r.url.includes(q));
    if (filter === 'striking') rows = rows.filter((r) => r.position >= 4 && r.position <= 15 && r.impressions > 900);
    if (filter === 'lowctr') rows = rows.filter((r) => r.position <= 8 && r.ctr < ctrFor(r.position) * 0.6);
    if (filter === 'decay') {
      const decayUrls = new Set(ws.opportunities.filter((o) => o.kind === 'Content decay').map((o) => o.url));
      rows = rows.filter((r) => decayUrls.has(r.url));
    }
    const k = sort.k as keyof QueryRow;
    return [...rows].sort((a, b) => {
      const av = a[k] as any, bv = b[k] as any;
      if (typeof av === 'string') return sort.dir * String(av).localeCompare(String(bv));
      return sort.dir * ((av as number) - (bv as number));
    });
  }, [ws, q, filter, sort]);

  const toggleSort = (k: string) => setSort((s) => ({ k, dir: s.k === k ? (s.dir === 1 ? -1 : 1) : -1 }));

  const countries = useMemo(() => {
    const m = new Map<string, { clicks: number; impressions: number; position: number; n: number }>();
    ws.queries.forEach((r) => {
      const v = m.get(r.country) || { clicks: 0, impressions: 0, position: 0, n: 0 };
      v.clicks += r.clicks; v.impressions += r.impressions; v.position += r.position * r.impressions; v.n += r.impressions;
      m.set(r.country, v);
    });
    return [...m.entries()].map(([k, v]) => ({ key: k, clicks: v.clicks, impressions: v.impressions, ctr: v.clicks / Math.max(1, v.impressions), position: v.position / Math.max(1, v.n) })).sort((a, b) => b.clicks - a.clicks);
  }, [ws]);

  const devices = useMemo(() => {
    const m = new Map<string, { clicks: number; impressions: number; position: number; n: number }>();
    ws.queries.forEach((r) => {
      const v = m.get(r.device) || { clicks: 0, impressions: 0, position: 0, n: 0 };
      v.clicks += r.clicks; v.impressions += r.impressions; v.position += r.position * r.impressions; v.n += r.impressions;
      m.set(r.device, v);
    });
    return [...m.entries()].map(([k, v]) => ({ key: k, clicks: v.clicks, impressions: v.impressions, ctr: v.clicks / Math.max(1, v.impressions), position: v.position / Math.max(1, v.n) })).sort((a, b) => b.clicks - a.clicks);
  }, [ws]);

  const slice = ws.series.slice(-30);
  const oppFor = (r: QueryRow) => Math.round(r.impressions * (ctrFor(3) - r.ctr));

  const Th = ({ k, children, r }: { k: string; children: React.ReactNode; r?: boolean }) => (
    <th className={r ? 'r' : ''} style={{ cursor: 'pointer' }} onClick={() => toggleSort(k)}>
      <span className="row gap4" style={{ justifyContent: r ? 'flex-end' : 'flex-start' }}>{children}<ArrowUpDown size={11} style={{ opacity: sort.k === k ? 1 : .3 }} /></span>
    </th>
  );

  return (
    <>
      <PageHead title="Search Console"
        sub={<>Queries, pages and countries from Google · last 30 days · {fmtNum(ws.queries.length)} queries synced</>}
        right={<>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--muted)' }} />
            <input className="input" style={{ paddingLeft: 30, width: 230 }} placeholder="Filter queries…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <button className="btn btn-sm"><Download size={14} /> Export CSV</button>
        </>} />

      <Card style={{ marginBottom: 14 }}>
        <div style={{ padding: '14px 10px 4px' }}>
          <TrendChart labels={slice.map((d) => fmtDate(d.date))} height={190}
            series={[
              { label: 'Clicks', color: '#34d399', values: slice.map((d) => d.clicks) },
              { label: 'Impressions', color: '#22d3ee', values: slice.map((d) => d.impressions) },
            ]} fmt={fmtCompact} />
        </div>
      </Card>

      <Card>
        <div style={{ padding: '0 14px' }}>
          <div className="tabs" style={{ marginBottom: 0 }}>
            {([['queries', 'Queries'], ['pages', 'Pages'], ['countries', 'Countries'], ['devices', 'Devices']] as [Tab, string][]).map(([v, l]) => (
              <button key={v} className={tab === v ? 'on' : ''} onClick={() => setTab(v)}>{l}</button>
            ))}
          </div>
        </div>

        {tab === 'queries' && (
          <>
            <div className="row gap8 wrap" style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
              <Filter size={14} style={{ color: 'var(--muted)' }} />
              <Segmented value={filter} onChange={setFilter} options={[
                { v: 'all', label: `All (${ws.queries.length})` },
                { v: 'striking', label: 'Striking distance' },
                { v: 'lowctr', label: 'Low CTR' },
                { v: 'decay', label: 'Decaying' },
              ]} />
              <span className="tiny muted" style={{ marginLeft: 'auto' }}>{filtered.length} results</span>
            </div>
            <div className="tbl-scroll" style={{ maxHeight: '58vh' }}>
              <table className="tbl">
                <thead><tr>
                  <Th k="keyword">Query</Th>
                  <Th k="clicks" r>Clicks</Th>
                  <Th k="impressions" r>Impressions</Th>
                  <Th k="ctr" r>CTR vs expected</Th>
                  <Th k="position" r>Position</Th>
                  <th className="r">Change</th>
                  <th className="r">In reach</th>
                </tr></thead>
                <tbody>
                  {filtered.slice(0, 120).map((r, i) => {
                    const move = r.prevPosition - r.position;
                    const gain = oppFor(r);
                    return (
                      <tr key={i} style={{ cursor: 'pointer' }} onClick={() => setRow(r)}>
                        <td>
                          <div className="sm truncate" style={{ maxWidth: 300 }}>{r.keyword}</div>
                          <div className="tiny muted truncate mono" style={{ maxWidth: 300 }}>{r.url}</div>
                        </td>
                        <td className="r num">{fmtCompact(r.clicks)}</td>
                        <td className="r num muted">{fmtCompact(r.impressions)}</td>
                        <td className="r"><CtrBar ctr={r.ctr} expected={ctrFor(r.position)} /></td>
                        <td className="r"><PositionPill pos={r.position} /></td>
                        <td className="r">
                          <span className={`delta ${move > 0.3 ? 'up' : move < -0.3 ? 'down' : 'flat'}`} style={{ fontSize: 12 }}>
                            {move > 0 ? '↑' : move < 0 ? '↓' : '–'} {Math.abs(move).toFixed(1)}
                          </span>
                        </td>
                        <td className="r">{gain > 40 && r.position > 3 ? <Badge tone="accent">+{fmtCompact(gain)}</Badge> : <span className="muted tiny">—</span>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {tab === 'pages' && (
          <div className="tbl-scroll" style={{ maxHeight: '64vh' }}>
            <table className="tbl">
              <thead><tr><th>Page</th><th className="r">Clicks</th><th className="r">Impressions</th><th className="r">CTR</th><th className="r">Position</th><th className="r">Sessions</th><th className="r">Revenue</th></tr></thead>
              <tbody>
                {ws.pages.slice(0, 90).map((p) => (
                  <tr key={p.url}>
                    <td><span className="mono sm truncate" style={{ display: 'inline-block', maxWidth: 340, color: 'var(--text-2)' }}>{p.url}</span></td>
                    <td className="r num">{fmtCompact(p.clicks)}</td>
                    <td className="r num muted">{fmtCompact(p.impressions)}</td>
                    <td className="r num muted">{(p.ctr * 100).toFixed(1)}%</td>
                    <td className="r"><PositionPill pos={p.position} /></td>
                    <td className="r num muted">{fmtCompact(p.sessions)}</td>
                    <td className="r num">{fmtCompact(p.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {(tab === 'countries' || tab === 'devices') && (
          <div className="tbl-scroll" style={{ maxHeight: '64vh' }}>
            <table className="tbl">
              <thead><tr><th>{tab === 'countries' ? 'Country' : 'Device'}</th><th className="r">Clicks</th><th className="r">Impressions</th><th className="r">CTR</th><th className="r">Position</th><th className="r">Share</th></tr></thead>
              <tbody>
                {(tab === 'countries' ? countries : devices).map((r) => {
                  const total = (tab === 'countries' ? countries : devices).reduce((s, x) => s + x.clicks, 0);
                  return (
                    <tr key={r.key}>
                      <td className="sm">{r.key}</td>
                      <td className="r num">{fmtCompact(r.clicks)}</td>
                      <td className="r num muted">{fmtCompact(r.impressions)}</td>
                      <td className="r num muted">{(r.ctr * 100).toFixed(1)}%</td>
                      <td className="r"><PositionPill pos={r.position} /></td>
                      <td className="r num muted">{((r.clicks / total) * 100).toFixed(1)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={!!row} onClose={() => setRow(null)} title={row?.keyword || ''} width={560}
        footer={<><button className="btn btn-sm" onClick={() => setRow(null)}>Close</button>
          <button className="btn btn-primary btn-sm"><Sparkles size={14} /> Generate a brief</button></>}>
        {row && (
          <div className="col gap16">
            <div className="grid g3">
              <div><div className="tiny muted">Clicks</div><div className="num strong">{fmtNum(row.clicks)}</div></div>
              <div><div className="tiny muted">Impressions</div><div className="num strong">{fmtNum(row.impressions)}</div></div>
              <div><div className="tiny muted">Position</div><div className="num strong">#{row.position}</div></div>
            </div>
            <div>
              <div className="between tiny" style={{ marginBottom: 5 }}>
                <span className="muted">CTR vs the curve for position #{Math.round(row.position)}</span>
                <span>{(row.ctr * 100).toFixed(1)}% / {(ctrFor(row.position) * 100).toFixed(1)}%</span>
              </div>
              <div className="progress"><i style={{ width: `${Math.min(100, (row.ctr / ctrFor(row.position)) * 100)}%` }} /></div>
            </div>
            <div className="card card-pad" style={{ background: 'rgba(109,94,252,.08)', borderColor: 'rgba(109,94,252,.25)' }}>
              <div className="sm strong" style={{ marginBottom: 4 }}>Recommended next move</div>
              <div className="sm dim">
                {row.position > 15
                  ? 'This query is beyond page two. Target it with a dedicated section on the ranking page and add two internal links from your strongest pages.'
                  : row.ctr < ctrFor(row.position) * 0.6
                    ? 'You rank well but the snippet is underperforming. Rewrite the title and meta description around the query, and add a price or benefit to earn the click.'
                    : 'You are close. Refresh the page against the current top 3, add the exact phrase to the H2, and earn two internal links to push into the top 3.'}
              </div>
            </div>
            <div className="between tiny muted">
              <span className="mono">{row.url}</span>
              <span>{row.country} · {row.device} · {row.intent}</span>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

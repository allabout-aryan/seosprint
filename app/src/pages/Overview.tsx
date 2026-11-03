import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Zap, AlertTriangle, Plug, Sparkles, TrendingUp, Target, MousePointerClick } from 'lucide-react';
import { useApp } from '../lib/store';
import { Card, CardHead, Kpi, Badge, PageHead, Segmented, Delta, ConnectorGlyph, StatusBadge, Empty } from '../components/ui';
import { TrendChart, Sparkline, Donut, PositionBars } from '../components/charts';
import { fmtCompact, fmtINR, fmtNum, fmtDate } from '../lib/format';
import { pctChange, ctrFor } from '../lib/data';

export default function Overview() {
  const { ws, connectors, sync, syncing } = useApp();
  const nav = useNavigate();
  const [range, setRange] = useState<'30' | '90'>('30');
  const days = range === '30' ? 30 : 90;
  const slice = ws.series.slice(-days);
  const labels = slice.map((d) => fmtDate(d.date));
  const t = ws.totals, p = ws.prev;
  const dClicks = pctChange(t.clicks, p.clicks);
  const dImpr = pctChange(t.impressions, p.impressions);
  const dRev = pctChange(t.revenue, p.revenue);
  const dPos = pctChange(t.position, p.position);
  const dCost = pctChange(t.adsCost, p.adsCost);

  const opps = ws.opportunities.slice(0, 6);
  const totalGain = ws.opportunities.reduce((s, o) => s + o.gain, 0);
  const striking = ws.queries.filter((q) => q.position >= 4 && q.position <= 15 && q.impressions > 900);
  const strikeGain = striking.reduce((s, q) => s + Math.round(q.impressions * (ctrFor(3) - q.ctr)), 0);

  const buckets = [
    { label: '1–3', value: ws.queries.filter((q) => q.position <= 3).length, color: '#34d399' },
    { label: '4–10', value: ws.queries.filter((q) => q.position > 3 && q.position <= 10).length, color: '#22d3ee' },
    { label: '11–20', value: ws.queries.filter((q) => q.position > 10 && q.position <= 20).length, color: '#6d5efc' },
    { label: '21–50', value: ws.queries.filter((q) => q.position > 20 && q.position <= 50).length, color: '#fbbf24' },
    { label: '50+', value: ws.queries.filter((q) => q.position > 50).length, color: '#fb7185' },
  ];

  const health = connectors.filter((c) => ['gsc', 'ga4', 'gads'].includes(c.id));
  const broken = connectors.filter((c) => c.status === 'error');

  return (
    <>
      <PageHead
        title="Overview"
        sub={<span>Last {days} days · {ws.project.domain} · compared with the previous {days} days</span>}
        right={<>
          <Segmented value={range} options={[{ v: '30', label: '30 days' }, { v: '90', label: '90 days' }]} onChange={setRange} />
          <button className="btn btn-sm" onClick={() => nav('/app/ask')}><Sparkles size={14} /> Ask why</button>
          <button className="btn btn-primary btn-sm" onClick={() => nav('/app/crawl')}><Zap size={14} /> Run a live crawl</button>
        </>}
      />

      <Card style={{ marginBottom: 14, borderColor: 'rgba(109,94,252,.3)', background: 'linear-gradient(90deg, rgba(109,94,252,.1), transparent)' }}>
        <div className="card-pad row gap12 wrap">
          <span style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(109,94,252,.2)', display: 'grid', placeItems: 'center', color: '#b3a9ff', flex: 'none' }}><Zap size={16} /></span>
          <div style={{ flex: 1, minWidth: 260 }}>
            <div className="strong sm">The crawler is live — the analytics below are the demo workspace</div>
            <div className="tiny muted">Crawls, competitor compares and rank checks run against real websites with no Google account. The Search Console, GA4 and Ads panels are sample data until you import them.</div>
          </div>
          <button className="btn btn-sm" onClick={() => nav('/app/crawl')}>Open crawler <ArrowRight size={13} /></button>
        </div>
      </Card>

      <div className="grid g5" style={{ marginBottom: 14 }}>
        <Kpi label="Organic clicks" value={fmtCompact(t.clicks)} delta={dClicks} sub={`of ${fmtCompact(t.impressions)} impressions`}
          spark={<Sparkline values={slice.map((d) => d.clicks)} color="#34d399" />} />
        <Kpi label="Search impressions" value={fmtCompact(t.impressions)} delta={dImpr}
          spark={<Sparkline values={slice.map((d) => d.impressions)} color="#22d3ee" />} />
        <Kpi label="Average position" value={t.position.toFixed(1)} delta={dPos} invert
          spark={<Sparkline values={slice.map((d) => d.impressions / Math.max(1, d.clicks))} color="#6d5efc" />} />
        <Kpi label="Organic revenue" value={fmtINR(t.revenue, true)} delta={dRev} sub={`${fmtCompact(t.conversions)} conversions`}
          spark={<Sparkline values={slice.map((d) => d.revenue)} color="#a78bfa" />} />
        <Kpi label="Ad spend" value={fmtINR(t.adsCost, true)} delta={dCost} invert sub={`${fmtINR(t.adsValue / Math.max(1, t.adsCost), true)}x return`}
          spark={<Sparkline values={slice.map((d) => d.adsCost)} color="#fb7185" />} />
      </div>

      <div className="grid g-2-1" style={{ marginBottom: 14 }}>
        <Card>
          <CardHead title="Clicks and impressions" sub="Search Console, daily"
            right={<div className="row gap12 tiny muted">
              <span className="row gap6"><i style={{ width: 8, height: 8, borderRadius: 2, background: '#34d399', display: 'inline-block' }} />Clicks</span>
              <span className="row gap6"><i style={{ width: 8, height: 8, borderRadius: 2, background: '#22d3ee', display: 'inline-block' }} />Impressions</span>
            </div>} />
          <div style={{ padding: '14px 10px 6px' }}>
            <TrendChart labels={labels} height={250}
              series={[
                { label: 'Clicks', color: '#34d399', values: slice.map((d) => d.clicks) },
                { label: 'Impressions', color: '#22d3ee', values: slice.map((d) => d.impressions) },
              ]} fmt={(v) => fmtCompact(v)} />
          </div>
        </Card>

        <Card>
          <CardHead title="What to fix first" sub={`${fmtCompact(totalGain)} clicks in reach`} right={<Badge tone="accent"><Zap size={11} /> Opportunity engine</Badge>} />
          <div style={{ padding: '8px 0', maxHeight: 300, overflowY: 'auto' }}>
            {opps.map((o, i) => (
              <div key={i} style={{ padding: '9px 16px', borderBottom: '1px solid rgba(255,255,255,.045)', cursor: 'pointer' }}
                onClick={() => nav('/app/search-console')}>
                <div className="between" style={{ marginBottom: 3 }}>
                  <span className="sm strong truncate" style={{ maxWidth: 210 }}>{o.keyword}</span>
                  <Badge tone={o.kind === 'Content decay' ? 'neg' : o.kind === 'Low CTR' ? 'warn' : 'accent'}>{o.kind}</Badge>
                </div>
                <div className="tiny muted between">
                  <span className="truncate" style={{ maxWidth: 200 }}>{o.url}</span>
                  <span className="num" style={{ color: 'var(--pos)', fontWeight: 600 }}>+{fmtCompact(o.gain)}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card style={{ marginBottom: 14, borderColor: 'rgba(109,94,252,.3)', background: 'linear-gradient(90deg, rgba(109,94,252,.13), rgba(34,211,238,.05))' }}>
        <div className="card-pad between wrap gap12">
          <div className="row gap12">
            <span style={{ width: 34, height: 34, borderRadius: 9, background: 'rgba(109,94,252,.2)', display: 'grid', placeItems: 'center', color: '#b3a9ff' }}><Target size={17} /></span>
            <div>
              <div className="strong sm">{striking.length} queries sit one push from page one</div>
              <div className="tiny muted">Positions 4–15 with real impressions. Lifting them to the top 3 is worth about {fmtCompact(strikeGain)} clicks a month at today's volumes.</div>
            </div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => nav('/app/search-console')}>See the list <ArrowRight size={14} /></button>
        </div>
      </Card>

      <div className="grid g3" style={{ marginBottom: 14 }}>
        <Card>
          <CardHead title="Position distribution" sub={`${fmtNum(ws.queries.length)} tracked queries`} />
          <div className="card-pad"><PositionBars buckets={buckets} /></div>
        </Card>
        <Card>
          <CardHead title="Sessions by channel" sub="GA4, last 30 days" right={<button className="btn btn-ghost btn-sm" onClick={() => nav('/app/analytics')}>Open <ArrowRight size={13} /></button>} />
          <div className="card-pad row gap16">
            <Donut size={132} thickness={15} rows={ws.channels.map((c) => ({ label: c.channel, value: c.sessions, color: c.color }))}
              center={<div><div className="num strong" style={{ fontSize: 17 }}>{fmtCompact(ws.channels.reduce((s, c) => s + c.sessions, 0))}</div><div className="tiny muted">sessions</div></div>} />
            <div className="col gap6 grow">
              {ws.channels.slice(0, 5).map((c) => (
                <div key={c.channel} className="between tiny">
                  <span className="row gap6"><i style={{ width: 7, height: 7, borderRadius: 2, background: c.color }} />{c.channel}</span>
                  <span className="num muted">{fmtCompact(c.sessions)}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
        <Card>
          <CardHead title="Source health" sub="Live connector status" right={<button className="btn btn-ghost btn-sm" onClick={() => nav('/app/connectors')}>All <ArrowRight size={13} /></button>} />
          <div className="card-pad col gap12">
            {health.map((c) => (
              <div key={c.id} className="between">
                <span className="row gap8"><ConnectorGlyph glyph={c.glyph} color={c.color} size={26} /><span className="sm">{c.name}</span></span>
                <span className="row gap8">
                  <span className="tiny muted num">{c.records ? fmtCompact(c.records) + ' rows' : '—'}</span>
                  <StatusBadge status={c.status} />
                </span>
              </div>
            ))}
            {broken.length > 0 && (
              <div className="row gap8 tiny" style={{ color: 'var(--neg)', marginTop: 2 }}>
                <AlertTriangle size={13} /> {broken[0].name} needs re-authorising
                <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }} onClick={() => sync(broken[0].id)}>Fix</button>
              </div>
            )}
          </div>
        </Card>
      </div>

      <div className="grid g-2-1">
        <Card>
          <CardHead title="Top pages" sub="Clicks, revenue and conversion rate per URL" right={<button className="btn btn-ghost btn-sm" onClick={() => nav('/app/search-console')}>All pages <ArrowRight size={13} /></button>} />
          <div className="tbl-scroll" style={{ maxHeight: 330 }}>
            <table className="tbl">
              <thead><tr><th>Page</th><th className="r">Clicks</th><th className="r">CTR</th><th className="r">Position</th><th className="r">Revenue</th></tr></thead>
              <tbody>
                {ws.pages.slice(0, 8).map((pg) => (
                  <tr key={pg.url}>
                    <td><span className="mono sm truncate" style={{ display: 'inline-block', maxWidth: 240, color: 'var(--text-2)' }}>{pg.url}</span></td>
                    <td className="r num">{fmtCompact(pg.clicks)}</td>
                    <td className="r num muted">{(pg.ctr * 100).toFixed(1)}%</td>
                    <td className="r num muted">{pg.position.toFixed(1)}</td>
                    <td className="r num">{fmtINR(pg.revenue, true)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <CardHead title="AI visibility" sub="Share of voice across chat models" right={<button className="btn btn-ghost btn-sm" onClick={() => nav('/app/ai')}>Open <ArrowRight size={13} /></button>} />
          <div className="card-pad">
            {(() => {
              const rows = ws.ai;
              const mentioned = rows.filter((r) => r.mentioned).length;
              const cited = rows.filter((r) => r.cited).length;
              const sov = Math.round((mentioned / rows.length) * 100);
              return (
                <>
                  <div className="row gap16" style={{ marginBottom: 14 }}>
                    <div>
                      <div className="num" style={{ fontSize: 30, fontWeight: 750 }}>{sov}%</div>
                      <div className="tiny muted">prompts mention you</div>
                    </div>
                    <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                      <div className="sm strong num">{cited}</div>
                      <div className="tiny muted">cited as a source</div>
                    </div>
                  </div>
                  <div className="col gap8">
                    {['ChatGPT', 'Gemini', 'Perplexity', 'Claude'].map((m) => {
                      const rs = rows.filter((r) => r.model === m);
                      const pct = Math.round((rs.filter((r) => r.mentioned).length / Math.max(1, rs.length)) * 100);
                      return (
                        <div key={m}>
                          <div className="between tiny" style={{ marginBottom: 4 }}><span>{m}</span><span className="num muted">{pct}%</span></div>
                          <div className="progress"><i style={{ width: `${pct}%` }} /></div>
                        </div>
                      );
                    })}
                  </div>
                </>
              );
            })()}
          </div>
        </Card>
      </div>
    </>
  );
}

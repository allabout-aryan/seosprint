import React, { useMemo, useState } from 'react';
import { ArrowRight, AlertTriangle } from 'lucide-react';
import { useApp } from '../lib/store';
import { Card, CardHead, Kpi, PageHead, Badge, Segmented } from '../components/ui';
import { TrendChart } from '../components/charts';
import { fmtCompact, fmtINR, fmtDate } from '../lib/format';
import { pctChange } from '../lib/data';

export default function Ads() {
  const { ws } = useApp();
  const [view, setView] = useState<'campaigns' | 'overlap'>('campaigns');
  const slice = ws.series.slice(-30);
  const t = ws.totals, p = ws.prev;
  const spend = ws.campaigns.reduce((s, c) => s + c.cost, 0);
  const clicks = ws.campaigns.reduce((s, c) => s + c.clicks, 0);
  const conv = ws.campaigns.reduce((s, c) => s + c.conversions, 0);
  const value = ws.campaigns.reduce((s, c) => s + c.convValue, 0);
  const roas = value / Math.max(1, spend);

  // paid vs organic overlap: queries that also have a paid presence
  const overlap = useMemo(() => {
    return ws.queries.slice(0, 22).map((q, i) => ({
      keyword: q.keyword, organicPos: q.position, organicClicks: q.clicks,
      paidClicks: Math.round(q.clicks * (0.35 + ((i * 37) % 60) / 100)),
      paidCost: Math.round(q.clicks * (0.35 + ((i * 37) % 60) / 100) * (14 + (i % 7))),
      conflict: q.position <= 3,
    })).sort((a, b) => b.paidCost - a.paidCost);
  }, [ws]);

  const wasted = overlap.filter((o) => o.conflict).reduce((s, o) => s + o.paidCost, 0);

  return (
    <>
      <PageHead title="Google Ads"
        sub={<>Campaign performance and paid-vs-organic overlap · account 847-209-3311 · last 30 days</>}
        right={<><Badge tone="pos"><i className="dot" />Synced 22 min ago</Badge><button className="btn btn-sm">Open in Ads <ArrowRight size={13} /></button></>} />

      <div className="grid g5" style={{ marginBottom: 14 }}>
        <Kpi label="Spend" value={fmtINR(spend, true)} delta={pctChange(t.adsCost, p.adsCost)} invert sub="last 30 days" />
        <Kpi label="Clicks" value={fmtCompact(clicks)} delta={pctChange(t.adsClicks, p.adsClicks)} sub={`CPC ${fmtINR(spend / Math.max(1, clicks))}`} />
        <Kpi label="Conversions" value={fmtCompact(conv)} delta={pctChange(t.adsConversions, p.adsConversions)} sub={`CPA ${fmtINR(spend / Math.max(1, conv))}`} />
        <Kpi label="Conv. value" value={fmtINR(value, true)} delta={pctChange(value, p.adsValue)} sub="revenue attributed" />
        <Kpi label="ROAS" value={`${roas.toFixed(2)}x`} delta={pctChange(value / spend, p.adsValue / p.adsCost)} sub={roas > 4 ? 'healthy' : 'below target'} />
      </div>

      <div className="grid g-2-1" style={{ marginBottom: 14 }}>
        <Card>
          <CardHead title="Spend against return" sub="Daily cost and attributed conversion value" />
          <div style={{ padding: '14px 10px 6px' }}>
            <TrendChart labels={slice.map((d) => fmtDate(d.date))} height={230}
              series={[
                { label: 'Cost', color: '#fb7185', values: slice.map((d) => d.adsCost) },
                { label: 'Conv. value', color: '#34d399', values: slice.map((d) => Math.round(d.adsConversions * 1850)) },
              ]} fmt={(v) => fmtINR(v, true)} />
          </div>
        </Card>
        <Card style={{ borderColor: 'rgba(251,191,36,.3)', background: 'linear-gradient(180deg, rgba(251,191,36,.09), transparent)' }}>
          <CardHead title="Wasted spend detector" sub="Paid keywords you already rank #1–3 for organically" right={<AlertTriangle size={16} color="var(--warn)" />} />
          <div className="card-pad">
            <div className="num" style={{ fontSize: 30, fontWeight: 760 }}>{fmtINR(wasted, true)}</div>
            <div className="tiny muted" style={{ marginBottom: 12 }}>in 30 days on queries organic already wins</div>
            <div className="col gap8">
              {overlap.filter((o) => o.conflict).slice(0, 4).map((o) => (
                <div key={o.keyword} className="between tiny">
                  <span className="truncate" style={{ maxWidth: 170 }}>{o.keyword}</span>
                  <span className="row gap8">
                    <Badge tone="pos">#{o.organicPos.toFixed(0)} organic</Badge>
                    <span className="num muted">{fmtINR(o.paidCost, true)}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <div style={{ padding: '0 14px' }}>
          <div className="tabs">
            <button className={view === 'campaigns' ? 'on' : ''} onClick={() => setView('campaigns')}>Campaigns</button>
            <button className={view === 'overlap' ? 'on' : ''} onClick={() => setView('overlap')}>Paid vs organic</button>
          </div>
        </div>

        {view === 'campaigns' ? (
          <div className="tbl-scroll">
            <table className="tbl">
              <thead><tr><th>Campaign</th><th>Type</th><th>Status</th><th className="r">Spend</th><th className="r">Clicks</th><th className="r">CPC</th><th className="r">CTR</th><th className="r">Conv.</th><th className="r">ROAS</th></tr></thead>
              <tbody>
                {ws.campaigns.map((c) => (
                  <tr key={c.name}>
                    <td className="sm strong">{c.name}</td>
                    <td><span className="badge">{c.type}</span></td>
                    <td><Badge tone={c.status === 'Enabled' ? 'pos' : ''}>{c.status}</Badge></td>
                    <td className="r num">{fmtINR(c.cost, true)}</td>
                    <td className="r num muted">{fmtCompact(c.clicks)}</td>
                    <td className="r num muted">{fmtINR(c.cpc)}</td>
                    <td className="r num muted">{(c.ctr * 100).toFixed(1)}%</td>
                    <td className="r num muted">{fmtCompact(c.conversions)}</td>
                    <td className="r"><Badge tone={c.roas >= 4 ? 'pos' : c.roas >= 2 ? 'warn' : 'neg'}>{c.roas.toFixed(2)}x</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="tbl-scroll" style={{ maxHeight: '52vh' }}>
            <table className="tbl">
              <thead><tr><th>Query</th><th className="r">Organic pos</th><th className="r">Organic clicks</th><th className="r">Paid clicks</th><th className="r">Paid cost</th><th className="r">Verdict</th></tr></thead>
              <tbody>
                {overlap.map((o) => (
                  <tr key={o.keyword}>
                    <td className="sm truncate" style={{ maxWidth: 300 }}>{o.keyword}</td>
                    <td className="r num">#{o.organicPos.toFixed(0)}</td>
                    <td className="r num muted">{fmtCompact(o.organicClicks)}</td>
                    <td className="r num muted">{fmtCompact(o.paidClicks)}</td>
                    <td className="r num">{fmtINR(o.paidCost, true)}</td>
                    <td className="r">{o.conflict ? <Badge tone="warn">Pause paid</Badge> : <Badge tone="pos">Keep both</Badge>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}

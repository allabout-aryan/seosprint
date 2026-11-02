import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { useApp } from '../lib/store';
import { Card, CardHead, Kpi, PageHead, Badge, Segmented } from '../components/ui';
import { TrendChart, Donut, BarsH } from '../components/charts';
import { fmtCompact, fmtINR, fmtDate, fmtNum } from '../lib/format';
import { pctChange } from '../lib/data';

export default function Analytics() {
  const { ws } = useApp();
  const [metric, setMetric] = useState<'sessions' | 'users' | 'conversions' | 'revenue'>('sessions');
  const slice = ws.series.slice(-30);
  const t = ws.totals, p = ws.prev;
  const totalSessions = ws.channels.reduce((s, c) => s + c.sessions, 0);
  const totalRevenue = ws.channels.reduce((s, c) => s + c.revenue, 0);
  const totalConv = ws.channels.reduce((s, c) => s + c.conversions, 0);
  const engagement = ws.channels.reduce((s, c) => s + c.engagement * c.sessions, 0) / totalSessions;
  const organic = ws.channels.find((c) => c.channel === 'Organic Search');

  return (
    <>
      <PageHead title="Google Analytics 4"
        sub={<>Sessions, engagement and revenue by landing page · property 419283746 · last 30 days</>}
        right={<><Badge tone="pos"><i className="dot" />Synced 12 min ago</Badge><button className="btn btn-sm">Open in GA4 <ArrowRight size={13} /></button></>} />

      <div className="grid g5" style={{ marginBottom: 14 }}>
        <Kpi label="Sessions" value={fmtCompact(totalSessions)} delta={pctChange(t.sessions, p.sessions)} sub="all channels" />
        <Kpi label="Users" value={fmtCompact(ws.channels.reduce((s, c) => s + c.users, 0))} delta={pctChange(t.sessions, p.sessions) - 1.4} sub="active users" />
        <Kpi label="Conversions" value={fmtCompact(totalConv)} delta={pctChange(t.conversions, p.conversions)} sub={`${((totalConv / totalSessions) * 100).toFixed(2)}% rate`} />
        <Kpi label="Revenue" value={fmtINR(totalRevenue, true)} delta={pctChange(t.revenue, p.revenue)} sub="attributed" />
        <Kpi label="Engagement rate" value={`${(engagement * 100).toFixed(1)}%`} delta={2.6} sub="engaged sessions" />
      </div>

      <div className="grid g-2-1" style={{ marginBottom: 14 }}>
        <Card>
          <CardHead title="Acquisition trend" sub="Daily, all channels"
            right={<Segmented value={metric} onChange={setMetric} options={[
              { v: 'sessions', label: 'Sessions' }, { v: 'users', label: 'Users' },
              { v: 'conversions', label: 'Conversions' }, { v: 'revenue', label: 'Revenue' }]} />} />
          <div style={{ padding: '14px 10px 6px' }}>
            <TrendChart labels={slice.map((d) => fmtDate(d.date))} height={250}
              series={[{ label: metric[0].toUpperCase() + metric.slice(1), color: '#6d5efc', values: slice.map((d) => d[metric] as number) }]}
              fmt={(v) => (metric === 'revenue' ? fmtINR(v, true) : fmtCompact(v))} />
          </div>
        </Card>
        <Card>
          <CardHead title="Channel mix" sub="Sessions by default channel group" />
          <div className="card-pad col gap16">
            <div className="row gap16">
              <Donut size={140} thickness={16} rows={ws.channels.map((c) => ({ label: c.channel, value: c.sessions, color: c.color }))}
                center={<div><div className="num strong" style={{ fontSize: 18 }}>{((organic!.sessions / totalSessions) * 100).toFixed(0)}%</div><div className="tiny muted">organic</div></div>} />
              <div className="col gap6 grow">
                {ws.channels.map((c) => (
                  <div key={c.channel} className="between tiny">
                    <span className="row gap6 truncate"><i style={{ width: 7, height: 7, borderRadius: 2, background: c.color, flex: 'none' }} /><span className="truncate">{c.channel}</span></span>
                    <span className="num muted">{fmtCompact(c.sessions)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid g2" style={{ marginBottom: 14 }}>
        <Card>
          <CardHead title="Channel performance" sub="Sessions, conversions, revenue and engagement" />
          <div className="tbl-scroll" style={{ maxHeight: 320 }}>
            <table className="tbl">
              <thead><tr><th>Channel</th><th className="r">Sessions</th><th className="r">Conv.</th><th className="r">Rate</th><th className="r">Revenue</th><th className="r">Engaged</th></tr></thead>
              <tbody>
                {ws.channels.map((c) => (
                  <tr key={c.channel}>
                    <td><span className="row gap8"><i style={{ width: 8, height: 8, borderRadius: 2, background: c.color }} />{c.channel}</span></td>
                    <td className="r num">{fmtCompact(c.sessions)}</td>
                    <td className="r num muted">{fmtCompact(c.conversions)}</td>
                    <td className="r num muted">{((c.conversions / c.sessions) * 100).toFixed(2)}%</td>
                    <td className="r num">{fmtINR(c.revenue, true)}</td>
                    <td className="r num muted">{(c.engagement * 100).toFixed(0)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <Card>
          <CardHead title="Revenue by landing page" sub="Top pages, organic and paid" />
          <div className="tbl-scroll" style={{ maxHeight: 320 }}>
            <table className="tbl">
              <thead><tr><th>Landing page</th><th className="r">Sessions</th><th className="r">Conv.</th><th className="r">Revenue</th><th className="r">RPV</th></tr></thead>
              <tbody>
                {ws.pages.slice(0, 10).map((pg) => (
                  <tr key={pg.url}>
                    <td><span className="mono sm truncate" style={{ display: 'inline-block', maxWidth: 210, color: 'var(--text-2)' }}>{pg.url}</span></td>
                    <td className="r num">{fmtCompact(pg.sessions)}</td>
                    <td className="r num muted">{fmtCompact(pg.conversions)}</td>
                    <td className="r num">{fmtINR(pg.revenue, true)}</td>
                    <td className="r num muted">{fmtINR(pg.revenue / Math.max(1, pg.sessions))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <div className="grid g3">
        <Card>
          <CardHead title="Sessions by device" sub="GA4 device category" />
          <div className="card-pad">
            <BarsH rows={[
              { label: 'Mobile', value: Math.round(totalSessions * 0.68), color: '#6d5efc' },
              { label: 'Desktop', value: Math.round(totalSessions * 0.27), color: '#22d3ee' },
              { label: 'Tablet', value: Math.round(totalSessions * 0.05), color: '#a78bfa' },
            ]} fmt={(v) => fmtCompact(v)} />
          </div>
        </Card>
        <Card>
          <CardHead title="Top countries" sub="Active users" />
          <div className="card-pad">
            <BarsH rows={[
              { label: 'India', value: Math.round(totalSessions * 0.54) },
              { label: 'United States', value: Math.round(totalSessions * 0.14) },
              { label: 'UAE', value: Math.round(totalSessions * 0.08) },
              { label: 'United Kingdom', value: Math.round(totalSessions * 0.06) },
              { label: 'Singapore', value: Math.round(totalSessions * 0.04) },
            ]} fmt={(v) => fmtCompact(v)} />
          </div>
        </Card>
        <Card>
          <CardHead title="Conversion funnel" sub="Organic search only" />
          <div className="card-pad col gap12">
            {[
              ['Sessions', organic!.sessions],
              ['Engaged', Math.round(organic!.sessions * 0.63)],
              ['Added to cart', Math.round(organic!.sessions * 0.11)],
              ['Checkout', Math.round(organic!.sessions * 0.048)],
              ['Purchase', organic!.conversions],
            ].map(([l, v], i) => (
              <div key={l as string}>
                <div className="between tiny" style={{ marginBottom: 4 }}><span>{l}</span><span className="num muted">{fmtNum(v as number)}</span></div>
                <div className="progress"><i style={{ width: `${((v as number) / organic!.sessions) * 100}%`, opacity: 1 - i * 0.12 }} /></div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}

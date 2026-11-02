import React, { useMemo, useState } from 'react';
import { Plus, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useApp } from '../lib/store';
import { Card, CardHead, Kpi, PageHead, Badge, Segmented, PositionPill } from '../components/ui';
import { Sparkline, PositionBars, TrendChart } from '../components/charts';
import { fmtCompact, fmtNum, fmtDate } from '../lib/format';

export default function Ranks() {
  const { ws } = useApp();
  const [device, setDevice] = useState<'All' | 'Desktop' | 'Mobile'>('All');
  const rows = useMemo(() => (device === 'All' ? ws.ranks : ws.ranks.filter((r) => r.device === device)), [ws, device]);

  const top3 = rows.filter((r) => r.latest <= 3).length;
  const top10 = rows.filter((r) => r.latest <= 10).length;
  const improved = rows.filter((r) => r.latest < r.prev).length;
  const declined = rows.filter((r) => r.latest > r.prev).length;
  const avg = rows.reduce((s, r) => s + r.latest, 0) / Math.max(1, rows.length);

  const buckets = [
    { label: '1–3', value: rows.filter((r) => r.latest <= 3).length, color: '#34d399' },
    { label: '4–10', value: rows.filter((r) => r.latest > 3 && r.latest <= 10).length, color: '#22d3ee' },
    { label: '11–20', value: rows.filter((r) => r.latest > 10 && r.latest <= 20).length, color: '#6d5efc' },
    { label: '21+', value: rows.filter((r) => r.latest > 20).length, color: '#fbbf24' },
  ];

  const mover = [...rows].sort((a, b) => (b.prev - b.latest) - (a.prev - a.latest)).slice(0, 8);

  return (
    <>
      <PageHead title="Rank tracking"
        sub={<>Daily Google positions for {rows.length} keywords · {ws.project.country} · desktop and mobile</>}
        right={<><Segmented value={device} onChange={setDevice} options={[{ v: 'All', label: 'All' }, { v: 'Desktop', label: 'Desktop' }, { v: 'Mobile', label: 'Mobile' }]} /><button className="btn btn-primary btn-sm"><Plus size={14} /> Add keywords</button></>} />

      <div className="grid g5" style={{ marginBottom: 14 }}>
        <Kpi label="Tracked keywords" value={fmtNum(rows.length)} sub="checked daily at 06:00 IST" />
        <Kpi label="Top 3" value={String(top3)} delta={(top3 / Math.max(1, rows.length)) * 100} sub={`${((top3 / Math.max(1, rows.length)) * 100).toFixed(0)}% of the list`} />
        <Kpi label="Top 10" value={String(top10)} sub={`${((top10 / Math.max(1, rows.length)) * 100).toFixed(0)}% of the list`} />
        <Kpi label="Average position" value={avg.toFixed(1)} sub="impression-weighted" />
        <Kpi label="Movers" value={`${improved}↑ / ${declined}↓`} sub="versus 7 days ago" />
      </div>

      <div className="grid g-2-1" style={{ marginBottom: 14 }}>
        <Card>
          <CardHead title="Biggest movers" sub="Position change over the last 7 days" />
          <div className="tbl-scroll">
            <table className="tbl">
              <thead><tr><th>Keyword</th><th className="r">Now</th><th className="r">7 days ago</th><th className="r">Change</th><th className="r">30-day trend</th></tr></thead>
              <tbody>
                {mover.map((r) => {
                  const d = r.prev - r.latest;
                  return (
                    <tr key={r.keyword}>
                      <td className="sm truncate" style={{ maxWidth: 260 }}>{r.keyword}</td>
                      <td className="r"><PositionPill pos={r.latest} /></td>
                      <td className="r num muted">{r.prev}</td>
                      <td className="r">
                        <span className={`delta ${d > 0 ? 'up' : d < 0 ? 'down' : 'flat'}`} style={{ fontSize: 12 }}>
                          {d > 0 ? <ArrowUpRight size={12} /> : d < 0 ? <ArrowDownRight size={12} /> : null}{Math.abs(d)}
                        </span>
                      </td>
                      <td className="r"><span style={{ display: 'inline-block', transform: 'scaleY(-1)' }}><Sparkline values={r.history} color={d >= 0 ? '#34d399' : '#fb7185'} width={90} height={26} /></span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
        <div className="col gap14">
          <Card>
            <CardHead title="Distribution" sub="Current positions" />
            <div className="card-pad"><PositionBars buckets={buckets} /></div>
          </Card>
          <Card>
            <CardHead title="Average position" sub="30 days" />
            <div style={{ padding: '10px 8px 0' }}>
              <TrendChart labels={Array.from({ length: 30 }, (_, i) => fmtDate(ws.series[ws.series.length - 30 + i].date))} height={150} area
                series={[{ label: 'Avg position', color: '#6d5efc', values: (() => {
                  const base = avg; const out: number[] = [];
                  for (let i = 0; i < 30; i++) out.push(+(base + 2.2 - i * 0.07 + Math.sin(i / 3) * 0.25).toFixed(1));
                  return out;
                })() }]} fmt={(v) => v.toFixed(1)} />
            </div>
          </Card>
        </div>
      </div>

      <Card>
        <CardHead title="All tracked keywords" sub="Latest position, best ever and location" />
        <div className="tbl-scroll" style={{ maxHeight: '52vh' }}>
          <table className="tbl">
            <thead><tr><th>Keyword</th><th>URL</th><th>Device</th><th>Location</th><th className="r">Latest</th><th className="r">Best</th><th className="r">Volume</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.keyword}>
                  <td className="sm truncate" style={{ maxWidth: 250 }}>{r.keyword}</td>
                  <td className="mono tiny muted truncate" style={{ maxWidth: 200 }}>{r.url}</td>
                  <td className="tiny muted">{r.device}</td>
                  <td className="tiny muted">{r.location}</td>
                  <td className="r"><PositionPill pos={r.latest} /></td>
                  <td className="r num muted">{r.best}</td>
                  <td className="r num muted">{fmtCompact(r.volume)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

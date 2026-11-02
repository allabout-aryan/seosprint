import React, { useMemo, useState } from 'react';
import { useApp } from '../lib/store';
import { Card, CardHead, Kpi, PageHead, Badge, Segmented } from '../components/ui';
import { TrendChart, BarsH, Donut } from '../components/charts';
import { fmtCompact, fmtNum } from '../lib/format';

export default function Backlinks() {
  const { ws } = useApp();
  const [type, setType] = useState<'all' | 'dofollow' | 'nofollow'>('all');
  const rows = useMemo(() => (type === 'all' ? ws.backlinks : ws.backlinks.filter((b) => b.type === type)), [ws, type]);

  const dr = Math.round(ws.backlinks.reduce((s, b) => s + b.dr, 0) / ws.backlinks.length);
  const domains = ws.backlinks.length * 7 + 41;
  const totalLinks = ws.backlinks.reduce((s, b) => s + b.links, 0);
  const dofollow = Math.round((ws.backlinks.filter((b) => b.type === 'dofollow').length / ws.backlinks.length) * 100);
  const traffic = ws.backlinks.reduce((s, b) => s + b.traffic, 0);

  const history = useMemo(() => {
    const out: number[] = [];
    let v = domains * 0.52;
    for (let i = 0; i < 12; i++) { v += domains * 0.045 * (0.6 + ((i * 37) % 11) / 10); out.push(Math.round(v)); }
    return out;
  }, [domains]);

  const anchors = useMemo(() => {
    const m = new Map<string, number>();
    ws.backlinks.forEach((b) => m.set(b.anchor, (m.get(b.anchor) || 0) + b.links));
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([label, value]) => ({ label, value }));
  }, [ws]);

  const intersect = ['ugaoo.com', 'nurturinggreen.in', 'thebetterhome.com'].map((c) => ({
    competitor: c,
    shared: Math.round(ws.backlinks.length * (0.25 + (c.length % 5) * 0.05)),
    uniqueToYou: Math.round(ws.backlinks.length * 0.62),
    uniqueToThem: Math.round(ws.backlinks.length * (0.5 + (c.length % 7) * 0.06)),
  }));

  return (
    <>
      <PageHead title="Backlinks"
        sub={<>Referring domains, anchors and link growth for {ws.project.domain}</>}
        right={<><Segmented value={type} onChange={setType} options={[{ v: 'all', label: 'All' }, { v: 'dofollow', label: 'Dofollow' }, { v: 'nofollow', label: 'Nofollow' }]} /><button className="btn btn-sm">Export</button></>} />

      <div className="grid g5" style={{ marginBottom: 14 }}>
        <Kpi label="Domain Rating" value={String(dr)} delta={3.4} sub="out of 100" />
        <Kpi label="Referring domains" value={fmtNum(domains)} delta={8.1} sub="unique sites" />
        <Kpi label="Total backlinks" value={fmtCompact(totalLinks)} delta={12.6} sub="live links" />
        <Kpi label="Dofollow share" value={`${dofollow}%`} sub="passes equity" />
        <Kpi label="Est. referral traffic" value={fmtCompact(traffic)} delta={5.2} sub="visits per month" />
      </div>

      <div className="grid g-2-1" style={{ marginBottom: 14 }}>
        <Card>
          <CardHead title="Referring domains" sub="Growth over 12 months" />
          <div style={{ padding: '14px 10px 6px' }}>
            <TrendChart labels={['Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov']} height={230}
              series={[{ label: 'Referring domains', color: '#22d3ee', values: history }]} fmt={(v) => fmtCompact(v)} />
          </div>
        </Card>
        <Card>
          <CardHead title="Anchor text" sub="Top anchors by link count" />
          <div className="card-pad"><BarsH rows={anchors} fmt={(v) => String(v)} /></div>
        </Card>
      </div>

      <div className="grid g-2-1">
        <Card>
          <CardHead title="Referring domains" sub={`${rows.length} domains · sorted by authority`} />
          <div className="tbl-scroll" style={{ maxHeight: '54vh' }}>
            <table className="tbl">
              <thead><tr><th>Domain</th><th className="r">DR</th><th className="r">Traffic</th><th>Type</th><th>Anchor</th><th className="r">Links</th><th className="r">First seen</th></tr></thead>
              <tbody>
                {rows.map((b) => (
                  <tr key={b.domain}>
                    <td className="sm truncate" style={{ maxWidth: 220 }}>{b.domain}</td>
                    <td className="r"><Badge tone={b.dr > 60 ? 'pos' : b.dr > 35 ? 'info' : ''}>{b.dr}</Badge></td>
                    <td className="r num muted">{fmtCompact(b.traffic)}</td>
                    <td><span className="badge">{b.type}</span></td>
                    <td className="tiny muted truncate" style={{ maxWidth: 140 }}>{b.anchor}</td>
                    <td className="r num muted">{b.links}</td>
                    <td className="r tiny muted">{b.firstSeen}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <Card>
          <CardHead title="Link intersect" sub="Domains linking to competitors but not you" />
          <div className="card-pad col gap16">
            {intersect.map((c) => (
              <div key={c.competitor}>
                <div className="between" style={{ marginBottom: 6 }}>
                  <span className="sm strong">{c.competitor}</span>
                  <Badge tone="warn">{c.uniqueToThem} gap</Badge>
                </div>
                <div className="progress" style={{ height: 8 }}>
                  <i style={{ width: `${(c.shared / (c.shared + c.uniqueToThem)) * 100}%` }} />
                </div>
                <div className="between tiny muted" style={{ marginTop: 4 }}>
                  <span>{c.shared} shared</span><span>{c.uniqueToYou} only yours</span>
                </div>
              </div>
            ))}
            <button className="btn btn-sm">Build an outreach list</button>
          </div>
        </Card>
      </div>
    </>
  );
}

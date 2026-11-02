import React, { useMemo, useState } from 'react';
import { Play, ChevronRight, ShieldCheck, AlertTriangle, Zap } from 'lucide-react';
import { useApp } from '../lib/store';
import { Card, CardHead, Kpi, PageHead, Badge, Segmented } from '../components/ui';
import { Donut } from '../components/charts';
import { fmtNum } from '../lib/format';

const SEV_TONE: Record<string, string> = { critical: 'neg', high: 'warn', medium: 'info', low: '' };

export default function Audit() {
  const { ws, toast } = useApp();
  const [sev, setSev] = useState<'all' | 'critical' | 'high' | 'medium' | 'low'>('all');
  const [open, setOpen] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [prog, setProg] = useState(0);

  const findings = useMemo(() => (sev === 'all' ? ws.findings : ws.findings.filter((f) => f.severity === sev)), [ws, sev]);
  const counts = useMemo(() => ({
    critical: ws.findings.filter((f) => f.severity === 'critical').length,
    high: ws.findings.filter((f) => f.severity === 'high').length,
    medium: ws.findings.filter((f) => f.severity === 'medium').length,
    low: ws.findings.filter((f) => f.severity === 'low').length,
  }), [ws]);

  const run = () => {
    setRunning(true); setProg(0);
    const iv = setInterval(() => setProg((p) => {
      if (p >= 100) { clearInterval(iv); setRunning(false); toast('Audit complete — 412 URLs crawled, 59 checks run'); return 100; }
      return p + 7;
    }), 90);
  };

  const score = ws.score;
  const scoreColor = score >= 80 ? 'var(--pos)' : score >= 60 ? 'var(--warn)' : 'var(--neg)';

  return (
    <>
      <PageHead title="Site audit"
        sub={<>Technical crawl of {ws.project.domain} · 412 URLs · 59 checks · last run 3 hours ago</>}
        right={<button className="btn btn-primary btn-sm" onClick={run} disabled={running}><Play size={14} /> {running ? `Crawling ${prog}%` : 'Re-run audit'}</button>} />

      <div className="grid g-2-1" style={{ marginBottom: 14 }}>
        <Card>
          <div className="card-pad row gap20 wrap">
            <Donut size={150} thickness={15} center={
              <div>
                <div className="num" style={{ fontSize: 32, fontWeight: 780, color: scoreColor }}>{score}</div>
                <div className="tiny muted">health score</div>
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
                  <span className="row gap8"><i className="dot" style={{ background: s === 'critical' ? '#fb7185' : s === 'high' ? '#fbbf24' : s === 'medium' ? '#60a5fa' : '#7f8aa3' }} />
                    <span className="sm" style={{ textTransform: 'capitalize' }}>{s}</span></span>
                  <span className="row gap8"><span className="num sm strong">{counts[s]}</span><span className="tiny muted">issues</span></span>
                </div>
              ))}
              <div className="tiny muted" style={{ marginTop: 4 }}>
                {counts.critical > 0 ? 'Fix critical issues first — they block indexing or ranking entirely.' : 'No critical blockers. Work down from high.'}
              </div>
            </div>
          </div>
        </Card>
        <Card>
          <CardHead title="Core Web Vitals" sub="Mobile, field data" />
          <div className="card-pad col gap12">
            {[
              ['LCP', '2.9s', 'needs work', 'var(--warn)', 68],
              ['INP', '142ms', 'good', 'var(--pos)', 88],
              ['CLS', '0.04', 'good', 'var(--pos)', 94],
              ['TTFB', '0.6s', 'good', 'var(--pos)', 82],
            ].map(([k, v, label, color, pct]) => (
              <div key={k as string}>
                <div className="between tiny" style={{ marginBottom: 4 }}>
                  <span className="row gap6"><b>{k}</b><span className="muted">{v}</span></span>
                  <span style={{ color: color as string }}>{label}</span>
                </div>
                <div className="progress"><i style={{ width: `${pct}%`, background: color as string }} /></div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {running && (
        <Card style={{ marginBottom: 14 }}>
          <div className="card-pad">
            <div className="between sm" style={{ marginBottom: 8 }}><span>Crawling {ws.project.domain}…</span><span className="num">{prog}%</span></div>
            <div className="progress"><i style={{ width: `${prog}%` }} /></div>
            <div className="tiny muted" style={{ marginTop: 6 }}>{Math.round((prog / 100) * 412)} of 412 URLs · checking titles, canonicals, schema, links and performance</div>
          </div>
        </Card>
      )}

      <div className="row gap8 wrap" style={{ marginBottom: 12 }}>
        <ShieldCheck size={15} style={{ color: 'var(--muted)' }} />
        <Segmented value={sev} onChange={setSev} options={[
          { v: 'all', label: `All (${ws.findings.length})` },
          { v: 'critical', label: `Critical (${counts.critical})` },
          { v: 'high', label: `High (${counts.high})` },
          { v: 'medium', label: `Medium (${counts.medium})` },
          { v: 'low', label: `Low (${counts.low})` },
        ]} />
      </div>

      <Card>
        <CardHead title="Issues" sub="Ordered by how much they cost you" right={<Badge tone="accent"><Zap size={11} /> {fmtNum(ws.findings.reduce((s, f) => s + f.affected, 0))} affected URLs</Badge>} />
        <div>
          {findings.map((f) => (
            <div key={f.id} style={{ borderBottom: '1px solid rgba(255,255,255,.045)' }}>
              <button style={{ width: '100%', textAlign: 'left', background: 'transparent', border: 0, color: 'inherit', padding: '13px 16px' }}
                onClick={() => setOpen(open === f.id ? null : f.id)}>
                <div className="between">
                  <span className="row gap10" style={{ minWidth: 0 }}>
                    <ChevronRight size={15} style={{ transform: open === f.id ? 'rotate(90deg)' : 'none', transition: 'transform .15s', color: 'var(--muted)', flex: 'none' }} />
                    <span style={{ minWidth: 0 }}>
                      <div className="sm strong truncate">{f.title}</div>
                      <div className="tiny muted">{f.category} · {f.affected} URLs affected</div>
                    </span>
                  </span>
                  <span className="row gap8" style={{ flex: 'none' }}>
                    <Badge tone={SEV_TONE[f.severity]}>{f.severity}</Badge>
                  </span>
                </div>
              </button>
              {open === f.id && (
                <div style={{ padding: '0 16px 16px 41px' }}>
                  <div className="grid g2 gap12">
                    <div className="card card-pad">
                      <div className="tiny muted" style={{ marginBottom: 4 }}>Why it matters</div>
                      <div className="sm dim">{f.why}</div>
                    </div>
                    <div className="card card-pad" style={{ borderColor: 'rgba(52,211,153,.25)' }}>
                      <div className="tiny" style={{ color: 'var(--pos)', marginBottom: 4 }}>How to fix</div>
                      <div className="sm dim">{f.fix}</div>
                    </div>
                  </div>
                  <div className="row gap8 wrap" style={{ marginTop: 10 }}>
                    {f.sample.map((u) => <span key={u} className="chip mono tiny">{u}</span>)}
                    <button className="btn btn-sm" style={{ marginLeft: 'auto' }}>Open in editor</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}

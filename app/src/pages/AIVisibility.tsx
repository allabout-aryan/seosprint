import React, { useMemo, useState } from 'react';
import { Sparkles, Plus } from 'lucide-react';
import { useApp } from '../lib/store';
import { Card, CardHead, Kpi, PageHead, Badge, Segmented } from '../components/ui';
import { BarsH } from '../components/charts';
import { fmtNum } from '../lib/format';

const MODELS = ['ChatGPT', 'Gemini', 'Perplexity', 'Claude', 'Google AI Overview'];

export default function AIVisibility() {
  const { ws } = useApp();
  const [model, setModel] = useState<string>('all');
  const rows = useMemo(() => (model === 'all' ? ws.ai : ws.ai.filter((r) => r.model === model)), [ws, model]);

  const mentioned = rows.filter((r) => r.mentioned).length;
  const cited = rows.filter((r) => r.cited).length;
  const sov = Math.round((mentioned / Math.max(1, rows.length)) * 100);
  const avgPos = rows.filter((r) => r.position).reduce((s, r) => s + (r.position || 0), 0) / Math.max(1, rows.filter((r) => r.position).length);

  const prompts = [...new Set(ws.ai.map((r) => r.prompt))];
  const byPrompt = prompts.map((p) => ({ prompt: p, rows: ws.ai.filter((r) => r.prompt === p) }));

  const perModel = MODELS.map((m) => {
    const rs = ws.ai.filter((r) => r.model === m);
    return { label: m, value: Math.round((rs.filter((r) => r.mentioned).length / Math.max(1, rs.length)) * 100), color: '#6d5efc' };
  });

  const competitors = useMemo(() => {
    const m = new Map<string, number>();
    ws.ai.forEach((r) => r.competitors.forEach((c) => m.set(c, (m.get(c) || 0) + 1)));
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([label, value]) => ({ label, value: Math.round((value / ws.ai.length) * 100) }));
  }, [ws]);

  return (
    <>
      <PageHead title="AI visibility"
        sub={<>How {ws.project.domain} shows up in AI answers · {prompts.length} prompts across {MODELS.length} models</>}
        right={<><Segmented value={model} onChange={setModel} options={[{ v: 'all', label: 'All models' }, { v: 'ChatGPT', label: 'ChatGPT' }, { v: 'Perplexity', label: 'Perplexity' }]} /><button className="btn btn-primary btn-sm"><Plus size={14} /> Track prompt</button></>} />

      <div className="grid g4" style={{ marginBottom: 14 }}>
        <Kpi label="Share of voice" value={`${sov}%`} delta={6.2} sub="prompts that mention you" />
        <Kpi label="Mentions" value={fmtNum(mentioned)} delta={11.4} sub={`of ${rows.length} answers`} />
        <Kpi label="Citations" value={fmtNum(cited)} sub="you are the linked source" />
        <Kpi label="Average position" value={avgPos ? `#${avgPos.toFixed(1)}` : '—'} sub="when you appear" />
      </div>

      <div className="grid g-2-1" style={{ marginBottom: 14 }}>
        <Card>
          <CardHead title="Prompt × model matrix" sub="A dot means you were mentioned; a ring means you were cited" />
          <div className="tbl-scroll">
            <table className="tbl">
              <thead><tr><th>Prompt</th>{MODELS.map((m) => <th key={m} className="r" style={{ fontSize: 10 }}>{m.replace('Google ', '')}</th>)}</tr></thead>
              <tbody>
                {byPrompt.map(({ prompt, rows: rs }) => (
                  <tr key={prompt}>
                    <td className="sm truncate" style={{ maxWidth: 300 }}>{prompt}</td>
                    {MODELS.map((m) => {
                      const r = rs.find((x) => x.model === m);
                      return (
                        <td key={m} className="r">
                          {r?.mentioned ? (
                            <span title={`${m}: ${r.cited ? 'cited' : 'mentioned'}`} style={{
                              display: 'inline-block', width: 12, height: 12, borderRadius: '50%',
                              background: r.cited ? 'var(--pos)' : 'rgba(109,94,252,.75)',
                              boxShadow: r.cited ? '0 0 0 2px rgba(52,211,153,.25)' : 'none',
                            }} />
                          ) : <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: '50%', border: '1px solid rgba(255,255,255,.14)' }} />}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <div className="col gap14">
          <Card>
            <CardHead title="Mention rate by model" sub="% of prompts" />
            <div className="card-pad"><BarsH rows={perModel} fmt={(v) => `${v}%`} max={100} /></div>
          </Card>
          <Card>
            <CardHead title="Competitor share" sub="% of answers" />
            <div className="card-pad"><BarsH rows={competitors.map((c) => ({ ...c, color: '#fb7185' }))} fmt={(v) => `${v}%`} /></div>
          </Card>
        </div>
      </div>

      <Card style={{ borderColor: 'rgba(109,94,252,.3)', background: 'linear-gradient(90deg, rgba(109,94,252,.12), transparent)' }}>
        <div className="card-pad row gap12 wrap">
          <span style={{ width: 34, height: 34, borderRadius: 9, background: 'rgba(109,94,252,.2)', display: 'grid', placeItems: 'center', color: '#b3a9ff' }}><Sparkles size={17} /></span>
          <div>
            <div className="strong sm">You are missing from {100 - sov}% of AI answers</div>
            <div className="tiny muted">The biggest gap is “{byPrompt.find((p) => p.rows.filter((r) => r.mentioned).length <= 1)?.prompt || prompts[0]}”. Publish a comparison page with structured data — AI answers cite pages that state facts plainly.</div>
          </div>
        </div>
      </Card>
    </>
  );
}

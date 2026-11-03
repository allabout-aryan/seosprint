import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Bookmark, Download, TrendingUp, TrendingDown, Plus } from 'lucide-react';
import { useApp } from '../lib/store';
import { Card, CardHead, PageHead, Badge, Segmented, Kpi, Empty } from '../components/ui';
import { BarsH } from '../components/charts';
import { fmtCompact, fmtNum, fmtINR } from '../lib/format';
import { saveKeyword } from '../lib/supabase';
import { supabaseEnabled } from '../lib/supabase';
import { liveKeywords, LiveError, type KeywordIdeaRow } from '../lib/live';
import { Loader2, Radio } from 'lucide-react';

export default function Keywords() {
  const { ws, projectId, toast } = useApp();
  const [params] = useSearchParams();
  const [seed_input, setSeed] = useState(params.get('q') || '');
  const seed = seed_input;
  const [intent, setIntent] = useState<'all' | 'Commercial' | 'Transactional' | 'Informational'>('all');
  const [maxKd, setMaxKd] = useState(100);
  const [saved, setSaved] = useState<string[]>([]);
  const [liveRows, setLiveRows] = useState<KeywordIdeaRow[] | null>(null);
  const [liveBusy, setLiveBusy] = useState(false);
  const [liveNote, setLiveNote] = useState<string | null>(null);
  const [liveErr, setLiveErr] = useState<string | null>(null);

  const getLive = async () => {
    const seed = (seed_input || 'indoor planters').trim();
    if (!seed) return;
    setLiveBusy(true); setLiveErr(null); setLiveNote(null);
    try {
      const r = await liveKeywords(seed);
      setLiveRows(r.ideas || []);
      setLiveNote(r.note || null);
      toast(`${r.ideas.length} keywords verified against live results`);
    } catch (e: any) {
      setLiveErr(e instanceof LiveError ? e.message : e?.message || 'Live keyword check failed');
      setLiveRows(null);
    } finally {
      setLiveBusy(false);
    }
  };

  const rows = useMemo(() => {
    let r = ws.ideas;
    if (seed.trim()) r = r.filter((k) => k.keyword.toLowerCase().includes(seed.trim().toLowerCase()) || k.parent.includes(seed.trim().toLowerCase()));
    if (intent !== 'all') r = r.filter((k) => k.intent === intent);
    r = r.filter((k) => k.difficulty <= maxKd);
    return r;
  }, [ws, seed, intent, maxKd]);

  const totalVol = rows.reduce((s, r) => s + r.volume, 0);
  const avgKd = rows.length ? Math.round(rows.reduce((s, r) => s + r.difficulty, 0) / rows.length) : 0;
  const clusters = useMemo(() => {
    const m = new Map<string, number>();
    rows.forEach((r) => m.set(r.cluster, (m.get(r.cluster) || 0) + r.volume));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [rows]);

  const onSave = async (k: typeof ws.ideas[number]) => {
    setSaved((s) => [...s, k.keyword]);
    const res = await saveKeyword(projectId, k.keyword, k.volume, k.difficulty, k.intent);
    toast(res.ok ? `Saved “${k.keyword}” to your Supabase workspace` : `Saved “${k.keyword}” locally${supabaseEnabled ? '' : ' — connect Supabase to sync'}`);
  };

  const kdTone = (kd: number) => (kd < 30 ? 'pos' : kd < 60 ? 'warn' : 'neg');

  return (
    <>
      <PageHead title="Keyword research"
        sub={<>Ideas, volume, difficulty and intent for {ws.project.domain} · {ws.project.country}</>}
        right={<><button className="btn btn-sm"><Download size={14} /> Export</button><button className="btn btn-primary btn-sm"><Plus size={14} /> New list</button></>} />

      <Card style={{ marginBottom: 14 }}>
        <div className="card-pad row gap12 wrap">
          <div style={{ position: 'relative', flex: 1, minWidth: 260 }}>
            <Search size={15} style={{ position: 'absolute', left: 11, top: 11, color: 'var(--muted)' }} />
            <input className="input" style={{ paddingLeft: 33, height: 40 }} placeholder="Enter a seed keyword, e.g. indoor planters"
              value={seed} onChange={(e) => setSeed(e.target.value)} />
          </div>
          <select className="input" style={{ width: 160, height: 40 }} value={intent} onChange={(e) => setIntent(e.target.value as any)}>
            <option value="all">All intents</option>
            <option value="Commercial">Commercial</option>
            <option value="Transactional">Transactional</option>
            <option value="Informational">Informational</option>
          </select>
          <button className="btn" style={{ height: 40 }} onClick={getLive} disabled={liveBusy}>
            {liveBusy ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Radio size={15} />}
            {liveBusy ? 'Checking…' : 'Live ideas'}
          </button>
          <div className="row gap8" style={{ minWidth: 200 }}>
            <span className="tiny muted">Max KD</span>
            <input type="range" min={0} max={100} value={maxKd} onChange={(e) => setMaxKd(+e.target.value)} style={{ flex: 1, accentColor: '#6d5efc' }} />
            <span className="num sm" style={{ width: 26 }}>{maxKd}</span>
          </div>
        </div>
      </Card>

      <div className="grid g4" style={{ marginBottom: 14 }}>
        <Kpi label="Keyword ideas" value={fmtNum(rows.length)} sub="matching your filters" />
        <Kpi label="Total monthly volume" value={fmtCompact(totalVol)} sub="combined search demand" />
        <Kpi label="Average difficulty" value={String(avgKd)} sub={avgKd < 40 ? 'reachable for you' : 'needs authority'} />
        <Kpi label="Clusters found" value={String(clusters.length)} sub="topic groups" />
      </div>

      {(liveErr || liveRows) && (
        <Card style={{ marginBottom: 14, borderColor: liveErr ? 'rgba(251,191,36,.3)' : 'rgba(52,211,153,.3)' }}>
          <CardHead
            title={liveErr ? 'Live check unavailable' : 'Live ideas — verified against real search results'}
            sub={liveErr ? undefined : liveNote || undefined}
            right={<Badge tone={liveErr ? 'warn' : 'pos'}>{liveErr ? 'Degraded' : `${liveRows?.length || 0} verified`}</Badge>}
          />
          {liveErr ? (
            <div className="card-pad sm dim">{liveErr}</div>
          ) : (
            <div className="tbl-scroll" style={{ maxHeight: '38vh' }}>
              <table className="tbl">
                <thead><tr><th className="r">#</th><th>Keyword</th><th className="r">Results</th><th className="r">Competition</th><th className="r">Top domains</th></tr></thead>
                <tbody>
                  {liveRows!.map((r) => (
                    <tr key={r.keyword}>
                      <td className="r num muted">{r.rank}</td>
                      <td className="sm">{r.keyword}</td>
                      <td className="r num muted">{r.results}</td>
                      <td className="r"><Badge tone={r.competition > 60 ? 'neg' : r.competition > 30 ? 'warn' : 'pos'}>{r.competition}%</Badge></td>
                      <td className="r tiny muted truncate" style={{ maxWidth: 260 }}>{r.topDomains.join(', ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      <div className="grid g-2-1">
        <Card>
          <CardHead title="Keyword ideas" sub={`${rows.length} keywords · volume, difficulty, CPC and intent`}
            right={<Segmented value={intent} onChange={setIntent} options={[{ v: 'all', label: 'All' }, { v: 'Transactional', label: 'Buy' }, { v: 'Informational', label: 'Info' }]} />} />
          <div className="tbl-scroll" style={{ maxHeight: '56vh' }}>
            <table className="tbl">
              <thead><tr><th>Keyword</th><th className="r">Volume</th><th className="r">KD</th><th className="r">CPC</th><th className="r">Trend</th><th>Intent</th><th className="r"></th></tr></thead>
              <tbody>
                {rows.slice(0, 100).map((k) => (
                  <tr key={k.keyword}>
                    <td><div className="sm truncate" style={{ maxWidth: 280 }}>{k.keyword}</div><div className="tiny muted">{k.cluster}</div></td>
                    <td className="r num">{fmtCompact(k.volume)}</td>
                    <td className="r"><Badge tone={kdTone(k.difficulty)}>{k.difficulty}</Badge></td>
                    <td className="r num muted">{fmtINR(k.cpc)}</td>
                    <td className="r">
                      <span className={`delta ${k.trend > 8 ? 'up' : k.trend < -8 ? 'down' : 'flat'}`} style={{ fontSize: 12 }}>
                        {k.trend > 0 ? <TrendingUp size={12} /> : k.trend < 0 ? <TrendingDown size={12} /> : null}{Math.abs(k.trend).toFixed(0)}%
                      </span>
                    </td>
                    <td><span className="badge">{k.intent}</span></td>
                    <td className="r">
                      <button className="btn btn-ghost btn-sm" onClick={() => onSave(k)} title="Save keyword">
                        <Bookmark size={14} fill={saved.includes(k.keyword) ? 'currentColor' : 'none'} color={saved.includes(k.keyword) ? 'var(--accent)' : undefined} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="col gap14">
          <Card>
            <CardHead title="Demand by cluster" sub="Monthly volume" />
            <div className="card-pad"><BarsH rows={clusters.map(([label, value]) => ({ label, value }))} fmt={(v) => fmtCompact(v)} /></div>
          </Card>
          <Card>
            <CardHead title="Quick wins" sub="Low difficulty, real volume" />
            <div className="card-pad col gap10">
              {rows.filter((r) => r.difficulty < 35 && r.volume > 500).slice(0, 6).map((k) => (
                <div key={k.keyword} className="between">
                  <span className="sm truncate" style={{ maxWidth: 180 }}>{k.keyword}</span>
                  <span className="row gap8"><span className="tiny muted num">{fmtCompact(k.volume)}</span><Badge tone="pos">KD {k.difficulty}</Badge></span>
                </div>
              ))}
              {rows.filter((r) => r.difficulty < 35 && r.volume > 500).length === 0 && <Empty title="No quick wins in this slice" sub="Loosen the difficulty filter." />}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}

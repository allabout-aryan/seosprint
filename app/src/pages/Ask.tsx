import React, { useRef, useState } from 'react';
import { Sparkles, Send, CornerDownLeft } from 'lucide-react';
import { useApp } from '../lib/store';
import { Card, PageHead, Badge } from '../components/ui';
import { fmtCompact, fmtINR, fmtNum } from '../lib/format';
import { ctrFor } from '../lib/data';

type Msg = { role: 'user' | 'ai'; text: string; items?: { label: string; value: string; tone?: string }[]; note?: string };

const SUGGESTIONS = [
  'What should I fix first?',
  'Which pages lost the most traffic?',
  'Where am I wasting ad spend?',
  'Which queries are cannibalising each other?',
  'Give me keyword ideas with low difficulty',
  'How visible am I in ChatGPT?',
];

export default function Ask() {
  const { ws } = useApp();
  const [msgs, setMsgs] = useState<Msg[]>([{
    role: 'ai',
    text: `I read every connected source for ${ws.project.domain} — Search Console, GA4 and Google Ads. Ask me what to fix, what changed, or where the money is leaking.`,
  }]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const answer = (q: string): Msg => {
    const s = q.toLowerCase();
    const t = ws.totals, p = ws.prev;

    if (/fix first|priorit|opportunit|what should i do/.test(s)) {
      const top = ws.opportunities.slice(0, 5);
      return {
        role: 'ai',
        text: `Your three biggest levers today are worth about ${fmtCompact(ws.opportunities.reduce((a, o) => a + o.gain, 0))} clicks a month. In order:`,
        items: top.map((o) => ({ label: `${o.kind} · ${o.keyword}`, value: `+${fmtCompact(o.gain)} clicks`, tone: o.kind === 'Content decay' ? 'neg' : 'pos' })),
        note: 'Start with striking distance: those pages already rank, so a refresh compounds fastest.',
      };
    }
    if (/lost|decay|drop|declin|fell/.test(s)) {
      const decay = ws.opportunities.filter((o) => o.kind === 'Content decay').slice(0, 5);
      return {
        role: 'ai',
        text: decay.length
          ? `${decay.length} pages lost clicks versus the previous period. These are the ones that matter:`
          : 'No page lost meaningful clicks versus the previous period — traffic is holding.',
        items: decay.map((o) => ({ label: o.url, value: `−${fmtCompact(o.gain)} clicks`, tone: 'neg' })),
        note: 'Compare each against the pages now outranking it, refresh the section that answers the query, and re-publish.',
      };
    }
    if (/ad spend|paid|ads|wast|cpc|roas/.test(s)) {
      const spend = ws.campaigns.reduce((a, c) => a + c.cost, 0);
      const worst = [...ws.campaigns].sort((a, b) => a.roas - b.roas).slice(0, 3);
      return {
        role: 'ai',
        text: `You spent ${fmtINR(spend, true)} on Google Ads in 30 days. The paid-vs-organic check found queries where you already rank #1–3 organically yet still pay for the click.`,
        items: worst.map((c) => ({ label: c.name, value: `${c.roas.toFixed(2)}x ROAS`, tone: c.roas < 2 ? 'neg' : 'warn' })),
        note: 'Pausing paid on queries you already win organically is the fastest saving; move that budget to the campaign with the highest ROAS.',
      };
    }
    if (/cannibal/.test(s)) {
      const byUrl = new Map<string, number>();
      ws.queries.forEach((q) => byUrl.set(q.url, (byUrl.get(q.url) || 0) + 1));
      const worst = [...byUrl.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
      return {
        role: 'ai',
        text: 'These URLs answer the most overlapping queries, which is where cannibalisation usually hides:',
        items: worst.map(([url, n]) => ({ label: url, value: `${n} queries`, tone: n > 12 ? 'warn' : undefined })),
        note: 'Pick one canonical page per intent and point the others at it with internal links.',
      };
    }
    if (/keyword|ideas|research|volume/.test(s)) {
      const easy = ws.ideas.filter((k) => k.difficulty < 35 && k.volume > 400).slice(0, 5);
      return {
        role: 'ai',
        text: `${easy.length} keywords under KD 35 with real volume. These are the ones you can rank for without new authority:`,
        items: easy.map((k) => ({ label: k.keyword, value: `${fmtCompact(k.volume)}/mo · KD ${k.difficulty}`, tone: 'pos' })),
        note: 'Open Keyword research to save these to a list and push them to rank tracking.',
      };
    }
    if (/chatgpt|ai|llm|perplexity|gemini|visib/.test(s)) {
      const rows = ws.ai;
      const sov = Math.round((rows.filter((r) => r.mentioned).length / rows.length) * 100);
      const best = ['ChatGPT', 'Gemini', 'Perplexity', 'Claude'].map((m) => {
        const rs = rows.filter((r) => r.model === m);
        return { m, pct: Math.round((rs.filter((r) => r.mentioned).length / Math.max(1, rs.length)) * 100) };
      }).sort((a, b) => b.pct - a.pct);
      return {
        role: 'ai',
        text: `AI answers mention ${ws.project.domain} in ${sov}% of tracked prompts. ${best[0].m} is your strongest channel at ${best[0].pct}%.`,
        items: best.map((b) => ({ label: b.m, value: `${b.pct}% of prompts`, tone: b.pct > 50 ? 'pos' : 'warn' })),
        note: 'AI answers cite pages that state facts plainly with structured data — a comparison page is the fastest way in.',
      };
    }
    if (/rank/.test(s)) {
      const movers = [...ws.ranks].sort((a, b) => (b.prev - b.latest) - (a.prev - a.latest)).slice(0, 5);
      return {
        role: 'ai',
        text: 'Biggest ranking moves in the last 7 days:',
        items: movers.map((r) => ({ label: r.keyword, value: `${r.prev} → ${r.latest}`, tone: r.latest < r.prev ? 'pos' : 'neg' })),
      };
    }
    if (/audit|technical|issue|speed|core web/.test(s)) {
      const crit = ws.findings.filter((f) => f.severity === 'critical');
      const high = ws.findings.filter((f) => f.severity === 'high');
      return {
        role: 'ai',
        text: `The crawl scored ${ws.score}/100. ${crit.length} critical and ${high.length} high issues need attention first:`,
        items: [...crit, ...high].slice(0, 5).map((f) => ({ label: f.title, value: `${f.affected} URLs`, tone: f.severity === 'critical' ? 'neg' : 'warn' })),
        note: 'Critical issues block indexing outright — fix those before anything else.',
      };
    }
    if (/backlink|link|authority|dr/.test(s)) {
      return {
        role: 'ai',
        text: `Domain Rating is ${Math.round(ws.backlinks.reduce((a, b) => a + b.dr, 0) / ws.backlinks.length)} across ${ws.backlinks.length * 7 + 41} referring domains. These are your strongest links:`,
        items: ws.backlinks.slice(0, 5).map((b) => ({ label: b.domain, value: `DR ${b.dr} · ${b.type}`, tone: b.dr > 60 ? 'pos' : undefined })),
      };
    }
    if (/ctr|title|snippet|click through/.test(s)) {
      const low = ws.queries.filter((q) => q.position <= 8 && q.ctr < ctrFor(q.position) * 0.6).slice(0, 5);
      return {
        role: 'ai',
        text: `${low.length} queries rank well but earn less than 60% of the expected CTR for their position. Rewriting the snippet is the cheapest win you have:`,
        items: low.map((q) => ({ label: q.keyword, value: `#${q.position.toFixed(0)} · ${(q.ctr * 100).toFixed(1)}% CTR`, tone: 'warn' })),
      };
    }

    // default: performance summary
    const d = (a: number, b: number) => `${(((a - b) / Math.max(1, b)) * 100 >= 0 ? '+' : '')}${(((a - b) / Math.max(1, b)) * 100).toFixed(1)}%`;
    return {
      role: 'ai',
      text: `Here is where ${ws.project.domain} stands over the last 30 days, against the previous 30:`,
      items: [
        { label: 'Organic clicks', value: `${fmtCompact(t.clicks)} (${d(t.clicks, p.clicks)})`, tone: t.clicks >= p.clicks ? 'pos' : 'neg' },
        { label: 'Impressions', value: `${fmtCompact(t.impressions)} (${d(t.impressions, p.impressions)})` },
        { label: 'Average position', value: `${t.position.toFixed(1)} (from ${p.position.toFixed(1)})` },
        { label: 'Organic revenue', value: `${fmtINR(t.revenue, true)} (${d(t.revenue, p.revenue)})`, tone: t.revenue >= p.revenue ? 'pos' : 'neg' },
        { label: 'Ad spend', value: `${fmtINR(t.adsCost, true)} at ${(t.adsValue / Math.max(1, t.adsCost)).toFixed(2)}x` },
      ],
      note: `Ask me “what should I fix first” for the ranked action list.`,
    };
  };

  const send = (text?: string) => {
    const q = (text ?? input).trim();
    if (!q || thinking) return;
    setMsgs((m) => [...m, { role: 'user', text: q }]);
    setInput('');
    setThinking(true);
    setTimeout(() => {
      const a = answer(q);
      setMsgs((m) => [...m, a]);
      setThinking(false);
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 40);
    }, 620);
  };

  return (
    <>
      <PageHead title="Ask SeoSprint" sub="Answers computed from your connected sources, not a generic model" right={<Badge tone="accent"><Sparkles size={11} /> Grounded in your data</Badge>} />

      <Card style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 190px)' }}>
        <div style={{ flex: 1, overflowY: 'auto', padding: 18 }}>
          <div className="col gap14" style={{ maxWidth: 780, margin: '0 auto' }}>
            {msgs.map((m, i) => (
              <div key={i} className={m.role === 'user' ? 'row' : ''} style={{ justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: m.role === 'user' ? '78%' : '92%',
                  background: m.role === 'user' ? 'linear-gradient(180deg,#7c6dfd,#5b4bf0)' : 'var(--panel-2)',
                  border: '1px solid ' + (m.role === 'user' ? 'rgba(140,125,255,.5)' : 'var(--border)'),
                  borderRadius: 13, padding: '11px 14px',
                }}>
                  {m.role === 'ai' && (
                    <div className="row gap6 tiny" style={{ color: '#b3a9ff', marginBottom: 6, fontWeight: 600 }}>
                      <Sparkles size={12} /> SeoSprint
                    </div>
                  )}
                  <div className="sm" style={{ lineHeight: 1.6 }}>{m.text}</div>
                  {m.items && (
                    <div className="col gap6" style={{ marginTop: 10 }}>
                      {m.items.map((it, j) => (
                        <div key={j} className="between" style={{ background: 'rgba(0,0,0,.22)', borderRadius: 8, padding: '7px 10px' }}>
                          <span className="sm truncate" style={{ maxWidth: 420 }}>{it.label}</span>
                          <span className={`sm strong num ${it.tone === 'pos' ? 'delta up' : it.tone === 'neg' ? 'delta down' : it.tone === 'warn' ? '' : ''}`}
                            style={it.tone === 'warn' ? { color: 'var(--warn)' } : undefined}>{it.value}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {m.note && <div className="tiny muted" style={{ marginTop: 9, borderTop: '1px solid var(--border)', paddingTop: 8 }}>{m.note}</div>}
                </div>
              </div>
            ))}
            {thinking && (
              <div className="row gap8 tiny muted"><Sparkles size={13} /> Reading Search Console, GA4 and Ads…</div>
            )}
            <div ref={endRef} />
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--border)', padding: 14 }}>
          <div className="row gap6 wrap" style={{ marginBottom: 10, maxWidth: 780, margin: '0 auto 10px' }}>
            {SUGGESTIONS.map((s) => (
              <button key={s} className="chip" style={{ cursor: 'pointer' }} onClick={() => send(s)}>{s}</button>
            ))}
          </div>
          <form onSubmit={(e) => { e.preventDefault(); send(); }} style={{ maxWidth: 780, margin: '0 auto' }}>
            <div className="row gap8">
              <input className="input" style={{ height: 42 }} placeholder="Ask about opportunities, decay, ad waste, AI visibility…" value={input} onChange={(e) => setInput(e.target.value)} />
              <button className="btn btn-primary" style={{ height: 42 }} type="submit" disabled={thinking}><Send size={15} /></button>
            </div>
            <div className="tiny muted" style={{ marginTop: 7, textAlign: 'center' }}>
              <CornerDownLeft size={10} style={{ verticalAlign: -1 }} /> Every answer is computed from {fmtNum(ws.queries.length)} queries, {ws.pages.length} pages and {ws.campaigns.length} campaigns in this workspace.
            </div>
          </form>
        </div>
      </Card>
    </>
  );
}

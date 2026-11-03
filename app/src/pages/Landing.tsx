import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, Search, LineChart, Tags, ShieldCheck, Sparkles, Plug, Zap, Target,
  TrendingUp, Link2, Check, MessageSquare, Database, Globe, Lock, Swords,
} from 'lucide-react';
import { Logo, Card, Badge, ConnectorGlyph } from '../components/ui';
import { TrendChart, Sparkline } from '../components/charts';
import { getWorkspace, CONNECTORS, DEFAULT_PROJECT } from '../lib/data';
import { fmtCompact, fmtDate, fmtINR } from '../lib/format';
import { useApp } from '../lib/store';

export default function Landing() {
  const nav = useNavigate();
  const { enterDemo } = useApp();
  const [scrolled, setScrolled] = useState(false);
  const ws = getWorkspace(DEFAULT_PROJECT);
  const slice = ws.series.slice(-30);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', on);
    return () => window.removeEventListener('scroll', on);
  }, []);

  const go = () => { enterDemo(); nav('/app'); };

  return (
    <div className="landing">
      <nav className={`lnav ${scrolled ? 'scrolled' : ''}`}>
        <div className="lwrap row" style={{ width: '100%', padding: 0 }}>
          <Logo size={26} />
          <div className="links">
            <a href="#product">Product</a>
            <a href="#connectors">Connectors</a>
            <a href="#how">How it works</a>
            <a href="#pricing">Pricing</a>
          </div>
          <div className="row gap8" style={{ marginLeft: 'auto' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => nav('/login')}>Sign in</button>
            <button className="btn btn-primary btn-sm" onClick={go}>Start free <ArrowRight size={14} /></button>
          </div>
        </div>
      </nav>

      <header className="hero">
        <div className="lwrap">
          <span className="eyebrow"><Badge tone="accent" style={{ border: 0, background: 'transparent', padding: 0 }}><Sparkles size={12} /></Badge> No Google account, no API key, no monthly plan</span>
          <h1>Audit any site.<br /><span className="grad">Own the data.</span></h1>
          <p className="lede">
            SeoSprint runs its own crawler and reads search results itself. Point it at any URL — yours or a competitor's —
            and get a scored technical audit, a broken-link report and live rank checks. Google Search Console and GA4 are
            optional imports, never a requirement.
          </p>
          <div className="cta">
            <button className="btn btn-primary btn-lg" onClick={() => { enterDemo(); nav('/app/crawl'); }}>Run a live crawl <ArrowRight size={16} /></button>
            <button className="btn btn-lg" onClick={go}>Explore the workspace</button>
          </div>
          <div className="trust">
            <span className="row gap6"><Check size={13} color="var(--pos)" /> No credit card</span>
            <span className="row gap6"><Check size={13} color="var(--pos)" /> Works on sites you don't own</span>
            <span className="row gap6"><Check size={13} color="var(--pos)" /> Nothing to authorise</span>
          </div>

          <div className="logo-strip">
            <span className="logo-pill" style={{ borderColor: 'rgba(109,94,252,.45)', color: '#cfc9ff' }}><ConnectorGlyph glyph="C" color="#6d5efc" size={20} />SeoSprint Crawler</span>
            <span className="logo-pill" style={{ borderColor: 'rgba(34,211,238,.45)', color: '#a5f3fc' }}><ConnectorGlyph glyph="S" color="#22d3ee" size={20} />Live SERP reader</span>
            {['Search Console', 'GA4', 'Google Ads', 'Bing', 'Slack', 'BigQuery'].map((n) => (
              <span key={n} className="logo-pill">{n}</span>
            ))}
            <span className="logo-pill">optional</span>
          </div>
        </div>
      </header>

      <div className="lwrap" style={{ marginTop: 34 }}>
        <div className="preview-frame">
          <div className="preview-bar">
            <div className="dots"><i /><i /><i /></div>
            <span className="preview-url">seosprint.app/app</span>
            <span className="badge pos" style={{ marginLeft: 'auto' }}><i className="dot" />3 sources live</span>
          </div>
          <div style={{ padding: 18, background: 'linear-gradient(180deg,#0a0f1a,#070a12)' }}>
            <div className="between" style={{ marginBottom: 14 }}>
              <div>
                <div className="strong" style={{ fontSize: 16 }}>Overview</div>
                <div className="tiny muted">Last 30 days · urbanleaf.in</div>
              </div>
              <div className="row gap8">
                <span className="chip tiny">30 days</span>
                <span className="chip tiny">Ask why</span>
                <span className="chip tiny" style={{ color: '#cfc9ff', borderColor: 'rgba(109,94,252,.4)' }}>Manage sources</span>
              </div>
            </div>
            <div className="grid g4" style={{ marginBottom: 14 }}>
              {[
                ['Organic clicks', fmtCompact(ws.totals.clicks), '+12.4%', '#34d399', slice.map((d) => d.clicks)],
                ['Impressions', fmtCompact(ws.totals.impressions), '+8.1%', '#22d3ee', slice.map((d) => d.impressions)],
                ['Avg position', ws.totals.position.toFixed(1), '+0.4', '#6d5efc', slice.map((d) => d.impressions / d.clicks)],
                ['Organic revenue', fmtINR(ws.totals.revenue, true), '+15.2%', '#a78bfa', slice.map((d) => d.revenue)],
              ].map(([l, v, d, c, sp]: any) => (
                <div key={l} className="card kpi" style={{ padding: '12px 13px' }}>
                  <div className="label" style={{ fontSize: 11 }}>{l}</div>
                  <div className="value num" style={{ fontSize: 20, marginTop: 3 }}>{v}</div>
                  <div className="foot" style={{ marginTop: 4 }}>
                    <span className="delta up" style={{ fontSize: 11 }}><ArrowRight size={10} style={{ transform: 'rotate(-45deg)' }} />{d}</span>
                  </div>
                  <div className="spark"><Sparkline values={sp} color={c} width={80} height={28} /></div>
                </div>
              ))}
            </div>
            <div className="grid g-2-1">
              <div className="card">
                <div className="card-head"><h3>Clicks and impressions</h3><span className="sub">Search Console, daily</span></div>
                <div style={{ padding: '10px 8px 0' }}>
                  <TrendChart labels={slice.map((d) => fmtDate(d.date))} height={170}
                    series={[
                      { label: 'Clicks', color: '#34d399', values: slice.map((d) => d.clicks) },
                      { label: 'Impressions', color: '#22d3ee', values: slice.map((d) => d.impressions) },
                    ]} fmt={fmtCompact} />
                </div>
              </div>
              <div className="card">
                <div className="card-head"><h3>What to fix first</h3><span className="sub">+{fmtCompact(ws.opportunities.reduce((s, o) => s + o.gain, 0))} clicks</span></div>
                <div>
                  {ws.opportunities.slice(0, 4).map((o, i) => (
                    <div key={i} style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,.045)' }}>
                      <div className="between" style={{ marginBottom: 2 }}>
                        <span className="tiny truncate" style={{ maxWidth: 150, fontWeight: 600 }}>{o.keyword}</span>
                        <span className={`badge ${o.kind === 'Content decay' ? 'neg' : 'accent'}`} style={{ fontSize: 9.5, padding: '1px 6px' }}>{o.kind.split(' ')[0]}</span>
                      </div>
                      <div className="between tiny muted"><span className="truncate" style={{ maxWidth: 130 }}>{o.url}</span><span style={{ color: 'var(--pos)' }}>+{fmtCompact(o.gain)}</span></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <section className="section" id="product">
        <div className="lwrap">
          <div className="section-head">
            <h2>One workspace instead of five tabs</h2>
            <p>Every screen answers a question an SEO actually asks on a Monday morning — and every number traces back to a source you connected.</p>
          </div>
          <div className="grid g3">
            {[
              [ShieldCheck, 'Our own crawler', 'Fetches the page itself, parses the head, headings, images, links and JSON-LD, then scores it across 23 checks. No Google property needed.'],
              [Globe, 'Whole-site crawl', 'Reads robots.txt and sitemap.xml, crawls up to 25 URLs, and groups issues by how many pages they affect — worst first.'],
              [Swords, 'Competitor compare', 'Crawl your page and up to three rivals side by side, and see the H2 topics they cover that you do not.'],
              [Search, 'Live SERP checks', 'Reads public result pages directly for a real top 20 and your actual position — with an honest error when a provider is rate-limited.'],
              [Link2, 'Broken link report', 'Every link on the page is fetched and reported with its status code, so dead ends stop costing you crawl budget.'],
              [Sparkles, 'AI visibility', 'Tracks your prompts across ChatGPT, Gemini, Perplexity and AI Overviews — mentions, citations and share of voice.'],
            ].map(([Icon, t, d]: any) => (
              <Card key={t} className="feat">
                <span className="ico"><Icon size={18} /></span>
                <h3>{t}</h3>
                <p>{d}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="section" id="connectors" style={{ paddingTop: 20 }}>
        <div className="lwrap">
          <div className="section-head">
            <h2>Connect what you already pay for</h2>
            <p>Read-only scopes, synced on a schedule, stored in your own Postgres. SeoSprint is the layer that makes them agree with each other.</p>
          </div>
          <div className="grid g4">
            {CONNECTORS.slice(0, 8).map((c) => (
              <Card key={c.id} className="card-pad row gap10">
                <ConnectorGlyph glyph={c.glyph} color={c.color} />
                <span style={{ minWidth: 0 }}>
                  <div className="sm strong truncate">{c.name}</div>
                  <div className="tiny muted truncate">{c.powers.slice(0, 2).join(' · ')}</div>
                </span>
              </Card>
            ))}
          </div>
          <div className="row gap8" style={{ justifyContent: 'center', marginTop: 20 }}>
            <Badge tone="accent"><Plug size={11} /> 13 connectors</Badge>
            <Badge><Database size={11} /> Supabase Postgres</Badge>
            <Badge><Lock size={11} /> RLS on every table</Badge>
            <Badge><Globe size={11} /> ap-south-1, Mumbai</Badge>
          </div>
        </div>
      </section>

      <section className="section" id="how" style={{ paddingTop: 20 }}>
        <div className="lwrap">
          <div className="section-head"><h2>Three steps, ten minutes</h2></div>
          <div className="grid g3">
            {[
              ['01', 'Paste a URL', 'Yours, a competitor’s, or a prospect’s. No verification, no DNS record, no OAuth screen — the crawler just fetches it.'],
              ['02', 'Read the report', 'A score out of 100, every finding explained with why it matters and how to fix it, plus a broken-link list.'],
              ['03', 'Fix and re-run', 'Ship the change, crawl again, watch the score move. Add Google Search Console later if you want query-level data.'],
            ].map(([n, t, d]) => (
              <Card key={n} className="card-pad col gap10">
                <span className="mono" style={{ color: 'var(--accent)', fontSize: 13, fontWeight: 600 }}>{n}</span>
                <h3 style={{ fontSize: 16 }}>{t}</h3>
                <p className="muted sm" style={{ lineHeight: 1.6 }}>{d}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 10 }}>
        <div className="lwrap">
          <div className="grid g4" style={{ textAlign: 'center' }}>
            {[['13', 'connectors'], ['59', 'audit checks'], ['24', 'MCP tools'], ['6h', 'sync cadence']].map(([n, l]) => (
              <div key={l}>
                <div className="num" style={{ fontSize: 34, fontWeight: 780, letterSpacing: '-.03em', background: 'linear-gradient(180deg,#e9edf7,#8b95ad)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>{n}</div>
                <div className="tiny muted" style={{ textTransform: 'uppercase', letterSpacing: '.08em' }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section" id="pricing" style={{ paddingTop: 20 }}>
        <div className="lwrap">
          <div className="section-head"><h2>Priced per workspace, not per seat</h2><p>Every plan includes all connectors. Cancel any time.</p></div>
          <div className="grid g3">
            {[
              ['Starter', '₹0', 'For one site and one person.', ['1 property', 'Search Console + GA4', 'Opportunity engine', 'Weekly audit'], false],
              ['Growth', '₹4,900', 'For teams that ship content weekly.', ['10 properties', 'All 13 connectors', 'Rank tracking + AI visibility', 'Ask SeoSprint', 'API & MCP access'], true],
              ['Scale', '₹14,900', 'For agencies and in-house teams.', ['Unlimited properties', 'BigQuery + Looker Studio', 'White-label reports', 'SSO & audit log', 'Priority sync'], false],
            ].map(([name, price, blurb, feats, hot]: any) => (
              <Card key={name} className={`price ${hot ? 'hot' : ''}`}>
                <div className="between">
                  <h3 style={{ fontSize: 16 }}>{name}</h3>
                  {hot && <Badge tone="accent">Most popular</Badge>}
                </div>
                <div className="amt">{price}<span> /month</span></div>
                <p className="muted sm">{blurb}</p>
                <ul>
                  {feats.map((f: string) => <li key={f}><Check size={14} color="var(--pos)" style={{ flex: 'none', marginTop: 3 }} />{f}</li>)}
                </ul>
                <button className={`btn ${hot ? 'btn-primary' : ''}`} style={{ marginTop: 'auto' }} onClick={go}>
                  {name === 'Starter' ? 'Start free' : 'Start 14-day trial'}
                </button>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 10 }}>
        <div className="lwrap">
          <Card style={{ padding: 40, textAlign: 'center', background: 'radial-gradient(ellipse at 50% 0%, rgba(109,94,252,.18), transparent 60%)' }}>
            <h2 style={{ fontSize: 30, fontWeight: 780, letterSpacing: '-.03em' }}>Crawl something right now.</h2>
            <p className="dim" style={{ marginTop: 10, maxWidth: 540, margin: '10px auto 0' }}>The crawler is already running on Supabase. Drop in any URL and you get a real report in a couple of seconds — nothing to connect, nothing to authorise.</p>
            <div className="row gap8" style={{ justifyContent: 'center', marginTop: 22 }}>
              <button className="btn btn-primary btn-lg" onClick={() => { enterDemo(); nav('/app/crawl'); }}>Run a live crawl <ArrowRight size={16} /></button>
            </div>
          </Card>
        </div>
      </section>

      <footer className="lfoot">
        <div className="lwrap between wrap gap16">
          <div className="row gap10"><Logo size={20} /><span>© 2026 SeoSprint</span></div>
          <div className="row gap16">
            <a href="#product">Product</a><a href="#connectors">Connectors</a><a href="#pricing">Pricing</a>
            <span className="row gap6"><MessageSquare size={12} /> Built on Supabase · deployed on Netlify &amp; GitHub</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

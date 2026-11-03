import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Search, LineChart, Tags, TrendingUp, ShieldCheck, Link2, Sparkles,
  Plug, Settings as Cog, MessageSquare, ChevronDown, RefreshCw, Bell, LogOut, Check, Menu, X, Swords,
} from 'lucide-react';
import { useApp } from '../lib/store';
import { projects } from '../lib/data';
import { Logo, Modal, ConnectorGlyph } from './ui';

const NAV = [
  { group: 'Workspace', items: [
    { to: '/app', label: 'Overview', icon: LayoutDashboard, end: true },
    { to: '/app/ask', label: 'Ask SeoSprint', icon: MessageSquare, badge: 'AI' },
  ]},
  { group: 'Live crawl', items: [
    { to: '/app/crawl', label: 'Site crawl', icon: ShieldCheck },
    { to: '/app/compare', label: 'Compare', icon: Swords },
    { to: '/app/serp', label: 'SERP & ranks', icon: Search },
    { to: '/app/keywords', label: 'Keywords', icon: Tags },
  ]},
  { group: 'Optional imports', items: [
    { to: '/app/search-console', label: 'Search Console', icon: Search },
    { to: '/app/analytics', label: 'GA4', icon: LineChart },
    { to: '/app/ads', label: 'Google Ads', icon: Tags },
  ]},
  { group: 'Growth', items: [
    { to: '/app/ai', label: 'AI visibility', icon: Sparkles },
    { to: '/app/backlinks', label: 'Backlinks', icon: Link2 },
  ]},
  { group: 'Setup', items: [
    { to: '/app/connectors', label: 'Connectors', icon: Plug },
    { to: '/app/settings', label: 'Settings', icon: Cog },
  ]},
];

export default function Shell() {
  const { ws, projectId, setProjectId, connectors, user, demo, signOut, sync, syncing, toast } = useApp();
  const [projOpen, setProjOpen] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [q, setQ] = useState('');
  const nav = useNavigate();
  const loc = useLocation();
  const connected = connectors.filter((c) => c.status === 'connected').length;
  const issue = connectors.filter((c) => c.status === 'error').length;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim()) nav(`/app/keywords?q=${encodeURIComponent(q.trim())}`);
  };

  const syncAll = async () => {
    for (const c of connectors.filter((x) => x.status === 'connected').slice(0, 3)) await sync(c.id);
    toast('All Google sources are up to date');
  };

  return (
    <div className="shell">
      <aside className="sidebar" style={mobileNav ? { display: 'flex', position: 'fixed', inset: '0 auto 0 0', width: 260, zIndex: 60 } : undefined}>
        <div className="sb-brand">
          <Logo size={24} />
          <span style={{ marginLeft: 'auto' }}>
            <button className="btn btn-ghost btn-sm" style={{ display: mobileNav ? 'inline-flex' : 'none' }} onClick={() => setMobileNav(false)}><X size={15} /></button>
          </span>
        </div>

        <button className="sb-proj" onClick={() => setProjOpen(true)}>
          <ConnectorGlyph glyph={ws.project.domain.slice(0, 1).toUpperCase()} color="#6d5efc" size={28} />
          <span style={{ minWidth: 0 }}>
            <div className="sm strong truncate">{ws.project.domain}</div>
            <div className="tiny muted truncate">{ws.project.name}</div>
          </span>
          <ChevronDown size={14} style={{ marginLeft: 'auto', color: 'var(--muted)' }} />
        </button>

        {NAV.map((g) => (
          <div key={g.group}>
            <div className="sb-group">{g.group}</div>
            {g.items.map((it) => (
              <NavLink key={it.to} to={it.to} end={(it as any).end} onClick={() => setMobileNav(false)}
                className={({ isActive }) => `nav-item ${isActive ? 'on' : ''}`}>
                <it.icon size={16} strokeWidth={2} />
                <span className="lbl">{it.label}</span>
                {(it as any).badge && <span className="badge accent" style={{ padding: '1px 6px', fontSize: 10 }}>{(it as any).badge}</span>}
                {it.to === '/app/connectors' && <span className="count">{connected}</span>}
              </NavLink>
            ))}
          </div>
        ))}

        <div className="sb-foot">
          <div className="row gap8" style={{ padding: '6px 8px' }}>
            <span className="avatar">{user ? user.slice(0, 2).toUpperCase() : demo ? 'DM' : 'AK'}</span>
            <span style={{ minWidth: 0 }}>
              <div className="sm truncate" style={{ fontWeight: 600 }}>{user || (demo ? 'Demo workspace' : 'Aryan Malhotra')}</div>
              <div className="tiny muted truncate">{demo ? 'No sign-in required' : 'Owner'}</div>
            </span>
            <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }} title="Sign out" onClick={async () => { await signOut(); nav('/'); }}><LogOut size={14} /></button>
          </div>
        </div>
      </aside>

      <div className="main">
        <div className="topbar">
          <button className="btn btn-ghost btn-sm" style={{ display: 'inline-flex' }} onClick={() => setMobileNav(true)} aria-label="Menu"><Menu size={16} /></button>
          <form onSubmit={submit} style={{ maxWidth: 420, flex: 1 }}>
            <div style={{ position: 'relative' }}>
              <Search size={15} style={{ position: 'absolute', left: 11, top: 11, color: 'var(--muted)' }} />
              <input className="input" style={{ paddingLeft: 33 }} placeholder="Search keywords, pages, queries…"
                value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
          </form>
          <div className="row gap8" style={{ marginLeft: 'auto' }}>
            <button className="btn btn-sm" onClick={syncAll} disabled={!!syncing}>
              <RefreshCw size={14} className={syncing ? 'spin' : ''} style={{ animation: syncing ? 'spin 1s linear infinite' : undefined }} />
              Sync
            </button>
            <button className="btn btn-ghost btn-sm" title={issue ? `${issue} connector needs attention` : 'All connectors healthy'}>
              <Bell size={16} />
              {issue > 0 && <i className="dot" style={{ background: 'var(--neg)', marginLeft: -2 }} />}
            </button>
            <div className="row gap8" style={{ paddingLeft: 10, borderLeft: '1px solid var(--border)' }}>
              <span className="badge accent"><i className="dot" />Crawler live</span>
              <span className="badge pos"><i className="dot" />{connected} sources</span>
            </div>
          </div>
        </div>

        <div className="content" key={loc.pathname}>
          <Outlet />
        </div>
      </div>

      <Modal open={projOpen} onClose={() => setProjOpen(false)} title="Switch property">
        <div className="col gap8">
          {projects.map((p) => (
            <button key={p.id} className="card card-pad between" style={{ cursor: 'pointer', textAlign: 'left', width: '100%', borderColor: p.id === projectId ? 'rgba(109,94,252,.5)' : undefined }}
              onClick={() => { setProjectId(p.id); setProjOpen(false); }}>
              <span className="row gap12">
                <ConnectorGlyph glyph={p.domain.slice(0, 1).toUpperCase()} color="#6d5efc" />
                <span>
                  <div className="strong sm">{p.domain}</div>
                  <div className="tiny muted">{p.name} · {p.vertical}</div>
                </span>
              </span>
              {p.id === projectId && <Check size={16} color="var(--accent)" />}
            </button>
          ))}
          <button className="btn" style={{ marginTop: 4 }} onClick={() => { setProjOpen(false); nav('/app/connectors'); }}>
            + Connect a new property
          </button>
        </div>
      </Modal>
    </div>
  );
}

import React, { useState } from 'react';
import { Plug, RefreshCw, Link2Off, ExternalLink, ShieldCheck, ArrowRight, KeyRound, CheckCircle2, Info } from 'lucide-react';
import { useApp } from '../lib/store';
import { Card, CardHead, PageHead, Badge, StatusBadge, ConnectorGlyph, Modal } from '../components/ui';
import { fmtCompact } from '../lib/format';
import { oauthUrl, liveOAuth } from '../lib/connectors';
import { supabaseEnabled, SUPABASE_HOST } from '../lib/supabase';

export default function Connectors() {
  const { connectors, connect, disconnect, sync, syncing, toast } = useApp();
  const [active, setActive] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const c = connectors.find((x) => x.id === active);
  const groups = ['Google', 'Search', 'Performance', 'AI', 'Delivery', 'Warehouse', 'Data', 'Developer'];

  const start = async () => {
    if (!c) return;
    if (liveOAuth && ['gsc', 'ga4', 'gads', 'gbp'].includes(c.id)) {
      window.location.href = oauthUrl(c.id);
      return;
    }
    setBusy(true);
    await connect(c.id);
    setBusy(false);
    setActive(null);
  };

  const connected = connectors.filter((x) => x.status === 'connected').length;

  return (
    <>
      <PageHead title="Connectors"
        sub={<>{connected} of {connectors.length} sources connected · data refreshes on the cadence shown</>}
        right={<button className="btn btn-primary btn-sm" onClick={() => setActive('gsc')}><Plug size={14} /> Add a source</button>} />

      <Card style={{ marginBottom: 14, borderColor: liveOAuth ? 'rgba(52,211,153,.3)' : 'rgba(251,191,36,.28)', background: liveOAuth ? 'rgba(52,211,153,.06)' : 'rgba(251,191,36,.06)' }}>
        <div className="card-pad row gap12 wrap">
          <span style={{ width: 32, height: 32, borderRadius: 9, display: 'grid', placeItems: 'center', background: liveOAuth ? 'rgba(52,211,153,.15)' : 'rgba(251,191,36,.15)', color: liveOAuth ? 'var(--pos)' : 'var(--warn)' }}>
            {liveOAuth ? <CheckCircle2 size={17} /> : <KeyRound size={17} />}
          </span>
          <div style={{ flex: 1, minWidth: 260 }}>
            <div className="strong sm">{liveOAuth ? 'Live OAuth is configured — Connect opens Google’s real consent screen.' : 'Connectors run in simulated consent mode in this build.'}</div>
            <div className="tiny muted">
              {liveOAuth
                ? 'Tokens are stored per workspace and read GSC, GA4 and Ads with read-only scopes.'
                : 'Clicking Connect mirrors the real OAuth flow and writes the connection to Supabase. To switch to live Google data, set VITE_GOOGLE_CLIENT_ID with a Google Cloud OAuth client that has the webmasters.readonly, analytics.readonly and adwords scopes.'}
            </div>
          </div>
          <Badge tone={liveOAuth ? 'pos' : 'warn'}>{liveOAuth ? 'Live' : 'Simulated'}</Badge>
        </div>
      </Card>

      {groups.map((g) => {
        const items = connectors.filter((x) => x.category === g);
        if (!items.length) return null;
        return (
          <div key={g} style={{ marginBottom: 20 }}>
            <div className="row gap8" style={{ marginBottom: 10 }}>
              <span className="tiny" style={{ textTransform: 'uppercase', letterSpacing: '.09em', color: 'var(--muted)', fontWeight: 650 }}>{g}</span>
              <span className="tiny muted">· {items.length}</span>
            </div>
            <div className="grid g3">
              {items.map((x) => (
                <Card key={x.id} className="card-pad col gap12" style={{ height: '100%' }}>
                  <div className="between">
                    <span className="row gap10" style={{ minWidth: 0 }}>
                      <ConnectorGlyph glyph={x.glyph} color={x.color} />
                      <span style={{ minWidth: 0 }}>
                        <div className="sm strong truncate">{x.name}</div>
                        <div className="tiny muted truncate">{x.account || x.desc.split('.')[0]}</div>
                      </span>
                    </span>
                    <StatusBadge status={x.status} />
                  </div>

                  <div className="tiny muted" style={{ lineHeight: 1.55, minHeight: 34 }}>{x.desc}</div>

                  <div className="row gap6 wrap">
                    {x.powers.slice(0, 3).map((p) => <span key={p} className="chip tiny">{p}</span>)}
                  </div>

                  <div className="between" style={{ marginTop: 'auto', paddingTop: 4, borderTop: '1px solid var(--border)' }}>
                    <span className="tiny muted">
                      {x.status === 'connected'
                        ? <>{x.records !== undefined ? fmtCompact(x.records) + ' rows · ' : ''}{x.lastSync}</>
                        : <>{x.cadence}</>}
                    </span>
                    <span className="row gap6">
                      {x.status === 'connected' ? (
                        <>
                          <button className="btn btn-ghost btn-sm" title="Sync now" onClick={() => sync(x.id)} disabled={syncing === x.id}>
                            <RefreshCw size={13} style={{ animation: syncing === x.id ? 'spin 1s linear infinite' : undefined }} />
                          </button>
                          <button className="btn btn-ghost btn-sm" title="Disconnect" onClick={() => disconnect(x.id)}><Link2Off size={13} /></button>
                        </>
                      ) : x.status === 'error' ? (
                        <button className="btn btn-sm" onClick={() => setActive(x.id)}>Re-authorise</button>
                      ) : (
                        <button className="btn btn-sm" onClick={() => setActive(x.id)}>Connect <ArrowRight size={13} /></button>
                      )}
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        );
      })}

      <Card>
        <CardHead title="How data moves" sub="Every source lands in Postgres, then fans out to the product and your agent" />
        <div className="card-pad grid g3 gap16">
          {[
            ['1 · Pull', 'SeoSprint syncs each source on its cadence using read-only scopes. Search Console and GA4 are incremental; Ads is a full refresh of the last 30 days.'],
            ['2 · Normalise', 'Queries, pages, sessions, campaigns and conversions are mapped into one schema in Supabase Postgres, keyed by workspace and date.'],
            ['3 · Decide', 'The opportunity engine scores every query, page and campaign, then serves the same model to the dashboard, the REST API and the MCP server.'],
          ].map(([t, d]) => (
            <div key={t}>
              <div className="sm strong" style={{ marginBottom: 4 }}>{t}</div>
              <div className="tiny muted" style={{ lineHeight: 1.6 }}>{d}</div>
            </div>
          ))}
        </div>
        <div className="card-pad row gap8 wrap" style={{ borderTop: '1px solid var(--border)' }}>
          <ShieldCheck size={15} color="var(--pos)" />
          <span className="tiny muted">
            Read-only scopes only. Tokens are encrypted at rest in Supabase{supabaseEnabled ? ` (project ${SUPABASE_HOST})` : ''} and never leave your workspace.
          </span>
          <a className="tiny" href="https://developers.google.com/search/docs" target="_blank" rel="noreferrer" style={{ marginLeft: 'auto', color: 'var(--accent-2)' }}>Scope reference <ExternalLink size={11} style={{ verticalAlign: -1 }} /></a>
        </div>
      </Card>

      <Modal open={!!c} onClose={() => setActive(null)} title={c ? `Connect ${c.name}` : ''}
        footer={<><button className="btn btn-sm" onClick={() => setActive(null)}>Cancel</button>
          <button className="btn btn-primary btn-sm" onClick={start} disabled={busy}>
            {busy ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Plug size={14} />}
            {busy ? 'Authorising…' : liveOAuth && ['gsc', 'ga4', 'gads', 'gbp'].includes(c?.id || '') ? 'Continue with Google' : 'Authorise and sync'}
          </button></>}>
        {c && (
          <div className="col gap16">
            <div className="row gap12">
              <ConnectorGlyph glyph={c.glyph} color={c.color} size={40} />
              <div>
                <div className="strong">{c.name}</div>
                <div className="tiny muted">{c.desc}</div>
              </div>
            </div>

            <div>
              <div className="tiny muted" style={{ marginBottom: 6 }}>Scopes requested</div>
              <div className="col gap6">
                {c.scopes.map((s) => (
                  <div key={s} className="row gap8 tiny"><ShieldCheck size={13} color="var(--pos)" /><span className="mono">{s}</span></div>
                ))}
              </div>
            </div>

            <div>
              <div className="tiny muted" style={{ marginBottom: 6 }}>This unlocks</div>
              <div className="row gap6 wrap">{c.powers.map((p) => <span key={p} className="chip tiny">{p}</span>)}</div>
            </div>

            {!liveOAuth && (
              <div className="row gap8 tiny" style={{ color: 'var(--warn)', background: 'var(--warn-soft)', border: '1px solid rgba(251,191,36,.25)', padding: '9px 11px', borderRadius: 9 }}>
                <Info size={14} style={{ flex: 'none' }} />
                <span>Simulated consent: this records a real connection in Supabase and turns the source on, but reads sample rows. Add VITE_GOOGLE_CLIENT_ID to read live Google data.</span>
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}

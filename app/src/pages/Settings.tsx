import React, { useState } from 'react';
import { Copy, Check, Users, Database, KeyRound, Globe, Trash2, ExternalLink } from 'lucide-react';
import { useApp } from '../lib/store';
import { Card, CardHead, PageHead, Badge } from '../components/ui';
import { supabaseEnabled, SUPABASE_HOST } from '../lib/supabase';
import { projects } from '../lib/data';

export default function Settings() {
  const { ws, projectId, setProjectId, toast, user, demo } = useApp();
  const [copied, setCopied] = useState<string | null>(null);
  const copy = (k: string, v: string) => { navigator.clipboard?.writeText(v); setCopied(k); toast('Copied to clipboard'); setTimeout(() => setCopied(null), 1500); };

  const apiBase = 'https://' + (supabaseEnabled ? `${SUPABASE_HOST}.supabase.co/functions/v1/seosprint` : 'api.seosprint.app');
  const mcp = 'https://' + (supabaseEnabled ? `${SUPABASE_HOST}.supabase.co/functions/v1/mcp` : 'api.seosprint.app/mcp');

  return (
    <>
      <PageHead title="Settings" sub="Workspace, team, API access and data residency" />

      <div className="grid g-2-1">
        <div className="col gap14">
          <Card>
            <CardHead title="Workspace" sub="Shown across every report" />
            <div className="card-pad col gap12">
              <div className="grid g2 gap12">
                <div><label className="tiny muted">Workspace name</label><input className="input" defaultValue={ws.project.name} style={{ marginTop: 5 }} /></div>
                <div><label className="tiny muted">Primary domain</label><input className="input" defaultValue={ws.project.domain} style={{ marginTop: 5 }} /></div>
                <div><label className="tiny muted">Country</label><select className="input" defaultValue={ws.project.country} style={{ marginTop: 5 }}><option>{ws.project.country}</option><option>United States</option><option>United Kingdom</option></select></div>
                <div><label className="tiny muted">Reporting timezone</label><select className="input" defaultValue="Asia/Kolkata (IST)" style={{ marginTop: 5 }}><option>Asia/Kolkata (IST)</option><option>UTC</option><option>America/New_York</option></select></div>
              </div>
              <div className="row gap8" style={{ marginTop: 4 }}>
                <button className="btn btn-primary btn-sm" onClick={() => toast('Workspace saved')}>Save changes</button>
                <button className="btn btn-sm" onClick={() => toast('Changes discarded', 'info')}>Cancel</button>
              </div>
            </div>
          </Card>

          <Card>
            <CardHead title="Properties" sub="Each property has its own sources, keywords and audits" right={<button className="btn btn-sm">Add property</button>} />
            <div>
              {projects.map((p) => (
                <div key={p.id} className="between" style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,.045)' }}>
                  <span className="row gap10">
                    <Globe size={15} style={{ color: 'var(--muted)' }} />
                    <span>
                      <div className="sm strong">{p.domain}</div>
                      <div className="tiny muted">{p.name} · {p.vertical}</div>
                    </span>
                  </span>
                  <span className="row gap8">
                    {p.id === projectId && <Badge tone="pos">Active</Badge>}
                    <button className="btn btn-ghost btn-sm" onClick={() => setProjectId(p.id)}>Open</button>
                  </span>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHead title="Team" sub="3 seats on the Growth plan" right={<button className="btn btn-sm"><Users size={13} /> Invite</button>} />
            <div>
              {[
                [user || 'aryan@urbanleaf.in', 'Owner', 'AK'],
                ['priya@urbanleaf.in', 'Editor', 'PR'],
                ['content@urbanleaf.in', 'Viewer', 'CO'],
              ].map(([email, role, ini]) => (
                <div key={email as string} className="between" style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,.045)' }}>
                  <span className="row gap10"><span className="avatar">{ini as string}</span><span><div className="sm">{email}</div><div className="tiny muted">{role}</div></span></span>
                  <span className="badge">{role}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="col gap14">
          <Card>
            <CardHead title="API & MCP" sub="Same model, agent-ready" right={<KeyRound size={15} style={{ color: 'var(--muted)' }} />} />
            <div className="card-pad col gap12">
              <div>
                <div className="tiny muted" style={{ marginBottom: 5 }}>REST base URL</div>
                <div className="row gap6">
                  <input className="input mono tiny" readOnly value={apiBase} />
                  <button className="btn btn-sm" onClick={() => copy('api', apiBase)}>{copied === 'api' ? <Check size={13} /> : <Copy size={13} />}</button>
                </div>
              </div>
              <div>
                <div className="tiny muted" style={{ marginBottom: 5 }}>MCP server</div>
                <div className="row gap6">
                  <input className="input mono tiny" readOnly value={mcp} />
                  <button className="btn btn-sm" onClick={() => copy('mcp', mcp)}>{copied === 'mcp' ? <Check size={13} /> : <Copy size={13} />}</button>
                </div>
              </div>
              <div>
                <div className="tiny muted" style={{ marginBottom: 5 }}>API key</div>
                <div className="row gap6">
                  <input className="input mono tiny" readOnly value="sk_live_••••••••••••••••7f2a" />
                  <button className="btn btn-sm" onClick={() => copy('key', 'sk_live_rotated')}>{copied === 'key' ? <Check size={13} /> : <Copy size={13} />}</button>
                </div>
              </div>
              <div className="tiny muted">Agents get 24 tools over MCP: search console queries, opportunities, rank checks, audits and keyword ideas — every paid call takes a max-cost guard.</div>
            </div>
          </Card>

          <Card>
            <CardHead title="Data & residency" sub="Where your rows live" right={<Database size={15} style={{ color: 'var(--muted)' }} />} />
            <div className="card-pad col gap10">
              <div className="between"><span className="sm">Database</span><Badge tone={supabaseEnabled ? 'pos' : 'warn'}>{supabaseEnabled ? 'Supabase · ap-south-1' : 'Local demo'}</Badge></div>
              <div className="between"><span className="sm">Row-level security</span><Badge tone="pos">Enforced</Badge></div>
              <div className="between"><span className="sm">Auth</span><Badge tone={supabaseEnabled ? 'pos' : 'warn'}>{supabaseEnabled ? 'Supabase Auth' : 'Demo session'}</Badge></div>
              <div className="between"><span className="sm">Region</span><span className="sm muted">Mumbai, India</span></div>
              <div className="between"><span className="sm">Backups</span><span className="sm muted">Daily, 7-day retention</span></div>
              <a className="tiny row gap4" href="https://supabase.com" target="_blank" rel="noreferrer" style={{ color: 'var(--accent-2)' }}>Open project <ExternalLink size={11} /></a>
            </div>
          </Card>

          <Card style={{ borderColor: 'rgba(251,113,133,.25)' }}>
            <CardHead title="Danger zone" sub="Irreversible actions" />
            <div className="card-pad col gap10">
              <button className="btn btn-danger btn-sm" onClick={() => toast('This is a demo workspace — nothing was deleted', 'info')}><Trash2 size={13} /> Delete workspace</button>
              <div className="tiny muted">Removes every property, source, keyword and audit permanently.</div>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}

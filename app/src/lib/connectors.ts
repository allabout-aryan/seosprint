/* Connector runtime.
   In this build, Google connectors run in "simulated consent" mode unless
   VITE_GOOGLE_CLIENT_ID is present — in which case the same UI opens the real
   Google OAuth consent screen and the token is exchanged for live GSC/GA4/Ads
   reads. State is mirrored to Supabase when configured. */

import { CONNECTORS, type Connector } from './data';
import { loadIntegrations, upsertIntegration, deleteIntegration, supabaseEnabled } from './supabase';

export type ConnState = Connector & { connectedAt?: string; progress?: number };

const LS_KEY = 'seosprint.connectors.v1';

export const GOOGLE_SCOPES: Record<string, string> = {
  gsc: 'https://www.googleapis.com/auth/webmasters.readonly',
  ga4: 'https://www.googleapis.com/auth/analytics.readonly',
  gads: 'https://www.googleapis.com/auth/adwords',
  gbp: 'https://www.googleapis.com/auth/business.manage',
};

export const clientId = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID as string | undefined;
export const liveOAuth = Boolean(clientId);

export function oauthUrl(provider: string) {
  const scope = GOOGLE_SCOPES[provider] || '';
  const redirect = window.location.origin + window.location.pathname;
  const params = new URLSearchParams({
    client_id: clientId || 'YOUR_GOOGLE_CLIENT_ID',
    redirect_uri: redirect,
    response_type: 'code',
    scope: `openid email ${scope}`.trim(),
    access_type: 'offline',
    include_granted_scopes: 'true',
    prompt: 'consent',
    state: provider,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export function loadConnectors(workspace: string): ConnState[] {
  try {
    const raw = localStorage.getItem(LS_KEY + ':' + workspace);
    if (!raw) return CONNECTORS.map((c) => ({ ...c }));
    const saved = JSON.parse(raw) as Record<string, Partial<ConnState>>;
    return CONNECTORS.map((c) => ({ ...c, ...(saved[c.id] || {}) }));
  } catch { return CONNECTORS.map((c) => ({ ...c })); }
}

export function persistConnectors(workspace: string, list: ConnState[]) {
  try {
    const map: Record<string, any> = {};
    list.forEach((c) => { map[c.id] = { status: c.status, account: c.account, lastSync: c.lastSync, records: c.records, connectedAt: c.connectedAt }; });
    localStorage.setItem(LS_KEY + ':' + workspace, JSON.stringify(map));
  } catch { /* noop */ }
  if (supabaseEnabled) {
    list.forEach((c) => {
      if (c.status === 'connected' || c.status === 'error') {
        upsertIntegration({
          workspace, provider: c.id, status: c.status, account_label: c.account,
          scopes: c.scopes, records: c.records, last_sync_at: new Date().toISOString(),
        });
      }
    });
  }
}

export async function hydrateFromSupabase(workspace: string): Promise<ConnState[] | null> {
  const rows = await loadIntegrations(workspace);
  if (!rows || !rows.length) return null;
  return CONNECTORS.map((c) => {
    const row = rows.find((r) => r.provider === c.id);
    return row ? { ...c, status: row.status as any, account: row.account_label, records: row.records, lastSync: 'synced from Supabase' } : { ...c };
  });
}

export async function disconnect(workspace: string, provider: string) {
  await deleteIntegration(workspace, provider);
}

/* Record counts a real sync would land per provider */
export const RECORD_TARGETS: Record<string, number> = {
  gsc: 128402, ga4: 96210, gads: 24180, gbp: 4120, bing: 18420,
  pagespeed: 1840, slack: 0, bigquery: 402118, looker: 0, openai: 0,
  github: 1, netlify: 1, supabase: 9,
};

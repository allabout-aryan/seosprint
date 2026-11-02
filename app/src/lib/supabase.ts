import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = (import.meta as any).env?.VITE_SUPABASE_URL as string | undefined;
const key = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabaseEnabled = Boolean(url && key);
export const supabase: SupabaseClient | null = supabaseEnabled
  ? createClient(url as string, key as string, { auth: { persistSession: true, autoRefreshToken: true } })
  : null;

export const SUPABASE_HOST = url ? url.replace('https://', '').split('.')[0] : 'local';

/* ---------- auth ---------- */
export async function signInWithPassword(email: string, password: string) {
  if (!supabase) return { error: { message: 'Supabase is not configured in this build — use the demo workspace.' } };
  return supabase.auth.signInWithPassword({ email, password });
}
export async function signUpWithPassword(email: string, password: string) {
  if (!supabase) return { error: { message: 'Supabase is not configured in this build — use the demo workspace.' } };
  return supabase.auth.signUp({ email, password });
}
export async function signInWithOtp(email: string) {
  if (!supabase) return { error: { message: 'Supabase is not configured in this build — use the demo workspace.' } };
  return supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
}
export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
}
export async function currentSession() {
  if (!supabase) return null;
  try { const { data } = await supabase.auth.getSession(); return data.session; } catch { return null; }
}

/* ---------- persistence (best-effort, never throws) ---------- */
export type IntegrationRow = {
  provider: string; status: string; account_label?: string; scopes?: string[];
  records?: number; last_sync_at?: string; workspace: string;
};

export async function loadIntegrations(workspace: string): Promise<IntegrationRow[] | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.from('integrations').select('*').eq('workspace', workspace);
    if (error) return null;
    return (data || []) as IntegrationRow[];
  } catch { return null; }
}

export async function upsertIntegration(row: IntegrationRow) {
  if (!supabase) return { ok: false };
  try {
    const { error } = await supabase.from('integrations').upsert(row, { onConflict: 'workspace,provider' });
    return { ok: !error, error };
  } catch (e: any) { return { ok: false, error: e }; }
}

export async function deleteIntegration(workspace: string, provider: string) {
  if (!supabase) return { ok: false };
  try {
    const { error } = await supabase.from('integrations').delete().eq('workspace', workspace).eq('provider', provider);
    return { ok: !error };
  } catch { return { ok: false }; }
}

export async function saveEvent(workspace: string, kind: string, payload: any) {
  if (!supabase) return;
  try { await supabase.from('events').insert({ workspace, kind, payload }); } catch { /* noop */ }
}

export async function saveKeyword(workspace: string, keyword: string, volume: number, difficulty: number, intent: string) {
  if (!supabase) return { ok: false };
  try {
    const { error } = await supabase.from('saved_keywords').upsert({ workspace, keyword, volume, difficulty, intent }, { onConflict: 'workspace,keyword' });
    return { ok: !error };
  } catch { return { ok: false }; }
}

export async function listSavedKeywords(workspace: string) {
  if (!supabase) return [];
  try {
    const { data } = await supabase.from('saved_keywords').select('*').eq('workspace', workspace).order('created_at', { ascending: false });
    return data || [];
  } catch { return []; }
}

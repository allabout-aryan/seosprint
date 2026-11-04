import { supabase, supabaseEnabled, withTimeout } from './supabase';

export type ReportKind = 'audit' | 'site' | 'compare' | 'serp';

export type Report = {
  id: string;
  kind: ReportKind;
  url: string | null;
  score: number | null;
  title: string | null;
  payload: any;
  created_at: string;
};

const ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789';

export function newReportId(len = 10) {
  const bytes = new Uint8Array(len);
  const c: any = (globalThis as any).crypto;
  if (c?.getRandomValues) c.getRandomValues(bytes);
  else for (let i = 0; i < len; i++) bytes[i] = Math.floor(Math.random() * 256);
  let out = '';
  for (let i = 0; i < len; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

export function shareUrl(id: string) {
  const { origin, pathname } = window.location;
  return `${origin}${pathname}#/r/${id}`;
}

/** Persist a report so anyone with the link can open it. Returns the public id. */
export async function saveReport(
  kind: ReportKind,
  payload: any,
  meta: { url?: string | null; score?: number | null; title?: string | null } = {},
): Promise<string | null> {
  const id = newReportId();
  if (!supabase || !supabaseEnabled) return null;
  try {
    const { error } = await withTimeout(
      supabase.from('reports').insert({
        id,
        kind,
        url: meta.url ?? null,
        score: meta.score ?? null,
        title: meta.title ?? null,
        payload,
      }),
      12000,
    );
    return error ? null : id;
  } catch {
    return null;
  }
}

export async function loadReport(id: string): Promise<Report | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await withTimeout(
      supabase.from('reports').select('*').eq('id', id).maybeSingle(),
      12000,
    );
    if (error || !data) return null;
    return data as Report;
  } catch {
    return null;
  }
}

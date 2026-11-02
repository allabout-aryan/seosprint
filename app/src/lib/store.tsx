import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { getWorkspace, DEFAULT_PROJECT, type Workspace } from './data';
import { loadConnectors, persistConnectors, hydrateFromSupabase, disconnect as sbDisconnect, RECORD_TARGETS, type ConnState } from './connectors';
import { currentSession, signOut as sbSignOut, supabaseEnabled } from './supabase';

type Toast = { id: number; msg: string; kind?: 'ok' | 'err' | 'info' };
type Ctx = {
  projectId: string; setProjectId: (id: string) => void; ws: Workspace;
  connectors: ConnState[]; connect: (id: string) => Promise<void>; disconnect: (id: string) => Promise<void>;
  sync: (id: string) => Promise<void>; syncing: string | null;
  toasts: Toast[]; toast: (msg: string, kind?: Toast['kind']) => void;
  user: string | null; demo: boolean; enterDemo: () => void; signOut: () => Promise<void>;
  supabaseEnabled: boolean;
};

const AppCtx = createContext<Ctx | null>(null);
export const useApp = () => {
  const c = useContext(AppCtx);
  if (!c) throw new Error('useApp outside provider');
  return c;
};

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [projectId, setProjectId] = useState<string>(() => localStorage.getItem('seosprint.project') || DEFAULT_PROJECT);
  const [connectors, setConnectors] = useState<ConnState[]>(() => loadConnectors(projectId));
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [user, setUser] = useState<string | null>(() => localStorage.getItem('seosprint.user'));
  const [demo, setDemo] = useState<boolean>(() => localStorage.getItem('seosprint.demo') === '1');

  const ws = useMemo(() => getWorkspace(projectId), [projectId]);

  useEffect(() => {
    localStorage.setItem('seosprint.project', projectId);
    setConnectors(loadConnectors(projectId));
    (async () => {
      const hydrated = await hydrateFromSupabase(projectId);
      if (hydrated) setConnectors(hydrated);
    })();
  }, [projectId]);

  useEffect(() => {
    (async () => {
      const s = await currentSession();
      if (s?.user?.email) { setUser(s.user.email); localStorage.setItem('seosprint.user', s.user.email); }
    })();
  }, []);

  const toast = useCallback((msg: string, kind: Toast['kind'] = 'ok') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  }, []);

  const sync = useCallback(async (id: string) => {
    setSyncing(id);
    setConnectors((cs) => cs.map((c) => (c.id === id ? { ...c, status: 'syncing' } : c)));
    await new Promise((r) => setTimeout(r, 1400));
    setConnectors((cs) => {
      const next = cs.map((c) => c.id === id
        ? { ...c, status: 'connected' as const, records: RECORD_TARGETS[id] ?? c.records, lastSync: 'just now' }
        : c);
      persistConnectors(projectId, next);
      return next;
    });
    setSyncing(null);
    toast(`${id.toUpperCase()} synced`);
  }, [projectId, toast]);

  const connect = useCallback(async (id: string) => {
    setConnectors((cs) => cs.map((c) => (c.id === id ? { ...c, status: 'syncing' } : c)));
    await new Promise((r) => setTimeout(r, 1200));
    setConnectors((cs) => {
      const next = cs.map((c) => c.id === id
        ? { ...c, status: 'connected' as const, connectedAt: new Date().toISOString(), lastSync: 'just now', records: RECORD_TARGETS[id] ?? 0 }
        : c);
      persistConnectors(projectId, next);
      return next;
    });
    toast(`${id.toUpperCase()} connected`);
  }, [projectId, toast]);

  const disconnect = useCallback(async (id: string) => {
    setConnectors((cs) => {
      const next = cs.map((c) => (c.id === id ? { ...c, status: 'available' as const, records: undefined, lastSync: undefined, account: undefined } : c));
      persistConnectors(projectId, next);
      return next;
    });
    await sbDisconnect(projectId, id);
    toast(`${id.toUpperCase()} disconnected`, 'info');
  }, [projectId, toast]);

  const enterDemo = useCallback(() => {
    localStorage.setItem('seosprint.demo', '1');
    setDemo(true);
  }, []);

  const signOut = useCallback(async () => {
    await sbSignOut();
    localStorage.removeItem('seosprint.user');
    localStorage.removeItem('seosprint.demo');
    setUser(null); setDemo(false);
  }, []);

  return (
    <AppCtx.Provider value={{
      projectId, setProjectId, ws, connectors, connect, disconnect, sync, syncing,
      toasts, toast, user, demo, enterDemo, signOut, supabaseEnabled,
    }}>
      {children}
    </AppCtx.Provider>
  );
}

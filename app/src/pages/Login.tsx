import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Check, Mail, Lock, Sparkles } from 'lucide-react';
import { Logo, Card, Badge } from '../components/ui';
import { signInWithPassword, signUpWithPassword, signInWithOtp, supabaseEnabled } from '../lib/supabase';
import { useApp } from '../lib/store';

export default function Login() {
  const nav = useNavigate();
  const { enterDemo } = useApp();
  const [mode, setMode] = useState<'signin' | 'signup' | 'magic'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null); setMsg(null); setBusy(true);
    try {
      if (mode === 'magic') {
        const { error } = await signInWithOtp(email);
        if (error) setErr(error.message); else setMsg('Check your inbox for a sign-in link.');
      } else if (mode === 'signup') {
        const { error } = await signUpWithPassword(email, password);
        if (error) setErr(error.message);
        else { setMsg('Account created. Check your email to confirm, then sign in.'); setMode('signin'); }
      } else {
        const { error } = await signInWithPassword(email, password);
        if (error) setErr(error.message);
        else { localStorage.setItem('seosprint.user', email); nav('/app'); }
      }
    } catch (e: any) { setErr(e?.message || 'Something went wrong'); }
    setBusy(false);
  };

  const demo = () => { enterDemo(); nav('/app'); };

  return (
    <div className="auth-wrap">
      <div className="auth-side">
        <Logo size={28} />
        <h1 style={{ fontSize: 34, fontWeight: 780, letterSpacing: '-.03em', marginTop: 34, maxWidth: 420, lineHeight: 1.15 }}>
          The SEO workspace that reads your Google data for you.
        </h1>
        <p className="dim" style={{ marginTop: 16, maxWidth: 400, fontSize: 15, lineHeight: 1.65 }}>
          Connect Search Console, GA4 and Google Ads once. SeoSprint joins them into one ranked list of what to fix, on which page, and what it is worth.
        </p>
        <div className="col gap10" style={{ marginTop: 26 }}>
          {['Read-only Google scopes', 'Opportunity engine on every query', 'Revenue joined to pages', 'Agent-ready API and MCP'].map((f) => (
            <span key={f} className="row gap8 sm" style={{ color: 'var(--text-2)' }}><Check size={15} color="var(--pos)" />{f}</span>
          ))}
        </div>
        <div className="row gap8" style={{ marginTop: 30 }}>
          <Badge tone="pos"><i className="dot" />{supabaseEnabled ? 'Supabase connected' : 'Demo mode'}</Badge>
          <Badge>ap-south-1</Badge>
        </div>
      </div>

      <div className="auth-form">
        <div className="row gap8" style={{ marginBottom: 22 }}>
          <button className={`btn btn-sm ${mode === 'signin' ? 'btn-primary' : ''}`} onClick={() => setMode('signin')}>Sign in</button>
          <button className={`btn btn-sm ${mode === 'signup' ? 'btn-primary' : ''}`} onClick={() => setMode('signup')}>Create account</button>
          <button className={`btn btn-sm ${mode === 'magic' ? 'btn-primary' : ''}`} onClick={() => setMode('magic')}>Magic link</button>
        </div>

        <h2 style={{ fontSize: 24, fontWeight: 720 }}>{mode === 'signup' ? 'Create your workspace' : mode === 'magic' ? 'Sign in with email' : 'Welcome back'}</h2>
        <p className="muted sm" style={{ marginTop: 6, marginBottom: 22 }}>
          {mode === 'signup' ? 'Free forever for one property. No card.' : 'Your data and connections stay in your own Supabase project.'}
        </p>

        <form onSubmit={submit} className="col gap12">
          <div>
            <label className="tiny muted">Work email</label>
            <div style={{ position: 'relative', marginTop: 5 }}>
              <Mail size={15} style={{ position: 'absolute', left: 11, top: 11, color: 'var(--muted)' }} />
              <input className="input" style={{ paddingLeft: 33, height: 42 }} type="email" required placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>
          {mode !== 'magic' && (
            <div>
              <label className="tiny muted">Password</label>
              <div style={{ position: 'relative', marginTop: 5 }}>
                <Lock size={15} style={{ position: 'absolute', left: 11, top: 11, color: 'var(--muted)' }} />
                <input className="input" style={{ paddingLeft: 33, height: 42 }} type="password" required minLength={6} placeholder="At least 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
            </div>
          )}

          {err && <div className="tiny" style={{ color: 'var(--neg)', background: 'var(--neg-soft)', border: '1px solid rgba(251,113,133,.25)', padding: '8px 10px', borderRadius: 8 }}>{err}</div>}
          {msg && <div className="tiny" style={{ color: 'var(--pos)', background: 'var(--pos-soft)', border: '1px solid rgba(52,211,153,.25)', padding: '8px 10px', borderRadius: 8 }}>{msg}</div>}

          <button className="btn btn-primary" style={{ height: 42 }} type="submit" disabled={busy}>
            {busy ? 'Working…' : mode === 'signup' ? 'Create account' : mode === 'magic' ? 'Email me a link' : 'Sign in'} <ArrowRight size={15} />
          </button>
        </form>

        <div className="row gap10" style={{ margin: '20px 0', color: 'var(--muted)', fontSize: 12 }}>
          <span style={{ flex: 1, height: 1, background: 'var(--border)' }} /> or <span style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        </div>

        <button className="btn" style={{ height: 42 }} onClick={demo}><Sparkles size={15} /> Explore the demo workspace</button>
        <p className="tiny muted" style={{ marginTop: 14, textAlign: 'center' }}>
          The demo is fully seeded — no account, no Google access needed.
        </p>
      </div>
    </div>
  );
}

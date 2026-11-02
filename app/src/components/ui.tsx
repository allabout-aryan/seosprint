import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus, X, Check, AlertTriangle, Info } from 'lucide-react';
import { deltaDir, fmtDelta } from '../lib/format';
import { useApp } from '../lib/store';

export function Logo({ size = 26, showText = true }: { size?: number; showText?: boolean }) {
  return (
    <span className="row gap8" style={{ gap: 9 }}>
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
        <defs>
          <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#8a7cff" /><stop offset="100%" stopColor="#5b4bf0" />
          </linearGradient>
        </defs>
        <rect width="32" height="32" rx="8" fill="url(#lg)" />
        <path d="M8.5 21.5l5.2-6.4 3.6 4.1L23.5 10" stroke="#fff" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="23.5" cy="10" r="2.4" fill="#22d3ee" stroke="#0b1020" strokeWidth="1.2" />
      </svg>
      {showText && <span style={{ fontWeight: 750, fontSize: size * 0.62, letterSpacing: '-.03em' }}>SeoSprint</span>}
    </span>
  );
}

export function Card({ children, className = '', style, onClick }: { children: React.ReactNode; className?: string; style?: React.CSSProperties; onClick?: () => void }) {
  return <div className={`card ${className}`} style={style} onClick={onClick}>{children}</div>;
}

export function CardHead({ title, sub, right }: { title: React.ReactNode; sub?: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="card-head">
      <div>
        <h3>{title}</h3>
        {sub && <div className="sub">{sub}</div>}
      </div>
      {right}
    </div>
  );
}

export function Delta({ value, invert = false, suffix = '' }: { value: number; invert?: boolean; suffix?: string }) {
  const dir = deltaDir(value, invert);
  const Icon = dir === 'up' ? ArrowUpRight : dir === 'down' ? ArrowDownRight : Minus;
  return (
    <span className={`delta ${dir}`}>
      <Icon size={13} strokeWidth={2.6} />
      {fmtDelta(value)}{suffix}
    </span>
  );
}

export function Kpi({ label, value, delta, invert, sub, spark }: { label: string; value: React.ReactNode; delta?: number; invert?: boolean; sub?: React.ReactNode; spark?: React.ReactNode }) {
  return (
    <Card className="kpi">
      <div className="label">{label}</div>
      <div className="value num">{value}</div>
      <div className="foot">
        {delta !== undefined && <Delta value={delta} invert={invert} />}
        {sub && <span className="muted tiny">{sub}</span>}
      </div>
      {spark && <div className="spark">{spark}</div>}
    </Card>
  );
}

export function Badge({ children, tone = '' }: { children: React.ReactNode; tone?: string }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, [string, string, string]> = {
    connected: ['Connected', 'pos', ''],
    syncing: ['Syncing', 'info', ''],
    error: ['Needs attention', 'neg', ''],
    available: ['Not connected', '', ''],
    current: ['Current', 'pos', ''],
  };
  const [label, tone] = map[status] || ['Unknown', ''];
  return (
    <span className={`badge ${tone}`}>
      <i className="dot" style={{ background: status === 'connected' ? 'var(--pos)' : status === 'error' ? 'var(--neg)' : status === 'syncing' ? 'var(--info)' : 'var(--muted)' }} />
      {label}
    </span>
  );
}

export function PageHead({ title, sub, right }: { title: string; sub?: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="page-head">
      <div>
        <h1>{title}</h1>
        {sub && <div className="sub">{sub}</div>}
      </div>
      {right && <div className="row gap8 wrap">{right}</div>}
    </div>
  );
}

export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { v: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="segmented">
      {options.map((o) => (
        <button key={o.v} className={value === o.v ? 'on' : ''} onClick={() => onChange(o.v)}>{o.label}</button>
      ))}
    </div>
  );
}

export function Modal({ open, onClose, title, children, footer, width = 520 }: { open: boolean; onClose: () => void; title: React.ReactNode; children: React.ReactNode; footer?: React.ReactNode; width?: number }) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: width }} onClick={(e) => e.stopPropagation()}>
        <div className="card-head">
          <h3>{title}</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>
        <div style={{ padding: 18 }}>{children}</div>
        {footer && <div className="card-head" style={{ borderTop: '1px solid var(--border)', borderBottom: 0, justifyContent: 'flex-end' }}>{footer}</div>}
      </div>
    </div>
  );
}

export function Empty({ title, sub, action }: { title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="empty">
      <div className="strong" style={{ color: 'var(--text-2)', marginBottom: 4 }}>{title}</div>
      {sub && <div className="sm">{sub}</div>}
      {action && <div style={{ marginTop: 12 }}>{action}</div>}
    </div>
  );
}

export function Toasts() {
  const { toasts } = useApp();
  return (
    <div className="toast-wrap">
      {toasts.map((t) => (
        <div className="toast" key={t.id}>
          {t.kind === 'err' ? <AlertTriangle size={15} color="var(--neg)" /> : t.kind === 'info' ? <Info size={15} color="var(--info)" /> : <Check size={15} color="var(--pos)" />}
          <span>{t.msg}</span>
        </div>
      ))}
    </div>
  );
}

export function ConnectorGlyph({ glyph, color, size = 34 }: { glyph: string; color: string; size?: number }) {
  return (
    <span style={{
      width: size, height: size, borderRadius: 9, display: 'grid', placeItems: 'center', flex: 'none',
      background: `${color}1f`, border: `1px solid ${color}45`, color, fontWeight: 750,
      fontSize: glyph.length > 2 ? size * 0.32 : size * 0.4, letterSpacing: '-.02em',
    }}>{glyph}</span>
  );
}

export function PositionPill({ pos }: { pos: number }) {
  const tone = pos <= 3 ? 'pos' : pos <= 10 ? 'info' : pos <= 20 ? 'warn' : '';
  return <span className={`badge ${tone} num`} style={{ minWidth: 44, justifyContent: 'center' }}>{pos.toFixed(1)}</span>;
}

export function CtrBar({ ctr, expected }: { ctr: number; expected: number }) {
  const ratio = Math.min(1.6, ctr / Math.max(0.0001, expected));
  const color = ratio < 0.65 ? 'var(--neg)' : ratio < 0.9 ? 'var(--warn)' : 'var(--pos)';
  return (
    <span className="row gap6">
      <span style={{ width: 46, height: 5, borderRadius: 9, background: 'rgba(255,255,255,.08)', display: 'inline-block', overflow: 'hidden' }}>
        <i style={{ display: 'block', height: '100%', width: `${Math.min(100, ratio * 62)}%`, background: color }} />
      </span>
      <span className="num sm" style={{ minWidth: 42 }}>{(ctr * 100).toFixed(1)}%</span>
    </span>
  );
}

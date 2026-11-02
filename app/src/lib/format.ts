export const fmtNum = (n: number, d = 0) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: d, minimumFractionDigits: d }).format(n);

export function fmtCompact(n: number) {
  if (n >= 1e7) return (n / 1e7).toFixed(n >= 1e8 ? 1 : 2) + 'Cr';
  if (n >= 1e5) return (n / 1e5).toFixed(n >= 1e6 ? 1 : 2) + 'L';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return String(Math.round(n));
}

export const fmtPct = (n: number, d = 1) => `${n > 0 ? '' : ''}${n.toFixed(d)}%`;

export function fmtINR(n: number, compact = false) {
  if (compact) {
    if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
    if (n >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`;
    if (n >= 1000) return `₹${(n / 1000).toFixed(1)}k`;
  }
  return `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Math.round(n))}`;
}

export const fmtDelta = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;

export function deltaDir(n: number, invert = false) {
  if (Math.abs(n) < 0.35) return 'flat';
  const up = n > 0;
  if (invert) return up ? 'down' : 'up';
  return up ? 'up' : 'down';
}

export function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

export function relTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hr ago`;
  return `${Math.round(h / 24)} d ago`;
}

export const initials = (s: string) => s.split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((x) => x[0]?.toUpperCase()).join('');

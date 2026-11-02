import React, { useRef, useState, useEffect } from 'react';

export function useSize<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [w, setW] = useState(600);
  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    const ro = new ResizeObserver(() => setW(el.clientWidth || 600));
    ro.observe(el);
    setW(el.clientWidth || 600);
    return () => ro.disconnect();
  }, []);
  return { ref, width: w };
}

type Series = { label: string; color: string; values: number[] };

export function TrendChart({
  labels, series, height = 220, fmt = (v: number) => String(Math.round(v)), area = true, yTicks = 4,
}: { labels: string[]; series: Series[]; height?: number; fmt?: (v: number) => string; area?: boolean; yTicks?: number }) {
  const { ref, width } = useSize<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const padL = 46, padR = 12, padT = 12, padB = 24;
  const w = Math.max(240, width);
  const h = height;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;
  const all = series.flatMap((s) => s.values);
  const max = Math.max(1, ...all) * 1.08;
  const min = Math.min(0, ...all);
  const n = labels.length;
  const x = (i: number) => padL + (n <= 1 ? 0 : (i / (n - 1)) * innerW);
  const y = (v: number) => padT + innerH - ((v - min) / (max - min || 1)) * innerH;

  const line = (vals: number[]) => vals.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const areaPath = (vals: number[]) => `${line(vals)} L${x(n - 1).toFixed(1)},${(padT + innerH).toFixed(1)} L${x(0).toFixed(1)},${(padT + innerH).toFixed(1)} Z`;

  const ticks = Array.from({ length: yTicks + 1 }, (_, i) => min + ((max - min) / yTicks) * i);
  const step = Math.max(1, Math.floor(n / 7));

  return (
    <div ref={ref} style={{ width: '100%', position: 'relative' }}>
      <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
          const px = ((e.clientX - rect.left) / rect.width) * w;
          const i = Math.round(((px - padL) / innerW) * (n - 1));
          setHover(Math.max(0, Math.min(n - 1, i)));
        }}>
        <defs>
          {series.map((s, si) => (
            <linearGradient key={si} id={`g${si}-${s.label.replace(/\W/g, '')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity="0.34" />
              <stop offset="100%" stopColor={s.color} stopOpacity="0.02" />
            </linearGradient>
          ))}
        </defs>
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={padL} x2={w - padR} y1={y(t)} y2={y(t)} stroke="rgba(255,255,255,.06)" strokeDasharray="2 4" />
            <text x={padL - 8} y={y(t) + 3.5} textAnchor="end" fontSize="10" fill="#7f8aa3">{fmt(t)}</text>
          </g>
        ))}
        {series.map((s, si) => (
          <g key={si}>
            {area && <path d={areaPath(s.values)} fill={`url(#g${si}-${s.label.replace(/\W/g, '')})`} />}
            <path d={line(s.values)} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          </g>
        ))}
        {labels.map((l, i) => (i % step === 0 || i === n - 1) && (
          <text key={i} x={x(i)} y={h - 6} textAnchor="middle" fontSize="10" fill="#7f8aa3">{l}</text>
        ))}
        {hover !== null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={padT} y2={padT + innerH} stroke="rgba(255,255,255,.22)" />
            {series.map((s, si) => (
              <circle key={si} cx={x(hover)} cy={y(s.values[hover])} r="3.4" fill={s.color} stroke="#070a12" strokeWidth="1.6" />
            ))}
          </g>
        )}
      </svg>
      {hover !== null && (
        <div style={{
          position: 'absolute', left: `${(x(hover) / w) * 100}%`, top: 6, transform: 'translateX(-50%)',
          background: '#0d1424', border: '1px solid rgba(255,255,255,.14)', borderRadius: 8,
          padding: '7px 10px', fontSize: 11.5, pointerEvents: 'none', whiteSpace: 'nowrap', boxShadow: '0 10px 30px -10px #000', zIndex: 5,
        }}>
          <div style={{ color: '#7f8aa3', marginBottom: 3 }}>{labels[hover]}</div>
          {series.map((s, si) => (
            <div key={si} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <i style={{ width: 7, height: 7, borderRadius: 2, background: s.color, display: 'inline-block' }} />
              <span style={{ color: '#b3bdd2' }}>{s.label}</span>
              <b style={{ marginLeft: 'auto', paddingLeft: 10 }}>{fmt(s.values[hover])}</b>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function Sparkline({ values, color = '#6d5efc', width = 110, height = 38 }: { values: number[]; color?: string; width?: number; height?: number }) {
  const max = Math.max(...values), min = Math.min(...values);
  const n = values.length;
  const x = (i: number) => (i / (n - 1)) * width;
  const y = (v: number) => height - ((v - min) / (max - min || 1)) * (height - 4) - 2;
  const d = values.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
      <path d={`${d} L${width},${height} L0,${height} Z`} fill={color} opacity="0.10" />
      <path d={d} fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export function BarsH({ rows, max, fmt = (v: number) => String(Math.round(v)) }: { rows: { label: string; value: number; color?: string }[]; max?: number; fmt?: (v: number) => string }) {
  const m = max || Math.max(1, ...rows.map((r) => r.value));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
      {rows.map((r, i) => (
        <div key={i}>
          <div className="between" style={{ marginBottom: 5 }}>
            <span className="sm truncate" style={{ color: 'var(--text-2)' }}>{r.label}</span>
            <span className="sm num strong">{fmt(r.value)}</span>
          </div>
          <div className="progress"><i style={{ width: `${Math.max(2, (r.value / m) * 100)}%`, background: r.color || 'linear-gradient(90deg,#6d5efc,#22d3ee)' }} /></div>
        </div>
      ))}
    </div>
  );
}

export function Donut({ rows, size = 150, thickness = 16, center }: { rows: { label: string; value: number; color: string }[]; size?: number; thickness?: number; center?: React.ReactNode }) {
  const total = rows.reduce((s, r) => s + r.value, 0) || 1;
  const r = size / 2 - thickness / 2;
  const c = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,.06)" strokeWidth={thickness} />
        {rows.map((row, i) => {
          const len = (row.value / total) * c;
          const el = <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={row.color} strokeWidth={thickness}
            strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-acc} strokeLinecap="butt" />;
          acc += len;
          return el;
        })}
      </svg>
      {center && <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center' }}>{center}</div>}
    </div>
  );
}

export function PositionBars({ buckets }: { buckets: { label: string; value: number; color: string }[] }) {
  const max = Math.max(1, ...buckets.map((b) => b.value));
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 130 }}>
      {buckets.map((b, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end' }}>
          <span className="tiny num" style={{ color: 'var(--text-2)' }}>{b.value}</span>
          <div style={{ width: '100%', height: `${Math.max(4, (b.value / max) * 100)}%`, background: b.color, borderRadius: '5px 5px 0 0', opacity: .9 }} />
          <span className="tiny muted">{b.label}</span>
        </div>
      ))}
    </div>
  );
}

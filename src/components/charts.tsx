import { Area, AreaChart, CartesianGrid, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { chartTooltip } from './ui'

/** Half-donut gauge like the "Total Employees" card. */
export function HalfGauge({ value, label, color = '#cfddf5', track = '#eef1ee', size = 130 }: { value: number; label?: string; color?: string; track?: string; size?: number }) {
  const r = 50
  const c = Math.PI * r
  return (
    <svg width={size} height={size * 0.62} viewBox="0 0 120 72" aria-hidden>
      <path d="M10 62 A50 50 0 0 1 110 62" fill="none" stroke={track} strokeWidth="18" />
      <path d="M10 62 A50 50 0 0 1 110 62" fill="none" stroke={color} strokeWidth="18" strokeDasharray={`${(value / 100) * c} ${c}`} />
      {label && (
        <text x="60" y="62" textAnchor="middle" className="font-display" fontSize="11" fill="#262825">
          {label}
        </text>
      )}
    </svg>
  )
}

/** Soft pastel bars with a rounded "glass" look. */
export function SoftBars({ values, highlight, height = 70, color = '#cde3c8', hi = '#9dca95' }: { values: number[]; highlight?: number; height?: number; color?: string; hi?: string }) {
  const max = Math.max(...values)
  return (
    <div className="flex items-end gap-1.5" style={{ height }}>
      {values.map((v, i) => (
        <div key={i} className="w-5 rounded-t-[8px] rounded-b-[4px] border border-white/70" style={{ height: `${(v / max) * 100}%`, background: i === highlight ? hi : color, opacity: i === highlight ? 1 : 0.75 }} />
      ))}
    </div>
  )
}

/** Hatched area chart with a single lime-tooltip line — the signature PeopleFlow chart. */
export function HatchedArea({ data, dataKey, xKey, height = 220, compare, zoom, format = (v: number) => String(v) }: { data: Record<string, number | string>[]; dataKey: string; xKey: string; height?: number; compare?: string; zoom?: boolean; format?: (v: number) => string }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 16, right: 8, left: -12, bottom: 0 }}>
        <defs>
          <pattern id="hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="7" height="7" fill="#f4f6f4" />
            <line x1="0" y1="0" x2="0" y2="7" stroke="#cdd2cd" strokeWidth="1.4" />
          </pattern>
        </defs>
        <CartesianGrid vertical={false} stroke="#edf0ed" />
        <XAxis dataKey={xKey} axisLine={false} tickLine={false} dy={8} />
        <YAxis axisLine={false} tickLine={false} tickFormatter={format} width={56} domain={zoom ? [(min: number) => Math.floor((min * 0.9) / 10) * 10, 'auto'] : undefined} />
        <Tooltip {...chartTooltip} formatter={(v: number) => format(v)} />
        {compare && <Line type="linear" dataKey={compare} stroke="#b8beb8" strokeDasharray="2 4" dot={{ r: 2.5, fill: '#b8beb8', strokeWidth: 0 }} strokeWidth={1.2} />}
        <Area type="linear" dataKey={dataKey} stroke="#9aa19a" strokeWidth={1.2} fill="url(#hatch)" dot={{ r: 2.5, fill: '#9aa19a', strokeWidth: 0 }} activeDot={{ r: 6, fill: '#ddefa8', stroke: '#262825', strokeWidth: 1.5 }} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function Sparkline({ values, color = '#d97aa0', height = 60 }: { values: number[]; color?: string; height?: number }) {
  const data = values.map((v, i) => ({ i, v }))
  const id = `spark-${color.replace('#', '')}`
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.6} fill={`url(#${id})`} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

/** Abstract hero art in the sage/lime palette, standing in for the reference's portrait. */
export function HeroArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 600 360" className={className} preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs>
        <radialGradient id="g1" cx="35%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#ddefa8" />
          <stop offset="100%" stopColor="#ddefa8" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="g2" cx="70%" cy="60%" r="55%">
          <stop offset="0%" stopColor="#cfddf5" />
          <stop offset="100%" stopColor="#cfddf5" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.2" />
        </linearGradient>
        <filter id="blur"><feGaussianBlur stdDeviation="22" /></filter>
      </defs>
      <rect width="600" height="360" fill="#eef1ee" />
      <g filter="url(#blur)" className="hero-blobs">
        <circle cx="210" cy="150" r="150" fill="url(#g1)" />
        <circle cx="420" cy="220" r="170" fill="url(#g2)" />
        <circle cx="330" cy="90" r="70" fill="#f3cfdc" opacity="0.55" />
      </g>
      <g fill="none" stroke="#262825" strokeOpacity="0.08" className="hero-rings">
        {Array.from({ length: 9 }, (_, i) => (
          <circle key={i} cx="300" cy="190" r={40 + i * 28} />
        ))}
      </g>
      <g transform="translate(300 185)">
        <g className="hero-petals">
          {[0, 60, 120, 180, 240, 300].map((r) => (
            <ellipse key={r} cx="0" cy="-58" rx="34" ry="58" transform={`rotate(${r})`} fill="url(#glass)" stroke="#ffffff" strokeOpacity="0.9" />
          ))}
        </g>
        <circle r="18" fill="#262825" />
        <circle r="7" fill="#ddefa8" />
      </g>
    </svg>
  )
}

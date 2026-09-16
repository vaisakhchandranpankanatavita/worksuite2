import clsx from 'clsx'
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ComposedChart,
  Line, Pie, PieChart, RadialBar, RadialBarChart, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { chartTooltip } from './ui'

/* ─── HalfGauge ─────────────────────────────────────────────── */
export function HalfGauge({ value, label, color = '#c8d9f4', track = '#edf0ed', size = 130 }: {
  value: number; label?: string; color?: string; track?: string; size?: number
}) {
  const r = 50
  const c = Math.PI * r
  const filled = (value / 100) * c
  return (
    <svg width={size} height={size * 0.62} viewBox="0 0 120 72" aria-hidden>
      {/* Track */}
      <path d="M10 62 A50 50 0 0 1 110 62" fill="none" stroke={track} strokeWidth="16" strokeLinecap="round" />
      {/* Filled arc with glow */}
      <path d="M10 62 A50 50 0 0 1 110 62" fill="none" stroke={color} strokeWidth="16" strokeLinecap="round"
        strokeDasharray={`${filled} ${c}`}
        style={{ filter: `drop-shadow(0 0 6px ${color}88)` }} />
      {label && (
        <text x="60" y="62" textAnchor="middle" fontSize="11" fill="#6a6f68" fontFamily="var(--font-display)">
          {label}
        </text>
      )}
    </svg>
  )
}

/* ─── SoftBars ──────────────────────────────────────────────── */
export function SoftBars({ values, highlight, height = 70, color = '#c6e0c0', hi = '#5fa059' }: {
  values: number[]; highlight?: number; height?: number; color?: string; hi?: string
}) {
  const max = Math.max(...values)
  return (
    <div className="flex items-end gap-1.5" style={{ height }}>
      {values.map((v, i) => (
        <div
          key={i}
          className="w-5 rounded-t-lg rounded-b-sm transition-all duration-300"
          style={{
            height: `${(v / max) * 100}%`,
            background: i === highlight ? hi : color,
            opacity: i === highlight ? 1 : 0.72,
            boxShadow: i === highlight ? `0 -2px 8px ${hi}55` : 'none',
          }}
        />
      ))}
    </div>
  )
}

/* ─── HatchedArea ───────────────────────────────────────────── */
export function HatchedArea({ data, dataKey, xKey, height = 220, compare, zoom, format = (v: number) => String(v) }: {
  data: Record<string, number | string>[]
  dataKey: string; xKey: string; height?: number
  compare?: string; zoom?: boolean
  format?: (v: number) => string
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 16, right: 8, left: -12, bottom: 0 }}>
        <defs>
          <pattern id="hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="7" height="7" fill="#f4f7f4" />
            <line x1="0" y1="0" x2="0" y2="7" stroke="#cdd3cc" strokeWidth="1.3" />
          </pattern>
          <linearGradient id="hatch-compare-fade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#b8beb8" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#b8beb8" stopOpacity="0" />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="#edf0ec" strokeDasharray="0" />
        <XAxis dataKey={xKey} axisLine={false} tickLine={false} dy={8} tick={{ fontSize: 11, fill: '#6a6f68' }} />
        <YAxis axisLine={false} tickLine={false} tickFormatter={format} width={56} tick={{ fontSize: 11, fill: '#6a6f68' }} domain={zoom ? [(min: number) => Math.floor((min * 0.9) / 10) * 10, 'auto'] : undefined} />
        <Tooltip {...chartTooltip} formatter={(v: number) => format(v)} />
        {compare && (
          <Area type="monotone" dataKey={compare} stroke="#b8beb8" strokeDasharray="3 4" fill="url(#hatch-compare-fade)"
            dot={{ r: 2.5, fill: '#b8beb8', strokeWidth: 0 }} strokeWidth={1.4} />
        )}
        <Area type="monotone" dataKey={dataKey} stroke="#8a9289" strokeWidth={1.6} fill="url(#hatch)"
          dot={{ r: 2.5, fill: '#8a9289', strokeWidth: 0 }}
          activeDot={{ r: 6, fill: '#d8eca0', stroke: '#1a1d1b', strokeWidth: 1.5 }} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

/* ─── Sparkline ─────────────────────────────────────────────── */
export function Sparkline({ values, color = '#cd6a96', height = 60 }: {
  values: number[]; color?: string; height?: number
}) {
  const data = values.map((v, i) => ({ i, v }))
  const id = `spark-${color.replace('#', '')}`
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.40} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="v" stroke={color} strokeWidth={2} fill={`url(#${id})`} dot={false}
          activeDot={{ r: 4, fill: color, stroke: '#fff', strokeWidth: 2 }} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

/* ─── TrendLine — thin clean line chart ────────────────────── */
export function TrendLine({ data, dataKey, xKey, color = '#aece52', height = 120, format = (v: number) => String(v) }: {
  data: Record<string, number | string>[]; dataKey: string; xKey: string
  color?: string; height?: number | string; format?: (v: number) => string
}) {
  const id = `trend-fill-${color.replace('#', '')}`
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.22} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="#edf0ec" />
        <XAxis dataKey={xKey} axisLine={false} tickLine={false} dy={6} tick={{ fontSize: 10, fill: '#6a6f68' }} />
        <YAxis axisLine={false} tickLine={false} tickFormatter={format} width={48} tick={{ fontSize: 10, fill: '#6a6f68' }} />
        <Tooltip {...chartTooltip} formatter={(v: number) => format(v)} />
        <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} fill={`url(#${id})`}
          dot={false} activeDot={{ r: 5, fill: color, stroke: '#fff', strokeWidth: 2 }} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

/* ─── GroupedBar — side-by-side bars ────────────────────────── */
export function GroupedBar({ data, keys, colors, xKey, height = 180, format = (v: number) => String(v) }: {
  data: Record<string, number | string>[]
  keys: string[]; colors: string[]; xKey: string
  height?: number | string; format?: (v: number) => string
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 4, left: -16, bottom: 0 }} barCategoryGap="28%">
        <CartesianGrid vertical={false} stroke="#edf0ec" />
        <XAxis dataKey={xKey} axisLine={false} tickLine={false} dy={6} tick={{ fontSize: 10, fill: '#6a6f68' }} />
        <YAxis axisLine={false} tickLine={false} tickFormatter={format} width={52} tick={{ fontSize: 10, fill: '#6a6f68' }} />
        <Tooltip {...chartTooltip} formatter={(v: number) => format(v)} />
        {keys.map((k, i) => (
          <Bar key={k} dataKey={k} fill={colors[i] ?? '#d8eca0'} radius={[6, 6, 2, 2]} name={k} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}

/* ─── WaterfallBar — cash flow waterfall ───────────────────── */
export function WaterfallBar({ data, height = 200, format = (v: number) => String(v) }: {
  data: { name: string; value: number; total?: number }[]
  height?: number | string; format?: (v: number) => string
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 4, left: -12, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="#edf0ec" />
        <XAxis dataKey="name" axisLine={false} tickLine={false} dy={6} tick={{ fontSize: 10, fill: '#6a6f68' }} />
        <YAxis axisLine={false} tickLine={false} tickFormatter={format} width={56} tick={{ fontSize: 10, fill: '#6a6f68' }} />
        <Tooltip {...chartTooltip} formatter={(v: number) => format(Math.abs(v))} />
        <Bar dataKey="value" radius={[6, 6, 2, 2]}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.value >= 0 ? '#5fa059' : '#cd6a96'} opacity={0.88} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

/* ─── DonutChart ────────────────────────────────────────────── */
export function DonutChart({ data, colors, innerLabel, height = 200, format = (v: number) => String(v) }: {
  data: { name: string; value: number }[]
  colors: string[]; innerLabel?: string; height?: number | string
  format?: (v: number) => string
}) {
  return (
    <div className="relative" style={{ height }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie data={data} dataKey="value" innerRadius="55%" outerRadius="80%" paddingAngle={3} cornerRadius={8} stroke="none">
            {data.map((_, i) => (
              <Cell key={i} fill={colors[i % colors.length]}
                style={{ filter: 'drop-shadow(0 2px 4px rgba(26,29,27,0.12))' }} />
            ))}
          </Pie>
          <Tooltip {...chartTooltip} formatter={(v: number) => format(v)} />
        </PieChart>
      </ResponsiveContainer>
      {innerLabel && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="font-display text-base font-semibold leading-none">{innerLabel}</p>
            <p className="mt-0.5 text-[10px] text-ash">Total</p>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── RadialProgress — single radial bar ───────────────────── */
export function RadialProgress({ value, color = '#aece52', size = 120, label }: {
  value: number; color?: string; size?: number; label?: string
}) {
  const data = [{ value, fill: color }]
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <ResponsiveContainer>
        <RadialBarChart innerRadius="72%" outerRadius="100%" data={data} startAngle={90} endAngle={-270} barSize={12}>
          <RadialBar dataKey="value" background={{ fill: '#edf0ec' }} cornerRadius={999} maxBarSize={12} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
        <div>
          <p className="font-display text-xl font-bold leading-none tabular-nums">{value}%</p>
          {label && <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-ash leading-tight">{label}</p>}
        </div>
      </div>
    </div>
  )
}

/* ─── MultiLineChart ────────────────────────────────────────── */
export function MultiLineChart({ data, lines, xKey, height = 200, format = (v: number) => String(v) }: {
  data: Record<string, number | string>[]
  lines: { key: string; color: string; dashed?: boolean }[]
  xKey: string; height?: number; format?: (v: number) => string
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="#edf0ec" />
        <XAxis dataKey={xKey} axisLine={false} tickLine={false} dy={6} tick={{ fontSize: 10, fill: '#6a6f68' }} />
        <YAxis axisLine={false} tickLine={false} tickFormatter={format} width={52} tick={{ fontSize: 10, fill: '#6a6f68' }} />
        <Tooltip {...chartTooltip} formatter={(v: number) => format(v)} />
        {lines.map((l) => (
          <Line key={l.key} type="monotone" dataKey={l.key} stroke={l.color} strokeWidth={2}
            strokeDasharray={l.dashed ? '4 3' : undefined}
            dot={false} activeDot={{ r: 5, fill: l.color, stroke: '#fff', strokeWidth: 2 }} />
        ))}
      </ComposedChart>
    </ResponsiveContainer>
  )
}

/* ─── AttendanceHeatmap (compact) ──────────────────────────── */
const DAYS_SHORT = ['M', 'T', 'W', 'T', 'F']
const COMPACT_WEEKS = 8
export function AttendanceHeatmap({ data }: { data: { week: number; day: number; value: number }[] }) {
  const max = Math.max(...data.map((d) => d.value), 1)
  const getColor = (v: number) => {
    const pct = v / max
    if (pct > 0.85) return '#5fa059'
    if (pct > 0.65) return '#aece52'
    if (pct > 0.45) return '#c0db7a'
    if (pct > 0.25) return '#f5ddb2'
    return '#f0cad8'
  }
  return (
    <div className="flex items-start gap-2">
      {/* Day labels */}
      <div className="flex flex-col gap-1 pt-0.5">
        {DAYS_SHORT.map((d, i) => (
          <span key={i} className="flex h-4 items-center text-[9px] text-ash/60 leading-none">{d}</span>
        ))}
      </div>
      {/* Grid */}
      <div className="flex flex-1 gap-1 overflow-hidden">
        {Array.from({ length: COMPACT_WEEKS }, (_, w) => (
          <div key={w} className="flex flex-1 flex-col gap-1">
            {DAYS_SHORT.map((_, d) => {
              const cell = data.find((x) => x.week === w && x.day === d)
              const v = cell?.value ?? 0
              return (
                <div
                  key={d}
                  title={`${['Mon','Tue','Wed','Thu','Fri'][d]} W${w + 1}: ${v}%`}
                  className="h-4 w-full rounded-[3px] transition-transform duration-150 hover:scale-110 cursor-default"
                  style={{ background: getColor(v), boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.35)' }}
                />
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── HeroArt ───────────────────────────────────────────────── */
export function HeroArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 600 360" className={clsx('hero-art', className)} preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs>
        <radialGradient id="h-g1" cx="32%" cy="38%" r="58%">
          <stop offset="0%" stopColor="#d8eca0" stopOpacity="1" />
          <stop offset="100%" stopColor="#d8eca0" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="h-g2" cx="72%" cy="62%" r="55%">
          <stop offset="0%" stopColor="#c8d9f4" stopOpacity="1" />
          <stop offset="100%" stopColor="#c8d9f4" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="h-g3" cx="55%" cy="25%" r="40%">
          <stop offset="0%" stopColor="#f0cad8" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#f0cad8" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="h-g4" cx="20%" cy="75%" r="35%">
          <stop offset="0%" stopColor="#c6e0c0" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#c6e0c0" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="h-glass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.92" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.22" />
        </linearGradient>
        <linearGradient id="h-glass2" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#d8eca0" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#d8eca0" stopOpacity="0.08" />
        </linearGradient>
        <filter id="h-blur"><feGaussianBlur stdDeviation="28" /></filter>
        <filter id="h-blur-sm"><feGaussianBlur stdDeviation="8" /></filter>
      </defs>

      {/* Background */}
      <rect width="600" height="360" fill="#eef2ee" />

      {/* Blobs */}
      <g filter="url(#h-blur)" className="hero-blobs">
        <circle cx="200" cy="145" r="160" fill="url(#h-g1)" />
        <circle cx="420" cy="215" r="175" fill="url(#h-g2)" />
        <circle cx="320" cy="80" r="80" fill="url(#h-g3)" />
        <circle cx="90" cy="260" r="90" fill="url(#h-g4)" />
      </g>

      {/* Orbit rings */}
      <g fill="none" stroke="#1a1d1b" strokeOpacity="0.07" className="hero-rings">
        {Array.from({ length: 10 }, (_, i) => (
          <circle key={i} cx="300" cy="190" r={36 + i * 28} strokeWidth={i === 0 ? 1.5 : 1} />
        ))}
      </g>

      {/* Orbit dots */}
      {[
        { r: 92, angle: 40, size: 7, fill: '#aece52' },
        { r: 148, angle: 165, size: 5, fill: '#6b92d8' },
        { r: 204, angle: 285, size: 6, fill: '#cd6a96' },
        { r: 120, angle: 310, size: 4, fill: '#5fa059' },
      ].map(({ r, angle, size, fill }, i) => {
        const rad = (angle * Math.PI) / 180
        const cx = 300 + r * Math.cos(rad)
        const cy = 190 + r * Math.sin(rad)
        return <circle key={i} cx={cx} cy={cy} r={size} fill={fill} opacity="0.75" filter="url(#h-blur-sm)" />
      })}

      {/* Central petal flower */}
      <g transform="translate(300 190)">
        <g className="hero-petals">
          {[0, 60, 120, 180, 240, 300].map((rot, i) => (
            <ellipse key={rot} cx="0" cy="-56" rx="32" ry="55"
              transform={`rotate(${rot})`}
              fill={i % 2 === 0 ? 'url(#h-glass)' : 'url(#h-glass2)'}
              stroke="#ffffff" strokeOpacity="0.85" strokeWidth="0.8" />
          ))}
        </g>
        {/* Center circle */}
        <circle r="20" fill="#1a1d1b" />
        <circle r="8" fill="#d8eca0" />
        <circle r="3" fill="#fff" opacity="0.6" />
      </g>

      {/* Decorative mini-cards in corners */}
      <g opacity="0.55">
        <rect x="30" y="25" width="90" height="36" rx="10" fill="white" opacity="0.7" />
        <rect x="36" y="34" width="20" height="4" rx="2" fill="#aece52" />
        <rect x="36" y="42" width="40" height="3" rx="1.5" fill="#c8d9f4" />
        <rect x="36" y="49" width="28" height="3" rx="1.5" fill="#f0cad8" />
      </g>
      <g opacity="0.45">
        <rect x="480" y="290" width="88" height="40" rx="10" fill="white" opacity="0.65" />
        <rect x="486" y="299" width="18" height="4" rx="2" fill="#cd6a96" />
        <rect x="486" y="307" width="38" height="3" rx="1.5" fill="#c6e0c0" />
        <rect x="486" y="314" width="26" height="3" rx="1.5" fill="#f5ddb2" />
      </g>
    </svg>
  )
}

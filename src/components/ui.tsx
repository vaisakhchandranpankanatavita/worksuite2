import clsx from 'clsx'
import { ArrowUpRight, CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { useEffect, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react'
import { initials } from '../lib/format'
import { useApp } from '../store'

/* ─── Card ──────────────────────────────────────────────────── */
export function Card({ className, children, dark, glass, ...rest }: {
  className?: string; children: ReactNode; dark?: boolean; glass?: boolean
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={clsx('animate-in relative overflow-hidden', dark ? 'card-dark' : glass ? 'card-glass' : 'card', 'p-5', className)} {...rest}>
      {/* Noise texture overlay */}
      <span aria-hidden className="pointer-events-none absolute inset-0 z-10 rounded-[inherit] opacity-[0.022]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")", backgroundSize: '128px 128px', mixBlendMode: 'overlay' as const }} />
      <div className="relative z-[1]">{children}</div>
    </div>
  )
}

/* ─── CardHeader ────────────────────────────────────────────── */
export function CardHeader({ title, subtitle, action, className }: {
  title: ReactNode; subtitle?: ReactNode; action?: ReactNode; className?: string
}) {
  return (
    <div className={clsx('flex items-start justify-between gap-3', className)}>
      <div className="min-w-0">
        <h3 className="font-display text-[15px] font-semibold leading-tight tracking-tight">{title}</h3>
        {subtitle && <p className="mt-1 text-xs text-ash">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

/* ─── IconBtn ───────────────────────────────────────────────── */
export function IconBtn({ children, className, dark, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { dark?: boolean }) {
  return (
    <button
      className={clsx(
        'grid size-9 shrink-0 place-items-center rounded-full border transition-all duration-200',
        'active:scale-90',
        dark
          ? 'border-ink bg-ink text-white hover:bg-black hover:shadow-md'
          : 'border-line/70 bg-white/70 text-ink/70 hover:bg-white hover:border-ink/15 hover:text-ink hover:shadow-sm',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}

export const CornerLink = (props: ButtonHTMLAttributes<HTMLButtonElement>) => (
  <IconBtn aria-label="Open" {...props}><ArrowUpRight size={15} /></IconBtn>
)

/* ─── Button ────────────────────────────────────────────────── */
export function Button({ variant = 'dark', size = 'md', className, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'dark' | 'light' | 'lime' | 'ghost' | 'danger'; size?: 'sm' | 'md'
}) {
  return (
    <button
      className={clsx(
        'relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full font-display font-semibold',
        'transition-all duration-250 disabled:opacity-50 disabled:active:scale-100 active:scale-[0.97]',
        'shimmer-on-hover',
        size === 'sm' ? 'h-8 px-4 text-xs' : 'h-10 px-5 text-[13px]',
        variant === 'dark'    && 'bg-ink text-white shadow-[0_1px_3px_rgba(26,29,27,0.20),0_4px_14px_-2px_rgba(26,29,27,0.28)] hover:shadow-[0_2px_10px_rgba(26,29,27,0.26),0_8px_24px_-4px_rgba(26,29,27,0.32)] hover:bg-[#0d110e]',
        variant === 'light'   && 'border border-line bg-white text-ink shadow-[0_1px_3px_rgba(26,29,27,0.06),0_2px_8px_-2px_rgba(26,29,27,0.09)] hover:shadow-[0_2px_8px_rgba(26,29,27,0.09),0_6px_18px_-4px_rgba(26,29,27,0.12)] hover:bg-soft hover:border-ink/15',
        variant === 'lime'    && 'bg-lime text-ink shadow-[0_1px_3px_rgba(174,206,82,0.28),0_4px_14px_-2px_rgba(174,206,82,0.32)] hover:shadow-[0_2px_8px_rgba(174,206,82,0.32),0_8px_22px_-4px_rgba(174,206,82,0.36)] hover:bg-lime-deep/70',
        variant === 'ghost'   && 'text-ash hover:bg-soft hover:text-ink',
        variant === 'danger'  && 'border border-rose bg-white text-rose-deep shadow-[0_1px_3px_rgba(205,106,150,0.12)] hover:shadow-[0_2px_10px_rgba(205,106,150,0.20)] hover:bg-rose/40',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}

/* ─── Avatar ────────────────────────────────────────────────── */
export function Avatar({ name, hue = 140, size = 36, src, className }: {
  name: string; hue?: number; size?: number; src?: string; className?: string
}) {
  return (
    <span
      className={clsx('relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full font-display font-semibold text-ink ring-2 ring-white/90 transition-transform duration-150 hover:z-10 hover:scale-110', className)}
      style={{ width: size, height: size, fontSize: size * 0.36, background: `linear-gradient(135deg, hsl(${hue} 58% 86%), hsl(${(hue + 40) % 360} 48% 72%))` }}
    >
      {initials(name)}
      {src && <img src={src} alt="" className="absolute inset-0 size-full object-cover object-top" onError={(e) => (e.currentTarget.style.display = 'none')} />}
    </span>
  )
}

/* ─── AvatarStack ───────────────────────────────────────────── */
export function AvatarStack({ hues, size = 26 }: { hues: number[]; size?: number }) {
  return (
    <div className="flex -space-x-2">
      {hues.map((h, i) => <Avatar key={i} name={['A K', 'R M', 'S P', 'D N'][i % 4]} hue={h} size={size} />)}
    </div>
  )
}

/* ─── Badge ─────────────────────────────────────────────────── */
const TONES: Record<string, string> = {
  green: 'bg-sage/80 text-[#235e20] border border-sage-deep/25',
  lime:  'bg-lime/80 text-[#495d16] border border-lime-deep/28',
  blue:  'bg-sky/80 text-[#24498a] border border-sky-deep/22',
  rose:  'bg-rose/80 text-[#862c58] border border-rose-deep/22',
  amber: 'bg-amber/80 text-[#6b4a10] border border-amber-deep/22',
  gray:  'bg-soft text-ash border border-line',
  dark:  'bg-ink text-white border border-white/10',
}

const STATUS_TONE: Record<string, keyof typeof TONES> = {
  Active: 'green', Paid: 'green', Approved: 'green', Present: 'green', Hired: 'green', Reimbursed: 'green',
  Pending: 'amber', Probation: 'blue', Processing: 'blue', Remote: 'blue', Late: 'amber', Screening: 'blue', Interview: 'lime', Offer: 'lime',
  Overdue: 'rose', Rejected: 'rose', Absent: 'rose', 'Notice Period': 'rose',
  Draft: 'gray', 'On Leave': 'gray', Applied: 'gray',
}

export function Badge({ children, tone, dot = true, className }: {
  children: ReactNode; tone?: keyof typeof TONES; dot?: boolean; className?: string
}) {
  const t = tone ?? STATUS_TONE[String(children)] ?? 'gray'
  return (
    <span className={clsx('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-[3px] text-[11px] font-bold leading-none transition-opacity duration-200 hover:opacity-80', TONES[t], className)}>
      {dot && <span className="size-1.5 rounded-full bg-current opacity-70" />}
      {children}
    </span>
  )
}

/* ─── PageHeader ────────────────────────────────────────────── */
export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <h1 className="text-gradient-heading font-display text-[26px] font-semibold leading-tight tracking-tight md:text-[32px]">
        {title}
      </h1>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

/* ─── Segmented ─────────────────────────────────────────────── */
export function Segmented<T extends string>({ value, options, onChange, className }: {
  value: T; options: readonly T[]; onChange: (v: T) => void; className?: string
}) {
  return (
    <div className={clsx('inline-flex rounded-full border border-line bg-white/80 p-1', className)}>
      {options.map((o) => (
        <button key={o} onClick={() => onChange(o)} className={clsx('rounded-full px-3.5 py-1.5 font-display text-xs font-semibold transition-all duration-200', value === o ? 'bg-ink text-white shadow-sm' : 'text-ash hover:text-ink hover:bg-soft')}>
          {o}
        </button>
      ))}
    </div>
  )
}

/* ─── Select ────────────────────────────────────────────────── */
export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={clsx('h-10 rounded-full border border-line bg-white/90 px-4 pr-8 text-sm outline-none transition-all duration-150 focus:border-ink/40 focus:shadow-sm', className)} {...rest}>
      {children}
    </select>
  )
}

/* ─── Input ─────────────────────────────────────────────────── */
export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input className={clsx('h-10 w-full rounded-xl border border-line bg-white/90 px-3.5 text-sm outline-none transition-all duration-150 placeholder:text-ash/60 focus:border-ink/40 focus:shadow-sm focus:bg-white', className)} {...rest} />
  )
}

/* ─── Field ─────────────────────────────────────────────────── */
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-ash/80">{label}</span>
      {children}
    </label>
  )
}

/* ─── Progress ──────────────────────────────────────────────── */
export function Progress({ value, className, tone = 'ink' }: { value: number; className?: string; tone?: 'ink' | 'lime' | 'sage' | 'rose' | 'sky' }) {
  const color = { ink: 'bg-gradient-to-r from-ink/80 to-ink', lime: 'bg-gradient-to-r from-lime-deep/70 to-lime-deep', sage: 'bg-gradient-to-r from-sage-deep/70 to-sage-deep', rose: 'bg-gradient-to-r from-rose-deep/70 to-rose-deep', sky: 'bg-gradient-to-r from-sky-deep/70 to-sky-deep' }[tone]
  return (
    <div className={clsx('h-2 overflow-hidden rounded-full bg-soft/80 shadow-[inset_0_1px_2px_rgba(26,29,27,0.08)]', className)}>
      <div className={clsx('h-full rounded-full transition-all duration-700', color)} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  )
}

/* ─── Modal ─────────────────────────────────────────────────── */
export function Modal({ open, onClose, title, children, width = 520 }: {
  open: boolean; onClose: () => void; title: string; children: ReactNode; width?: number
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prevOverflow }
  }, [open])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/25 p-4 backdrop-blur-md" onMouseDown={onClose}>
      <div className="card card-static animate-in max-h-[90vh] w-full overflow-y-auto p-7 scroll-thin relative" style={{ maxWidth: width }} onMouseDown={(e) => e.stopPropagation()}>
        {/* Top gradient accent line */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px rounded-t-[inherit] bg-gradient-to-r from-transparent via-lime-deep/50 to-transparent" />
        <div className="mb-6 flex items-center justify-between">
          <h3 className="font-display text-xl font-semibold">{title}</h3>
          <IconBtn onClick={onClose} aria-label="Close"><X size={15} /></IconBtn>
        </div>
        {children}
      </div>
    </div>
  )
}

/* ─── Toasts ────────────────────────────────────────────────── */
export function Toasts() {
  const { toasts, dismissToast } = useApp()
  return (
    <div className="fixed bottom-5 right-5 z-[60] flex flex-col gap-2">
      {toasts.map((t) => (
        <div key={t.id} className={clsx('animate-in flex items-center gap-3 rounded-full py-2.5 pl-3 pr-4 text-sm shadow-lg border', t.tone === 'error' ? 'bg-ink border-rose-deep/40 text-white' : t.tone === 'info' ? 'bg-ink border-sky-deep/40 text-white' : 'bg-ink border-lime-deep/30 text-white')}>
          {t.tone === 'error' ? <XCircle size={17} className="text-rose" /> : t.tone === 'info' ? <Info size={17} className="text-sky" /> : <CheckCircle2 size={17} className="text-lime" />}
          <span>{t.message}</span>
          <button onClick={() => dismissToast(t.id)} className="ml-1 text-white/40 transition-colors hover:text-white"><X size={13} /></button>
        </div>
      ))}
    </div>
  )
}

/* ─── Empty ─────────────────────────────────────────────────── */
export function Empty({ children }: { children: ReactNode }) {
  return <div className="grid place-items-center rounded-2xl border border-dashed border-line/70 py-14 text-sm text-ash/70">{children}</div>
}

/* ─── Table ─────────────────────────────────────────────────── */
export function Table({ head, children, className }: { head: ReactNode[]; children: ReactNode; className?: string }) {
  return (
    <div className={clsx('overflow-x-auto scroll-thin', className)}>
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b border-line text-left">
            {head.map((h, i) => <th key={i} className="whitespace-nowrap px-3 py-3 text-[11px] font-bold uppercase tracking-wide text-ash/80 first:pl-0 last:pr-0">{h}</th>)}
          </tr>
        </thead>
        <tbody className="[&_td]:px-3 [&_td]:py-3 [&_td:first-child]:pl-0 [&_td:last-child]:pr-0 [&_tr]:border-b [&_tr]:border-line/60 [&_tr:last-child]:border-0 [&_tr]:transition-colors [&_tr]:duration-150 [&_tr:hover]:bg-soft/60">
          {children}
        </tbody>
      </table>
    </div>
  )
}

/* ─── Chart tooltip style ───────────────────────────────────── */
export const chartTooltip = {
  contentStyle: {
    background: '#1a1d1b',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 14,
    color: '#fff',
    fontSize: 12,
    padding: '8px 14px',
    boxShadow: '0 8px 32px -8px rgba(0,0,0,0.5)',
  },
  itemStyle: { color: '#e8ece8' },
  labelStyle: { color: '#d8eca0', marginBottom: 5, fontWeight: 700 },
  cursor: { stroke: 'rgba(26,29,27,0.12)', strokeWidth: 1, strokeDasharray: '4 3' },
}

/* ─── StatChip — premium KPI chip ──────────────────────────── */
export function StatChip({ value, label, tone = 'default', className }: {
  value: ReactNode; label: string; tone?: 'default' | 'lime' | 'sky' | 'rose' | 'amber'; className?: string
}) {
  const bg = {
    default: 'bg-white/75 border-line',
    lime:    'bg-lime/60 border-lime-deep/25',
    sky:     'bg-sky/60 border-sky-deep/20',
    rose:    'bg-rose/60 border-rose-deep/20',
    amber:   'bg-amber/60 border-amber-deep/20',
  }[tone]
  return (
    <div className={clsx('rounded-2xl border backdrop-blur px-4 py-2.5 animate-in', bg, className)}>
      <p className="font-display text-lg font-semibold leading-none tabular-nums">{value}</p>
      <p className="mt-1 text-[11px] text-ash">{label}</p>
    </div>
  )
}

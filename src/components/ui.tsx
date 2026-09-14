import clsx from 'clsx'
import { ArrowUpRight, CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { useEffect, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react'
import { initials } from '../lib/format'
import { useApp } from '../store'

export function Card({ className, children, ...rest }: { className?: string; children: ReactNode } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={clsx('card p-5 animate-in', className)} {...rest}>
      {children}
    </div>
  )
}

export function CardHeader({ title, subtitle, action, className }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={clsx('flex items-start justify-between gap-3', className)}>
      <div className="min-w-0">
        <h3 className="text-[17px] font-medium leading-tight tracking-tight">{title}</h3>
        {subtitle && <p className="mt-1 text-xs text-ash">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

export function IconBtn({ children, className, dark, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { dark?: boolean }) {
  return (
    <button
      className={clsx(
        'grid size-9 shrink-0 place-items-center rounded-full border transition-all duration-150',
        dark ? 'border-ink bg-ink text-white hover:bg-black hover:shadow-md' : 'border-line bg-white text-ink hover:bg-soft hover:shadow-sm',
        'hover:scale-105 active:scale-90',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}

export const CornerLink = (props: ButtonHTMLAttributes<HTMLButtonElement>) => (
  <IconBtn aria-label="Open" {...props}>
    <ArrowUpRight size={16} />
  </IconBtn>
)

export function Button({ variant = 'dark', size = 'md', className, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'dark' | 'light' | 'lime' | 'ghost' | 'danger'; size?: 'sm' | 'md' }) {
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-full font-display font-medium transition-all duration-150 disabled:opacity-50 disabled:active:scale-100 active:scale-95',
        size === 'sm' ? 'h-8 px-3.5 text-xs' : 'h-10 px-5 text-sm',
        variant === 'dark' && 'bg-ink text-white hover:-translate-y-0.5 hover:bg-black hover:shadow-lg',
        variant === 'light' && 'border border-line bg-white text-ink hover:-translate-y-0.5 hover:bg-soft hover:shadow-sm',
        variant === 'lime' && 'bg-lime text-ink hover:-translate-y-0.5 hover:bg-lime-deep/60 hover:shadow-md',
        variant === 'ghost' && 'text-ash hover:bg-soft hover:text-ink',
        variant === 'danger' && 'border border-rose bg-white text-rose-deep hover:-translate-y-0.5 hover:bg-rose/40 hover:shadow-sm',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}

export function Avatar({ name, hue = 140, size = 36, src, className }: { name: string; hue?: number; size?: number; src?: string; className?: string }) {
  return (
    <span
      className={clsx('relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full font-display font-medium text-ink ring-2 ring-white transition-transform duration-150 hover:z-10 hover:scale-110', className)}
      style={{ width: size, height: size, fontSize: size * 0.36, background: `linear-gradient(135deg, hsl(${hue} 55% 86%), hsl(${(hue + 40) % 360} 45% 74%))` }}
    >
      {initials(name)}
      {src && <img src={src} alt="" className="absolute inset-0 size-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />}
    </span>
  )
}

export function AvatarStack({ hues, size = 26 }: { hues: number[]; size?: number }) {
  return (
    <div className="flex -space-x-2">
      {hues.map((h, i) => (
        <Avatar key={i} name={['A K', 'R M', 'S P', 'D N'][i % 4]} hue={h} size={size} />
      ))}
    </div>
  )
}

const TONES: Record<string, string> = {
  green: 'bg-sage text-[#2f6b2b]',
  lime: 'bg-lime text-[#56691d]',
  blue: 'bg-sky text-[#2d5597]',
  rose: 'bg-rose text-[#9b3563]',
  amber: 'bg-amber text-[#80591a]',
  gray: 'bg-soft text-ash',
  dark: 'bg-ink text-white',
}

const STATUS_TONE: Record<string, keyof typeof TONES> = {
  Active: 'green', Paid: 'green', Approved: 'green', Present: 'green', Hired: 'green', Reimbursed: 'green',
  Pending: 'amber', Probation: 'blue', Processing: 'blue', Remote: 'blue', Late: 'amber', Screening: 'blue', Interview: 'lime', Offer: 'lime',
  Overdue: 'rose', Rejected: 'rose', Absent: 'rose', 'Notice Period': 'rose',
  Draft: 'gray', 'On Leave': 'gray', Applied: 'gray',
}

export function Badge({ children, tone, dot = true, className }: { children: ReactNode; tone?: keyof typeof TONES; dot?: boolean; className?: string }) {
  const t = tone ?? STATUS_TONE[String(children)] ?? 'gray'
  return (
    <span className={clsx('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold transition-transform duration-150 hover:scale-105', TONES[t], className)}>
      {dot && <span className="size-1.5 rounded-full bg-current opacity-70" />}
      {children}
    </span>
  )
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl font-normal tracking-tight md:text-[40px] md:leading-[1.1]">{title}</h1>
        {subtitle && <p className="mt-2 text-sm text-ash">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function Segmented<T extends string>({ value, options, onChange, className }: { value: T; options: readonly T[]; onChange: (v: T) => void; className?: string }) {
  return (
    <div className={clsx('inline-flex rounded-full border border-line bg-white p-1', className)}>
      {options.map((o) => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className={clsx('rounded-full px-3.5 py-1.5 font-display text-xs transition-all duration-150', value === o ? 'bg-ink text-white shadow-sm' : 'text-ash hover:text-ink hover:bg-soft')}
        >
          {o}
        </button>
      ))}
    </div>
  )
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={clsx('h-10 rounded-full border border-line bg-white px-4 pr-8 text-sm outline-none transition-all duration-150 focus:border-ink focus:shadow-sm', className)} {...rest}>
      {children}
    </select>
  )
}

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={clsx('h-10 w-full rounded-xl border border-line bg-white px-3.5 text-sm outline-none transition-all duration-150 placeholder:text-ash/70 focus:border-ink focus:shadow-sm', className)} {...rest} />
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold text-ash">{label}</span>
      {children}
    </label>
  )
}

export function Progress({ value, className, tone = 'ink' }: { value: number; className?: string; tone?: 'ink' | 'lime' | 'sage' | 'rose' | 'sky' }) {
  const color = { ink: 'bg-ink', lime: 'bg-lime-deep', sage: 'bg-sage-deep', rose: 'bg-rose-deep', sky: 'bg-sky-deep' }[tone]
  return (
    <div className={clsx('h-2 overflow-hidden rounded-full bg-soft', className)}>
      <div className={clsx('h-full rounded-full transition-all', color)} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  )
}

export function Modal({ open, onClose, title, children, width = 520 }: { open: boolean; onClose: () => void; title: string; children: ReactNode; width?: number }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/30 p-4 backdrop-blur-sm" onMouseDown={onClose}>
      <div className="card card-static animate-in max-h-[90vh] w-full overflow-y-auto p-6 scroll-thin" style={{ maxWidth: width }} onMouseDown={(e) => e.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-xl font-medium">{title}</h3>
          <IconBtn onClick={onClose} aria-label="Close">
            <X size={16} />
          </IconBtn>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Toasts() {
  const { toasts, dismissToast } = useApp()
  return (
    <div className="fixed bottom-5 right-5 z-[60] flex flex-col gap-2">
      {toasts.map((t) => (
        <div key={t.id} className="animate-in flex items-center gap-3 rounded-full bg-ink py-2.5 pl-3 pr-4 text-sm text-white shadow-lg">
          {t.tone === 'error' ? <XCircle size={18} className="text-rose" /> : t.tone === 'info' ? <Info size={18} className="text-sky" /> : <CheckCircle2 size={18} className="text-lime" />}
          <span>{t.message}</span>
          <button onClick={() => dismissToast(t.id)} className="ml-1 text-white/50 hover:text-white">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="grid place-items-center rounded-2xl border border-dashed border-line py-12 text-sm text-ash">{children}</div>
}

/** Table wrapper matching the card style. */
export function Table({ head, children, className }: { head: ReactNode[]; children: ReactNode; className?: string }) {
  return (
    <div className={clsx('overflow-x-auto scroll-thin', className)}>
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs text-ash">
            {head.map((h, i) => (
              <th key={i} className="whitespace-nowrap px-3 py-3 font-bold first:pl-0 last:pr-0">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="[&_td]:px-3 [&_td]:py-3 [&_td:first-child]:pl-0 [&_td:last-child]:pr-0 [&_tr]:border-b [&_tr]:border-line/70 [&_tr:last-child]:border-0 [&_tr]:transition-colors [&_tr]:duration-150 [&_tr:hover]:bg-soft/50">{children}</tbody>
      </table>
    </div>
  )
}

export const chartTooltip = {
  contentStyle: { background: '#262825', border: 'none', borderRadius: 12, color: '#fff', fontSize: 12, padding: '8px 12px' },
  itemStyle: { color: '#fff' },
  labelStyle: { color: '#ddefa8', marginBottom: 4 },
  cursor: { stroke: '#262825', strokeWidth: 1, strokeDasharray: '3 3' },
}

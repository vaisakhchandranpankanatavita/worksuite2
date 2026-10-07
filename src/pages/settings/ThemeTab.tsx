import { Check } from 'lucide-react'
import clsx from 'clsx'
import { Card, CardHeader } from '../../components/ui'
import { THEMES, type ThemeId } from '../../data/themes'
import { iconsFor } from '../../lib/theme'

const PREVIEW_ICONS = ['home', 'people', 'payroll', 'reports'] as const

/** Superadmin: pick the company-wide colour theme. Selection previews live; Save persists it. */
export default function ThemeTab({ value, onChange }: { value: ThemeId; onChange: (t: ThemeId) => void }) {
  return (
    <Card>
      <CardHeader title="Appearance" subtitle="Colour theme and icon style for everyone in the company" />
      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {THEMES.map((t) => {
          const selected = t.id === value
          const Icons = iconsFor(t.id)
          return (
            <button key={t.id} type="button" onClick={() => onChange(t.id)} aria-pressed={selected}
              className={clsx('relative overflow-hidden rounded-2xl border p-3 text-left transition-all hover:-translate-y-0.5 hover:shadow-md', selected ? 'border-ink ring-2 ring-ink/20' : 'border-line')}
              style={{ background: t.swatch[0] }}>
              <div className="flex h-20 items-center gap-2 rounded-xl p-3" style={{ background: t.swatch[1] }}>
                {PREVIEW_ICONS.map((k, i) => {
                  const Icon = Icons[k]
                  return <span key={k} className="grid size-9 place-items-center rounded-full" style={{ background: t.swatch[2 + (i % 4)], color: t.swatch[1] }}><Icon size={16} /></span>
                })}
              </div>
              <div className="mt-3 flex gap-1.5">
                {t.swatch.map((c) => <span key={c} className="size-5 rounded-full ring-1 ring-black/10" style={{ background: c }} />)}
              </div>
              <p className="mt-3 font-display text-sm font-semibold" style={{ color: t.swatch[1] }}>{t.label}</p>
              <p className="text-xs" style={{ color: t.swatch[1], opacity: 0.7 }}>{t.blurb}</p>
              {selected && <span className="absolute right-3 top-3 grid size-6 place-items-center rounded-full bg-white text-ink shadow"><Check size={14} /></span>}
            </button>
          )
        })}
      </div>
    </Card>
  )
}

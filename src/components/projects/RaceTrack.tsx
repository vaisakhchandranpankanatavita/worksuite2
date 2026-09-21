import clsx from 'clsx'
import { Flag, Pause, Trophy } from 'lucide-react'
import { motion } from 'motion/react'
import { photoFor } from '../../lib/photo'
import type { Analysis } from '../../lib/projectMetrics'
import { employeeById } from '../../data/mock'
import { Avatar } from '../ui'
import { TONE_HEX } from './projectUi'

/**
 * Each project is a lane. The dashed ghost marks where the plan says the project should be today;
 * the runner (the project head) is where it actually is.
 */
export default function RaceTrack({ rows, onOpen }: { rows: Analysis[]; onOpen: (id: string) => void }) {
  return (
    <div className="mt-2 space-y-0">
      {rows.map((a, i) => {
        const { project: p, fc, health } = a
        const head = employeeById(p.headId)
        const actual = Math.min(100, fc.progress)
        const planned = Math.min(100, fc.plannedPct)
        const delta = Math.round(actual - planned)
        const done = p.status === 'Completed'
        const hold = p.status === 'On Hold'
        const color = TONE_HEX[health.tone].solid
        return (
          <button
            key={p.id}
            onClick={() => onOpen(p.id)}
            className="clickable group grid w-full grid-cols-[minmax(0,1fr)] items-center gap-x-3 gap-y-0.5 rounded-xl px-2 py-1 text-left md:grid-cols-[170px_minmax(0,1fr)_90px]"
          >
            <span className="min-w-0">
              <span className="clickable-title block truncate text-[13px] font-semibold transition-colors">{p.name}</span>
              <span className="block truncate text-[11px] text-ash">{p.client} · {head?.name.split(' ')[0]}</span>
            </span>

            <span className="relative block h-9">
              {/* rail */}
              <span className="absolute inset-x-0 top-1/2 h-2.5 -translate-y-1/2 overflow-hidden rounded-full bg-soft shadow-[inset_0_1px_2px_rgba(26,29,27,0.08)]">
                <motion.span
                  className="block h-full rounded-full"
                  style={{ background: `linear-gradient(90deg, ${TONE_HEX[health.tone].soft}, ${color})` }}
                  initial={{ width: 0 }}
                  animate={{ width: `${actual}%` }}
                  transition={{ duration: 1.1, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] }}
                />
              </span>
              {[25, 50, 75].map((t) => <span key={t} className="absolute top-1/2 h-1.5 w-px -translate-y-1/2 bg-ink/10" style={{ left: `${t}%` }} />)}
              {/* finish */}
              <span className="absolute right-0 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-full bg-ink text-white">
                {done ? <Trophy size={12} /> : <Flag size={12} />}
              </span>
              {/* planned ghost */}
              {!done && (
                <span
                  className="absolute top-1/2 size-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-dashed border-ink/35"
                  style={{ left: `${planned}%` }}
                  title={`Plan says ${Math.round(planned)}% by today`}
                />
              )}
              {/* runner */}
              <motion.span
                className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
                initial={{ left: '0%' }}
                animate={{ left: `${Math.max(2, Math.min(96, actual))}%` }}
                transition={{ type: 'spring', stiffness: 55, damping: 14, delay: i * 0.07 }}
              >
                <span className="relative block rounded-full" style={{ boxShadow: `0 0 0 3px ${color}, 0 6px 14px -4px ${color}` }}>
                  <Avatar name={head?.name ?? p.name} hue={head?.avatarHue ?? 120} size={26} src={head ? photoFor(head) : undefined} className="!ring-0" />
                  {hold && <span className="absolute -bottom-1 -right-1 grid size-4 place-items-center rounded-full bg-ink text-white"><Pause size={8} /></span>}
                </span>
              </motion.span>
            </span>

            <span className="hidden text-right md:block">
              <span className="block font-display text-sm font-semibold tabular-nums">{Math.round(actual)}%</span>
              <span className={clsx('block text-[11px] font-bold tabular-nums', done ? 'text-sky-deep' : hold ? 'text-ash' : delta >= 2 ? 'text-sage-deep' : delta <= -2 ? (delta <= -8 ? 'text-rose-deep' : 'text-amber-deep') : 'text-ash')}>
                {done ? 'Delivered' : hold ? 'Paused' : delta >= 2 ? `▲ ${delta}% ahead` : delta <= -2 ? `▼ ${-delta}% behind` : 'On pace'}
              </span>
            </span>
          </button>
        )
      })}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-0.5 px-2 pt-1.5 text-[10.5px] text-ash">
        <span className="inline-flex items-center gap-1.5"><span className="size-3.5 rounded-full border-2 border-dashed border-ink/35" /> where the plan says we should be today</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-3.5 rounded-full bg-sage-deep" /> where the project head actually is</span>
      </div>
    </div>
  )
}

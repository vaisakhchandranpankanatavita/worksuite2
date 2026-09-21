import clsx from 'clsx'
import { ChevronRight } from 'lucide-react'
import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { dayLabel, dayLabelFull, monthLabelOf } from '../../lib/dates'
import type { HealthTone } from '../../lib/projectMetrics'
import { Avatar } from '../ui'
import { TONE_HEX } from './projectUi'

export interface GanttRow {
  id: string
  label: string
  sub?: string
  avatar?: { name: string; hue: number; src?: string }
  /** 0 = project row, 1 = phase row */
  depth?: 0 | 1
  /** Current approved plan. */
  start: number
  end: number
  /** Original commitment, drawn as a tick when it differs from `end`. */
  baselineEnd?: number
  /** Percent of the live bar that is done, 0–100. */
  progress: number
  /** Where the work is (or is forecast to be). Defaults to the plan. */
  liveStart?: number
  liveEnd?: number
  /** Optimistic / pessimistic finish, drawn as a whisker. */
  optEnd?: number
  pesEnd?: number
  tone: HealthTone
  done?: boolean
  right?: ReactNode
  expandable?: boolean
  expanded?: boolean
  onToggle?: () => void
  onClick?: () => void
}

const LABEL_W = 236

function months(rs: number, re: number) {
  const out: { day: number; label: string; year?: number }[] = []
  const d = new Date(rs * 864e5)
  let y = d.getUTCFullYear()
  let m = d.getUTCMonth() + 1
  for (;;) {
    const day = Math.round(Date.UTC(y, m, 1) / 864e5)
    if (day >= re) break
    out.push({ day, label: monthLabelOf(day) })
    m++
    if (m > 11) { m = 0; y++ }
  }
  return out
}

/**
 * Waterfall / Gantt chart. Per row: the plan (thin bar on top), the live bar (progress filled, hatched where
 * the forecast runs past the plan), an optimistic–pessimistic whisker, and a tick for the original baseline.
 */
export default function Gantt({ rows, rangeStart, rangeEnd, today, showProjection = true, minWidth = 900 }: {
  rows: GanttRow[]; rangeStart: number; rangeEnd: number; today: number; showProjection?: boolean; minWidth?: number
}) {
  const span = Math.max(1, rangeEnd - rangeStart)
  const pct = (d: number) => ((d - rangeStart) / span) * 100
  const ticks = months(rangeStart, rangeEnd)
  const todayPct = pct(today)

  return (
    <div className="scroll-thin overflow-x-auto">
      <div style={{ minWidth }}>
        {/* header */}
        <div className="flex border-b border-line/70">
          <div className="sticky left-0 z-20 shrink-0 bg-[#f6faf5] px-2 py-2 text-[11px] font-bold uppercase tracking-wide text-ash/80" style={{ width: LABEL_W }}>Project / phase</div>
          <div className="relative h-8 flex-1">
            {ticks.map((t) => (
              <span key={t.day} className="absolute top-0 flex h-full items-center border-l border-line/70 pl-1.5 text-[10px] font-bold uppercase tracking-wide text-ash/80" style={{ left: `${pct(t.day)}%` }}>{t.label}</span>
            ))}
            {todayPct >= 0 && todayPct <= 100 && (
              <span className="absolute top-1 z-10 -translate-x-1/2 rounded-full bg-ink px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white" style={{ left: `${todayPct}%` }}>Today</span>
            )}
          </div>
        </div>

        {/* rows */}
        <div className="relative">
          {rows.map((r, i) => {
            const isPhase = r.depth === 1
            const c = TONE_HEX[r.tone]
            const ls = r.liveStart ?? r.start
            const le = showProjection ? (r.liveEnd ?? r.end) : r.end
            const slip = Math.max(0, le - r.end)
            const liveLen = Math.max(1, le - ls)
            const planLen = Math.max(1, r.end - r.start)
            const late = le - r.end
            const tip = `${r.label}\nPlan: ${dayLabel(r.start)} → ${dayLabelFull(r.end)}${r.baselineEnd && r.baselineEnd !== r.end ? `\nOriginal commitment: ${dayLabelFull(r.baselineEnd)}` : ''}${showProjection && r.liveEnd !== undefined ? `\nProjected finish: ${dayLabelFull(le)} (${late > 0 ? `+${late}d` : late < 0 ? `${-late}d early` : 'on plan'})` : ''}\nProgress: ${Math.round(r.progress)}%`
            return (
              <div
                key={r.id}
                className={clsx('group/row flex border-b border-line/40 transition-colors last:border-0', r.onClick && 'cursor-pointer', isPhase ? 'bg-soft/30 hover:bg-soft/70' : 'hover:bg-soft/60')}
                style={{ height: isPhase ? 40 : 52 }}
                onClick={r.onClick}
                title={tip}
              >
                <div className={clsx('sticky left-0 z-10 flex shrink-0 items-center gap-2 px-2 backdrop-blur-sm', isPhase ? 'bg-[#f3f7f2] pl-9' : 'bg-[#f6faf5]')} style={{ width: LABEL_W }}>
                  {r.expandable && (
                    <button
                      onClick={(e) => { e.stopPropagation(); r.onToggle?.() }}
                      aria-label={r.expanded ? 'Collapse phases' : 'Expand phases'}
                      className="grid size-5 shrink-0 place-items-center rounded-full text-ash transition-colors hover:bg-ink hover:text-white"
                    >
                      <ChevronRight size={13} className={clsx('transition-transform duration-200', r.expanded && 'rotate-90')} />
                    </button>
                  )}
                  {r.avatar && !isPhase && <Avatar name={r.avatar.name} hue={r.avatar.hue} src={r.avatar.src} size={24} />}
                  <span className="min-w-0">
                    <span className={clsx('block truncate', isPhase ? 'text-xs font-medium' : 'text-[13px] font-semibold')}>{r.label}</span>
                    {r.sub && <span className="block truncate text-[10px] text-ash">{r.sub}</span>}
                  </span>
                </div>

                <div className="relative flex-1">
                  {ticks.map((t) => <span key={t.day} className="absolute inset-y-0 w-px bg-line/40" style={{ left: `${pct(t.day)}%` }} />)}
                  {todayPct >= 0 && todayPct <= 100 && <span className="absolute inset-y-0 z-[5] w-px bg-ink/70" style={{ left: `${todayPct}%` }} />}

                  {/* plan lane */}
                  <span className="absolute h-[5px] rounded-full bg-ink/15" style={{ left: `${pct(r.start)}%`, width: `${(planLen / span) * 100}%`, top: isPhase ? 9 : 11 }} />
                  {r.baselineEnd !== undefined && r.baselineEnd !== r.end && (
                    <span className="absolute z-[4] h-3 w-[2px] rounded bg-ink/45" style={{ left: `${pct(r.baselineEnd)}%`, top: isPhase ? 5 : 7 }} title={`Original commitment ${dayLabelFull(r.baselineEnd)}`} />
                  )}

                  {/* live lane */}
                  <motion.span
                    className="absolute overflow-hidden rounded-full"
                    style={{ left: `${pct(ls)}%`, width: `${(liveLen / span) * 100}%`, top: isPhase ? 19 : 24, height: isPhase ? 12 : 16, background: c.soft, transformOrigin: 'left', boxShadow: `inset 0 0 0 1px ${c.solid}33` }}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.7, delay: Math.min(i, 12) * 0.035, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <span className="block h-full rounded-full" style={{ width: `${Math.min(100, r.progress)}%`, background: `linear-gradient(90deg, ${c.solid}cc, ${c.solid})` }} />
                    {slip > 0 && (
                      <span
                        className="absolute inset-y-0 right-0"
                        style={{ width: `${(slip / liveLen) * 100}%`, backgroundImage: `repeating-linear-gradient(135deg, ${c.solid}55 0 4px, transparent 4px 8px)` }}
                      />
                    )}
                  </motion.span>

                  {showProjection && r.optEnd !== undefined && r.pesEnd !== undefined && r.pesEnd > r.optEnd && !r.done && (
                    <span className="absolute z-[3] flex items-center" style={{ left: `${pct(r.optEnd)}%`, width: `${((r.pesEnd - r.optEnd) / span) * 100}%`, top: isPhase ? 25 : 31 }} title={`Likely finish window: ${dayLabel(r.optEnd)} – ${dayLabel(r.pesEnd)}`}>
                      <span className="h-[7px] w-px bg-ink/50" />
                      <span className="h-px flex-1 bg-ink/40" />
                      <span className="h-[7px] w-px bg-ink/50" />
                    </span>
                  )}

                  {r.right && (
                    <span className="absolute z-[6] -translate-y-1/2 whitespace-nowrap pl-2" style={{ left: `${Math.min(pct(Math.max(le, r.pesEnd ?? le)), 88)}%`, top: isPhase ? 20 : 26 }}>{r.right}</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* legend */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 border-t border-line/60 px-2 pt-3 text-[11px] text-ash" style={{ paddingLeft: LABEL_W > 0 ? 8 : 0 }}>
          <span className="inline-flex items-center gap-1.5"><span className="h-[5px] w-6 rounded-full bg-ink/15" /> Plan</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-3 w-6 rounded-full bg-sage-deep" /> Done</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-3 w-6 rounded-full bg-sage" /> Remaining</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-3 w-6 rounded-full" style={{ backgroundImage: 'repeating-linear-gradient(135deg,#cd6a9688 0 4px,transparent 4px 8px)', boxShadow: 'inset 0 0 0 1px #cd6a9644' }} /> Projected slip</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-3 w-[2px] bg-ink/45" /> Original commitment</span>
          <span className="inline-flex items-center gap-1.5"><span className="inline-flex items-center"><span className="h-[7px] w-px bg-ink/50" /><span className="h-px w-5 bg-ink/40" /><span className="h-[7px] w-px bg-ink/50" /></span> Likely finish window</span>
        </div>
      </div>
    </div>
  )
}

import { useMemo } from 'react'
import { employeeById } from '../../data/mock'
import type { GanttRow } from '../../components/projects/Gantt'
import { SlipTag } from '../../components/projects/projectUi'
import { photoFor } from '../../lib/photo'
import { analyzeAll, type Analysis, type HealthTone } from '../../lib/projectMetrics'
import { useApp } from '../../store'

/** Every project with its forecast, finance, health and game stats — recomputed when anything it depends on changes. */
export function useAnalyzed(): Analysis[] {
  const projects = useApp((s) => s.projects)
  const expenses = useApp((s) => s.expenses)
  const invoices = useApp((s) => s.invoices)
  const assets = useApp((s) => s.assets)
  return useMemo(() => analyzeAll(projects, expenses, invoices, assets), [projects, expenses, invoices, assets])
}

export const PORTFOLIO_TITLES = ['Rookie', 'Contender', 'Pacesetter', 'Trailblazer', 'Champion', 'Legend']

/** Project-level bar for the Gantt chart. */
export function projectRow(a: Analysis, extra: Partial<GanttRow> = {}): GanttRow {
  const { project: p, fc, health } = a
  const head = employeeById(p.headId)
  return {
    id: p.id,
    label: p.name,
    sub: `${p.code} · ${p.client}`,
    avatar: head ? { name: head.name, hue: head.avatarHue, src: photoFor(head) } : undefined,
    depth: 0,
    start: fc.startDay,
    end: fc.plannedEnd,
    baselineEnd: fc.baselineEnd,
    progress: fc.progress,
    liveStart: fc.startDay,
    liveEnd: fc.projectedEnd,
    optEnd: fc.optimisticEnd,
    pesEnd: fc.pessimisticEnd,
    tone: health.tone,
    done: p.status === 'Completed',
    right: p.status === 'Completed' || p.status === 'Initiated' ? undefined : <SlipTag days={fc.slipDays} />,
    ...extra,
  }
}

/** One waterfall row per phase of a project. */
export function phaseRows(a: Analysis, extra: Partial<GanttRow> = {}): GanttRow[] {
  const { project: p, fc } = a
  return fc.phases.map((pf) => {
    const owner = employeeById(pf.phase.ownerId)
    const tone: HealthTone = pf.state === 'done' ? 'green' : pf.slip > 7 ? 'rose' : pf.slip > 0 ? 'amber' : pf.state === 'pending' ? 'blue' : 'green'
    return {
      id: `${p.id}:${pf.phase.id}`,
      label: pf.phase.name,
      sub: owner ? owner.name : undefined,
      depth: 1,
      start: pf.plannedStart,
      end: pf.plannedEnd,
      progress: pf.phase.progress,
      liveStart: pf.projStart,
      liveEnd: pf.projEnd,
      tone,
      done: pf.state === 'done',
      right: pf.state === 'done' ? undefined : <SlipTag days={pf.slip} />,
      ...extra,
    }
  })
}

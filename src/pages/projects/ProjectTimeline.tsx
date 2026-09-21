import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Gantt from '../../components/projects/Gantt'
import { Button, Card, CardHeader, PageHeader, Segmented } from '../../components/ui'
import { todayDay } from '../../lib/dates'
import { phaseRows, projectRow, useAnalyzed } from './useAnalyzed'

const SCOPES = ['In flight', 'All projects'] as const
const MODES = ['With projections', 'Plan only'] as const

export default function ProjectTimeline() {
  const nav = useNavigate()
  const rows = useAnalyzed()
  const today = todayDay()
  const [scope, setScope] = useState<(typeof SCOPES)[number]>('In flight')
  const [mode, setMode] = useState<(typeof MODES)[number]>('With projections')
  const [open, setOpen] = useState<Set<string>>(new Set())

  const shown = useMemo(
    () => rows.filter((r) => scope === 'All projects' || r.project.status !== 'Completed').sort((a, b) => a.fc.startDay - b.fc.startDay),
    [rows, scope],
  )
  const ganttRows = useMemo(
    () => shown.flatMap((a) => [
      projectRow(a, {
        expandable: true,
        expanded: open.has(a.project.id),
        onToggle: () => setOpen((s) => { const n = new Set(s); n.has(a.project.id) ? n.delete(a.project.id) : n.add(a.project.id); return n }),
        onClick: () => nav(`/projects/${a.project.id}?tab=timeline`),
      }),
      ...(open.has(a.project.id) ? phaseRows(a) : []),
    ]),
    [shown, open, nav],
  )

  const rangeStart = Math.min(today - 14, ...shown.map((a) => a.fc.startDay)) - 5
  const rangeEnd = Math.max(today + 30, ...shown.map((a) => Math.max(a.fc.plannedEnd, a.fc.projectedEnd, a.fc.pessimisticEnd))) + 10

  return (
    <div>
      <PageHeader
        title="Timeline"
        subtitle="Waterfall view of every project — the plan, the progress, and where the finish date is really heading"
        actions={
          <>
            <Segmented value={scope} options={SCOPES} onChange={setScope} />
            <Segmented value={mode} options={MODES} onChange={setMode} />
            <Button variant="light" size="sm" onClick={() => setOpen(open.size ? new Set() : new Set(shown.map((a) => a.project.id)))}>
              {open.size ? 'Collapse all' : 'Expand all'}
            </Button>
          </>
        }
      />
      <Card>
        <CardHeader title="Portfolio waterfall" subtitle="Click a chevron to open a project's phases · click a row to open the project" />
        <div className="mt-4">
          <Gantt rows={ganttRows} rangeStart={rangeStart} rangeEnd={rangeEnd} today={today} showProjection={mode === 'With projections'} />
        </div>
      </Card>
    </div>
  )
}

import clsx from 'clsx'
import { Boxes, Flame, Plus, Search, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { HealthRing, SlipTag } from '../../components/projects/projectUi'
import { Avatar, Badge, Button, Card, Empty, Input, PageHeader, Segmented } from '../../components/ui'
import { employeeById } from '../../data/mock'
import { dayLabel } from '../../lib/dates'
import { fmtCompact } from '../../lib/format'
import { photoFor } from '../../lib/photo'
import type { Analysis } from '../../lib/projectMetrics'
import NewProjectModal from './NewProjectModal'
import { useAnalyzed } from './useAnalyzed'

const FILTERS = ['All', 'On track', 'At risk', 'Delayed', 'Completed'] as const
type Filter = (typeof FILTERS)[number]

const matches = (a: Analysis, f: Filter) =>
  f === 'All' ? true
    : f === 'Completed' ? a.project.status === 'Completed'
      : a.project.status !== 'Completed' && a.health.label === f

const STATUS_TONE = { Initiated: 'gray', 'In Progress': 'blue', 'On Hold': 'amber', Completed: 'green' } as const

function ProjectCard({ a, onOpen }: { a: Analysis; onOpen: () => void }) {
  const { project: p, fc, fin, health, game } = a
  const head = employeeById(p.headId)
  const people = p.team.filter((m) => !m.until).length
  const assets = p.assetLinks.filter((l) => !l.until).length
  const running = p.status === 'In Progress' || p.status === 'On Hold'
  const budget = p.budget || 1
  return (
    <Card className="cursor-pointer !p-5 transition-transform duration-300 hover:-translate-y-0.5" onClick={onOpen} role="link" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && onOpen()}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-ash">
            {p.code} · {p.client}
          </p>
          <h3 className="mt-1 font-display text-[17px] font-semibold leading-snug tracking-tight">{p.name}</h3>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge tone={STATUS_TONE[p.status]}>{p.status}</Badge>
            {running && <Badge tone={health.tone}>{health.label}</Badge>}
            {game.streak >= 3 && <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-amber-deep"><Flame size={12} /> {game.streak}-day streak</span>}
          </div>
        </div>
        <HealthRing score={health.score} tone={health.tone} size={62} />
      </div>

      {/* progress vs plan */}
      <div className="mt-4">
        <div className="mb-1.5 flex justify-between text-[11px] text-ash">
          <span><b className="text-ink">{Math.round(fc.progress)}%</b> done</span>
          <span>plan says {Math.round(fc.plannedPct)}%</span>
        </div>
        <div className="relative h-2.5 rounded-full bg-soft shadow-[inset_0_1px_2px_rgba(26,29,27,0.08)]">
          <div className="h-full rounded-full bg-gradient-to-r from-ink/80 to-ink transition-all duration-700" style={{ width: `${Math.min(100, fc.progress)}%` }} />
          {p.status !== 'Completed' && <span className="absolute -top-1 h-4.5 w-[2px] rounded bg-rose-deep" style={{ left: `${Math.min(100, fc.plannedPct)}%`, height: 18 }} title="Planned progress today" />}
        </div>
      </div>

      {/* money: budget / allotted / used */}
      <div className="mt-4">
        <div className="relative h-2.5 overflow-hidden rounded-full bg-soft shadow-[inset_0_1px_2px_rgba(26,29,27,0.08)]">
          <div className="absolute inset-y-0 left-0 rounded-full bg-lime" style={{ width: `${Math.min(100, (fin.allotted / budget) * 100)}%` }} />
          <div className={clsx('absolute inset-y-0 left-0 rounded-full', fin.used > fin.allotted ? 'bg-rose-deep' : 'bg-sage-deep')} style={{ width: `${Math.min(100, (fin.used / budget) * 100)}%` }} />
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2 text-[11px]">
          <div><p className="text-ash">Budget</p><p className="font-display text-[13px] font-semibold tabular-nums">{fmtCompact(fin.budget)}</p></div>
          <div><p className="text-ash">Allotted</p><p className="font-display text-[13px] font-semibold tabular-nums">{fmtCompact(fin.allotted)}</p></div>
          <div><p className="text-ash">Used</p><p className={clsx('font-display text-[13px] font-semibold tabular-nums', fin.used > fin.allotted && 'text-rose-deep')}>{fmtCompact(fin.used)}</p></div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-line/60 pt-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {head && <Avatar name={head.name} hue={head.avatarHue} src={photoFor(head)} size={28} />}
          <span className="min-w-0 text-[11px] leading-tight">
            <span className="block truncate font-semibold">{head?.name}</span>
            <span className="text-ash"><Users size={10} className="mr-0.5 inline" />{people} <Boxes size={10} className="ml-1 mr-0.5 inline" />{assets}</span>
          </span>
        </div>
        <div className="text-right text-[11px]">
          {p.status === 'Completed' ? (
            <p className="text-ash">Delivered <b className="text-ink">{dayLabel(fc.projectedEnd)}</b></p>
          ) : (
            <>
              <p className="text-ash">Finish <b className="tabular-nums text-ink">{dayLabel(fc.projectedEnd)}</b></p>
              {p.status !== 'Initiated' && <SlipTag days={fc.slipDays} className="mt-1" />}
            </>
          )}
        </div>
      </div>
    </Card>
  )
}

export default function ProjectList() {
  const nav = useNavigate()
  const rows = useAnalyzed()
  const [filter, setFilter] = useState<Filter>('All')
  const [q, setQ] = useState('')
  const [creating, setCreating] = useState(false)

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase()
    return rows.filter((a) => matches(a, filter) && (!s || `${a.project.name} ${a.project.code} ${a.project.client}`.toLowerCase().includes(s)))
  }, [rows, filter, q])

  return (
    <div>
      <PageHeader
        title="Portfolio"
        subtitle={`${rows.length} projects · ${fmtCompact(rows.reduce((t, r) => t + r.fin.budget, 0))} approved budget`}
        actions={<Button onClick={() => setCreating(true)}><Plus size={15} /> New project</Button>}
      />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Segmented value={filter} options={FILTERS} onChange={setFilter} />
        <div className="relative w-full max-w-xs">
          <Search size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ash" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search projects or clients…" className="!rounded-full !pl-9" />
        </div>
      </div>
      {shown.length === 0 ? (
        <Empty>No projects match.</Empty>
      ) : (
        <div className="stagger grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {shown.map((a) => <ProjectCard key={a.project.id} a={a} onOpen={() => nav(`/projects/${a.project.id}`)} />)}
        </div>
      )}
      <NewProjectModal open={creating} onClose={() => setCreating(false)} />
    </div>
  )
}

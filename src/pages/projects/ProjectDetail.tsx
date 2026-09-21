import { ArrowLeft, Flame, Pause, Play, PenLine } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Confetti, HealthRing } from '../../components/projects/projectUi'
import { Avatar, Badge, Button, Segmented } from '../../components/ui'
import { employeeById } from '../../data/mock'
import { photoFor } from '../../lib/photo'
import { useApp } from '../../store'
import FinanceTab from './detail/FinanceTab'
import OverviewTab from './detail/OverviewTab'
import ResourcesTab from './detail/ResourcesTab'
import TimelineTab from './detail/TimelineTab'
import UpdatesTab from './detail/UpdatesTab'
import { useAnalyzed } from './useAnalyzed'

const TABS = ['Overview', 'Timeline', 'Resources', 'Finance', 'Updates'] as const
type Tab = (typeof TABS)[number]
const STATUS_TONE = { Initiated: 'gray', 'In Progress': 'blue', 'On Hold': 'amber', Completed: 'green' } as const

export default function ProjectDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const [params, setParams] = useSearchParams()
  const rows = useAnalyzed()
  const setStatus = useApp((s) => s.setProjectStatus)
  const [burst, setBurst] = useState(0)

  const a = rows.find((r) => r.project.id === id)
  if (!a) return <p className="py-20 text-center text-ash">Project not found.</p>
  const { project: p, health, game } = a
  const head = employeeById(p.headId)
  const lead = employeeById(p.leadId)
  const tab = TABS.find((t) => t.toLowerCase() === params.get('tab')) ?? 'Overview'
  const setTab = (t: Tab) => setParams(t === 'Overview' ? {} : { tab: t.toLowerCase() }, { replace: true })
  const celebrate = () => setBurst((n) => n + 1)

  return (
    <div>
      <Confetti burst={burst} />
      <button onClick={() => nav('/projects/portfolio')} className="mb-4 inline-flex items-center gap-2 text-sm text-ash hover:text-ink">
        <ArrowLeft size={16} /> All projects
      </button>

      {/* ── Header ── */}
      <div className="card relative mb-4 overflow-hidden p-5 sm:p-6">
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-lime/30 blur-3xl" />
        <div className="relative flex flex-wrap items-center gap-x-6 gap-y-4">
          <HealthRing score={health.score} tone={health.tone} size={96} label="health" />
          <div className="min-w-0 flex-1 basis-64">
            <p className="text-[11px] font-bold uppercase tracking-wider text-ash">{p.code} · {p.client}</p>
            <h1 className="text-gradient-heading mt-1 font-display text-2xl font-semibold leading-tight tracking-tight md:text-[28px]">{p.name}</h1>
            <p className="mt-1 max-w-2xl text-sm text-ash">{p.summary}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge tone={STATUS_TONE[p.status]}>{p.status}</Badge>
              {(p.status === 'In Progress' || p.status === 'On Hold') && <Badge tone={health.tone}>{health.label}</Badge>}
              <span className="inline-flex items-center gap-1 rounded-full bg-ink px-2.5 py-[3px] text-[11px] font-bold text-white">LV {game.level} · {game.xp} XP</span>
              {game.streak >= 2 && <span className="inline-flex items-center gap-1 rounded-full bg-amber/80 px-2.5 py-[3px] text-[11px] font-bold text-[#6b4a10]"><Flame size={12} /> {game.streak}-day streak</span>}
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-5">
              {head && (
                <button onClick={() => nav(`/hr/employees/${head.id}`)} className="flex items-center gap-2.5 text-left">
                  <Avatar name={head.name} hue={head.avatarHue} src={photoFor(head)} size={40} />
                  <span className="leading-tight"><span className="block text-[10px] font-bold uppercase tracking-wide text-ash">Project head</span><span className="text-[13px] font-semibold">{head.name}</span></span>
                </button>
              )}
              {lead && (
                <button onClick={() => nav(`/hr/employees/${lead.id}`)} className="hidden items-center gap-2.5 text-left sm:flex">
                  <Avatar name={lead.name} hue={lead.avatarHue} src={photoFor(lead)} size={40} />
                  <span className="leading-tight"><span className="block text-[10px] font-bold uppercase tracking-wide text-ash">Delivery lead</span><span className="text-[13px] font-semibold">{lead.name}</span></span>
                </button>
              )}
            </div>
            {p.status !== 'Completed' && (
              <div className="flex gap-2">
                <Button size="sm" onClick={() => setTab('Updates')}><PenLine size={13} /> Post update</Button>
                {p.status === 'On Hold'
                  ? <Button size="sm" variant="light" onClick={() => setStatus(p.id, 'In Progress')}><Play size={13} /> Resume</Button>
                  : p.status === 'In Progress' && <Button size="sm" variant="light" onClick={() => setStatus(p.id, 'On Hold')}><Pause size={13} /> Put on hold</Button>}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mb-4 overflow-x-auto scroll-thin">
        <Segmented value={tab} options={TABS} onChange={setTab} />
      </div>

      <div key={tab} className="animate-in">
        {tab === 'Overview' && <OverviewTab a={a} go={setTab} />}
        {tab === 'Timeline' && <TimelineTab a={a} />}
        {tab === 'Resources' && <ResourcesTab a={a} />}
        {tab === 'Finance' && <FinanceTab a={a} />}
        {tab === 'Updates' && <UpdatesTab a={a} onCelebrate={celebrate} />}
      </div>
    </div>
  )
}

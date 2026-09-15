import clsx from 'clsx'
import { Briefcase, MapPin, Star, Users } from 'lucide-react'
import { useState } from 'react'
import { Avatar, Card, CardHeader, PageHeader, Segmented } from '../../components/ui'
import { STAGES, jobs, type Stage } from '../../data/mock'
import { fmtCompact, fmtShortDate } from '../../lib/format'
import { useApp } from '../../store'

const STAGE_STYLE: Record<Stage, string> = { Applied: 'bg-soft', Screening: 'bg-sky', Interview: 'bg-lime', Offer: 'bg-amber', Hired: 'bg-sage' }

export default function Recruitment() {
  const { candidates, moveCandidate, toast } = useApp()
  const [job, setJob] = useState('All')
  const [dragId, setDragId] = useState<string | null>(null)
  const [over, setOver] = useState<Stage | null>(null)
  const list = candidates.filter((c) => job === 'All' || c.jobId === job)

  const drop = (stage: Stage) => {
    if (dragId) {
      const c = candidates.find((x) => x.id === dragId)!
      if (c.stage !== stage) {
        moveCandidate(dragId, stage)
        toast(`${c.name} moved to ${stage}`)
      }
    }
    setDragId(null)
    setOver(null)
  }

  return (
    <div>
      <PageHeader title="Recruitment" subtitle={`${jobs.length} open roles · ${candidates.length} candidates in pipeline`} />

      <div className="mb-4 flex gap-2.5 overflow-x-auto pb-1 scroll-thin">
        {jobs.map((j) => (
          <button key={j.id} onClick={() => setJob(job === j.id ? 'All' : j.id)} className={clsx('card flex min-w-[196px] items-center gap-2.5 p-3 text-left transition', job === j.id && 'ring-2 ring-ink')}>
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-lime"><Briefcase size={13} /></span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium leading-tight">{j.title}</p>
              <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-ash">
                <MapPin size={10} className="shrink-0" /> {j.location}
              </p>
              <div className="mt-1.5 flex items-center gap-2 text-[11px] text-ash">
                <span className="flex items-center gap-1"><Users size={10} /> {j.applicants}</span>
                <span className="text-line">·</span>
                <span>{j.openings} opening{j.openings > 1 ? 's' : ''}</span>
                <span className="text-line">·</span>
                <span className="truncate">{j.type}</span>
              </div>
            </div>
          </button>
        ))}
      </div>

      <Card className="!p-4">
        <CardHeader
          title="Hiring Pipeline"
          subtitle="Drag candidates between stages"
          action={<Segmented value={job === 'All' ? 'All roles' : 'Filtered'} options={['All roles', 'Filtered'] as const} onChange={(v) => v === 'All roles' && setJob('All')} />}
        />
        <div className="mt-4 grid auto-cols-[minmax(230px,1fr)] grid-flow-col gap-3 overflow-x-auto pb-2 scroll-thin">
          {STAGES.map((stage) => {
            const items = list.filter((c) => c.stage === stage)
            return (
              <div
                key={stage}
                onDragOver={(e) => { e.preventDefault(); setOver(stage) }}
                onDragLeave={() => setOver(null)}
                onDrop={() => drop(stage)}
                className={clsx('min-h-[420px] rounded-[18px] bg-soft p-2.5 transition', over === stage && 'bg-lime/40 ring-2 ring-lime-deep')}
              >
                <div className="mb-2.5 flex items-center justify-between px-1.5">
                  <span className="flex items-center gap-2 font-display text-sm"><span className={clsx('size-2.5 rounded-full', STAGE_STYLE[stage], 'ring-1 ring-ink/20')} />{stage}</span>
                  <span className="rounded-full bg-white px-2 text-xs">{items.length}</span>
                </div>
                <div className="space-y-2">
                  {items.map((c) => {
                    const j = jobs.find((x) => x.id === c.jobId)!
                    return (
                      <div
                        key={c.id}
                        draggable
                        onDragStart={() => setDragId(c.id)}
                        onDragEnd={() => { setDragId(null); setOver(null) }}
                        className={clsx('cursor-grab rounded-2xl border border-line bg-white p-3 active:cursor-grabbing', dragId === c.id && 'opacity-40')}
                      >
                        <div className="flex items-center gap-2.5">
                          <Avatar name={c.name} hue={c.avatarHue} size={32} />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold">{c.name}</p>
                            <p className="truncate text-[11px] text-ash">{j.title}</p>
                          </div>
                        </div>
                        <div className="mt-2.5 flex items-center justify-between text-[11px]">
                          <span className="flex gap-0.5">{Array.from({ length: 5 }, (_, i) => <Star key={i} size={11} className={i < c.rating ? 'fill-ink text-ink' : 'text-line'} />)}</span>
                          <span className="text-ash">{c.experience} yrs · {fmtCompact(c.expectedCtc)}</span>
                        </div>
                        <div className="mt-2 flex items-center justify-between text-[10px] text-ash">
                          <span className="rounded-full bg-soft px-2 py-0.5">{c.source}</span>
                          <span>{fmtShortDate(c.appliedOn)}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}

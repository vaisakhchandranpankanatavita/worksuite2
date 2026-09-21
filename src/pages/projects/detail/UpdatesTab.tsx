import clsx from 'clsx'
import { AlertTriangle, Flame, Send } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Avatar, Badge, Button, Card, CardHeader, Empty, Field, Input, Select } from '../../../components/ui'
import { employeeById } from '../../../data/mock'
import { dayLabelFull, fromDay, isWeekday, toDay, todayDay } from '../../../lib/dates'
import { photoFor } from '../../../lib/photo'
import { overallProgress, type Analysis } from '../../../lib/projectMetrics'
import { useApp } from '../../../store'

export default function UpdatesTab({ a, onCelebrate }: { a: Analysis; onCelebrate: () => void }) {
  const { project: p, game, fc } = a
  const post = useApp((s) => s.postProjectUpdate)
  const toast = useApp((s) => s.toast)
  const today = todayDay()
  const todayIso = fromDay(today)
  const closed = p.status === 'Completed'

  const firstOpen = p.phases.find((x) => x.progress < 100) ?? p.phases[p.phases.length - 1]
  const [phaseId, setPhaseId] = useState(firstOpen.id)
  const phase = p.phases.find((x) => x.id === phaseId) ?? firstOpen
  const [progress, setProgress] = useState(phase.progress)
  const [note, setNote] = useState('')
  const [blocker, setBlocker] = useState('')

  const after = useMemo(() => Math.round(overallProgress(p.phases.map((x) => (x.id === phase.id ? { ...x, progress } : x)))), [p.phases, phase.id, progress])
  const postedToday = p.updates.some((u) => u.date === todayIso)
  const authorId = phase.ownerId

  // Last 14 working days, oldest → newest, for the streak strip.
  const days = useMemo(() => {
    const out: { day: number; posted: boolean }[] = []
    const posted = new Set(p.updates.map((u) => toDay(u.date)))
    for (let d = today; out.length < 14 && d > today - 40; d--) if (isWeekday(d)) out.unshift({ day: d, posted: posted.has(d) })
    return out
  }, [p.updates, today])

  const grouped = useMemo(() => {
    const m = new Map<string, typeof p.updates>()
    for (const u of p.updates) m.set(u.date, [...(m.get(u.date) ?? []), u])
    return [...m.entries()]
  }, [p])

  function pickPhase(id: string) {
    setPhaseId(id)
    setProgress(p.phases.find((x) => x.id === id)?.progress ?? 0)
  }

  function submit() {
    if (!note.trim()) return toast('Add a line on what happened today', 'error')
    if (progress < phase.progress) return toast('Progress can only move forward — raise the slider', 'error')
    const res = post(p.id, { phaseId: phase.id, progress, note: note.trim(), blocker: blocker.trim() || undefined, authorId })
    setNote('')
    setBlocker('')
    if (res.phaseCompleted || res.projectCompleted) onCelebrate()
    const next = p.phases.find((x) => x.progress < 100 && x.id !== phase.id)
    if (res.phaseCompleted && next) pickPhase(next.id)
  }

  return (
    <div className="grid gap-4 lg:grid-cols-12">
      <Card className="lg:col-span-7">
        <CardHeader title={closed ? 'Project delivered' : "Post today's update"} subtitle={closed ? 'This project is closed — the feed below is the record.' : postedToday ? 'Already posted today — you can add another.' : 'A quick check-in keeps the forecast honest and the streak alive.'} />
        {!closed && (
          <div className="mt-4 grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Phase">
                <Select className="w-full" value={phase.id} onChange={(e) => pickPhase(e.target.value)}>
                  {p.phases.map((x) => <option key={x.id} value={x.id}>{x.name} ({x.progress}%)</option>)}
                </Select>
              </Field>
              <Field label={`Phase progress — ${progress}%`}>
                <input type="range" min={phase.progress} max={100} step={1} value={progress} onChange={(e) => setProgress(Number(e.target.value))} className="mt-3 w-full accent-[#262825]" />
              </Field>
            </div>
            <Field label="What happened today">
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Wireframes signed off; API contracts frozen…" className="w-full resize-none rounded-xl border border-line bg-white/90 px-3.5 py-2.5 text-sm outline-none transition-all placeholder:text-ash/60 focus:border-ink/40 focus:bg-white focus:shadow-sm" />
            </Field>
            <Field label="Blocker (optional)"><Input value={blocker} onChange={(e) => setBlocker(e.target.value)} placeholder="Anything stopping the team?" /></Field>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-ash">
                Project would move <b className="text-ink">{Math.round(fc.progress)}% → {after}%</b>
                {progress >= 100 && phase.progress < 100 && <span className="ml-2 font-bold text-sage-deep">🎉 completes this phase</span>}
                <span className="ml-2 rounded-full bg-lime/70 px-2 py-0.5 text-[10px] font-bold text-[#495d16]">+10 XP</span>
              </p>
              <Button onClick={submit}><Send size={14} /> Post update</Button>
            </div>
          </div>
        )}
      </Card>

      <Card className="lg:col-span-5">
        <CardHeader title="Streak" subtitle="Working days in a row with an update" action={<span className="grid size-8 place-items-center rounded-full bg-amber/70 text-amber-deep"><Flame size={15} /></span>} />
        <div className="mt-3 flex items-end gap-2">
          <p className="font-display text-5xl font-semibold leading-none tabular-nums">{game.streak}</p>
          <p className="pb-1 text-sm text-ash">day{game.streak === 1 ? '' : 's'}{game.streak >= 7 ? ' — badge earned 🔥' : ` — ${7 - game.streak} to the 7-day badge`}</p>
        </div>
        <div className="mt-4 flex gap-1.5">
          {days.map((d) => (
            <span key={d.day} title={dayLabelFull(d.day)} className={clsx('h-9 flex-1 rounded-lg', d.posted ? 'bg-gradient-to-b from-amber to-[#f0b96a]' : d.day === today ? 'border border-dashed border-amber-deep/60 bg-amber/20' : 'bg-soft')} />
          ))}
        </div>
        <p className="mt-2 text-[11px] text-ash">Last 14 working days · weekends skipped</p>
      </Card>

      <Card className="lg:col-span-12">
        <CardHeader title="Activity feed" subtitle={`${p.updates.length} updates`} />
        {grouped.length === 0 ? <div className="mt-3"><Empty>No updates yet.</Empty></div> : (
          <div className="mt-4 space-y-5">
            {grouped.map(([date, list]) => (
              <div key={date}>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-ash">{date === todayIso ? 'Today' : dayLabelFull(toDay(date))}</p>
                <ul className="space-y-2">
                  {list.map((u) => {
                    const e = employeeById(u.authorId)
                    const ph = p.phases.find((x) => x.id === u.phaseId)
                    return (
                      <li key={u.id} className="flex gap-3 rounded-2xl bg-soft/50 p-3.5">
                        {e && <Avatar name={e.name} hue={e.avatarHue} src={photoFor(e)} size={34} />}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="text-[13px] font-semibold">{e?.name}</span>
                            {ph && <Badge tone="gray" dot={false}>{ph.name}</Badge>}
                            <span className="ml-auto text-[11px] font-bold tabular-nums text-ash">{u.progress}% overall</span>
                          </div>
                          <p className="mt-1 text-[13px] text-ink/80">{u.note}</p>
                          {u.blocker && <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-rose/60 px-2.5 py-1 text-[11px] font-bold text-[#862c58]"><AlertTriangle size={11} /> {u.blocker}</p>}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

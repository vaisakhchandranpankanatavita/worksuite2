import clsx from 'clsx'
import { AlertTriangle, ArrowRight, Boxes, CheckCircle2, Clock, Receipt, Users } from 'lucide-react'
import { CountUp } from '../../../components/CountUp'
import { BadgeShelf, SlipTag } from '../../../components/projects/projectUi'
import { Avatar, Badge, Button, Card, CardHeader, Progress } from '../../../components/ui'
import { employeeById } from '../../../data/mock'
import { dayLabel, dayLabelFull, fromDay, todayDay } from '../../../lib/dates'
import { fmtCompact } from '../../../lib/format'
import { photoFor } from '../../../lib/photo'
import type { Analysis } from '../../../lib/projectMetrics'

type Go = (t: 'Timeline' | 'Resources' | 'Finance' | 'Updates') => void

/** The "was → now" projection: original commitment, approved plan, forecast, and the likely window around it. */
function ProjectionCard({ a }: { a: Analysis }) {
  const { fc, project: p, fin } = a
  const done = p.status === 'Completed'
  const pts = [fc.today, fc.baselineEnd, fc.plannedEnd, fc.projectedEnd, fc.optimisticEnd, fc.pessimisticEnd]
  const lo = Math.min(...pts) - 4
  const hi = Math.max(...pts) + 4
  const pos = (d: number) => `${((d - lo) / (hi - lo)) * 100}%`
  const worst = [...fc.phases].filter((x) => x.state !== 'done').sort((x, y) => y.slip - x.slip)[0]
  return (
    <Card className="lg:col-span-8">
      <CardHeader title="Date projection" subtitle={done ? 'Delivered' : 'Based on how fast each phase is actually moving — a late phase pushes everything after it'} action={!done && p.status !== 'Initiated' ? <SlipTag days={fc.slipDays} /> : undefined} />

      <div className="mt-5 grid grid-cols-1 items-stretch gap-3 sm:grid-cols-[1fr_auto_1fr_auto_1fr]">
        <div className="rounded-2xl border border-line/70 bg-white/60 p-4">
          <p className="text-[11px] font-bold uppercase tracking-wide text-ash">Original commitment</p>
          <p className="mt-1 font-display text-xl font-semibold tabular-nums">{dayLabelFull(fc.baselineEnd)}</p>
          <p className="mt-0.5 text-[11px] text-ash">{p.replans.length ? `Re-planned ${p.replans.length}×` : 'Never moved'}</p>
        </div>
        <ArrowRight size={18} className="hidden self-center text-ash sm:block" />
        <div className="rounded-2xl border border-line/70 bg-white/60 p-4">
          <p className="text-[11px] font-bold uppercase tracking-wide text-ash">Approved plan</p>
          <p className="mt-1 font-display text-xl font-semibold tabular-nums">{dayLabelFull(fc.plannedEnd)}</p>
          <p className="mt-0.5 text-[11px] text-ash">{fc.plannedEnd - fc.baselineEnd > 0 ? `+${fc.plannedEnd - fc.baselineEnd}d vs commitment` : 'Matches commitment'}</p>
        </div>
        <ArrowRight size={18} className="hidden self-center text-ash sm:block" />
        <div className={clsx('rounded-2xl border p-4', fc.slipDays > 7 ? 'border-rose-deep/30 bg-rose/40' : fc.slipDays > 0 ? 'border-amber-deep/30 bg-amber/40' : 'border-sage-deep/30 bg-sage/40')}>
          <p className="text-[11px] font-bold uppercase tracking-wide text-ink/60">{done ? 'Delivered' : 'Projected finish'}</p>
          <p className="mt-1 font-display text-xl font-semibold tabular-nums">{dayLabelFull(fc.projectedEnd)}</p>
          <p className="mt-0.5 text-[11px] text-ink/60">{done ? 'Project closed' : `${Math.max(0, fc.daysLeft)} days from today`}</p>
        </div>
      </div>

      {!done && (
        <div className="mt-6">
          <div className="relative h-16">
            <span className="absolute inset-x-0 top-8 h-1 rounded-full bg-soft" />
            <span className="absolute top-[26px] h-3 rounded-full bg-ink/10" style={{ left: pos(fc.optimisticEnd), width: `calc(${pos(fc.pessimisticEnd)} - ${pos(fc.optimisticEnd)})` }} title="Likely finish window (fast pace ↔ slow pace)" />
            {[
              { d: fc.today, l: 'Today', c: 'bg-ink', up: true },
              { d: fc.baselineEnd, l: 'Commitment', c: 'bg-ink/40', up: false },
              { d: fc.plannedEnd, l: 'Plan', c: 'bg-sky-deep', up: true },
              { d: fc.projectedEnd, l: 'Forecast', c: fc.slipDays > 0 ? 'bg-rose-deep' : 'bg-sage-deep', up: false },
            ].map((m) => (
              <span key={m.l} className="absolute -translate-x-1/2" style={{ left: pos(m.d), top: m.up ? 0 : 36 }}>
                <span className={clsx('block whitespace-nowrap text-center text-[10px] font-bold uppercase tracking-wide text-ash', !m.up && 'order-2')}>
                  {m.up && <>{m.l}<br /></>}
                </span>
                <span className={clsx('mx-auto block size-3 rounded-full ring-2 ring-white', m.c)} style={{ marginTop: m.up ? 2 : 0 }} />
                {!m.up && <span className="block whitespace-nowrap pt-0.5 text-center text-[10px] font-bold uppercase tracking-wide text-ash">{m.l}</span>}
              </span>
            ))}
          </div>
          <p className="mt-3 text-xs text-ash">
            Likely window <b className="text-ink">{dayLabel(fc.optimisticEnd)} – {dayLabel(fc.pessimisticEnd)}</b> · chance of landing by the approved plan{' '}
            <b className="text-ink">{Math.round(fc.onTimeChance)}%</b>
          </p>
        </div>
      )}

      {!done && (
        <ul className="mt-4 space-y-2 rounded-2xl bg-soft/60 p-4 text-[13px] text-ink/80">
          <li className="flex gap-2"><span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-ink/50" />Running at <b>{Math.round(fc.spi * 100)}%</b> of planned pace ({Math.round(fc.progress)}% done vs {Math.round(fc.plannedPct)}% planned).</li>
          {worst && worst.slip > 0 && <li className="flex gap-2"><span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-rose-deep" />“{worst.phase.name}” is the biggest drag — projected {worst.slip} days past its planned end{worst.state === 'pending' ? ' because earlier phases are pushing it back' : ''}.</li>}
          {fc.slipDays > 0 && fin.delayCost > 0 && <li className="flex gap-2"><span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-amber-deep" />Each day of delay costs about <b>{fmtCompact(fin.dailyBurn)}</b> in team time — {fmtCompact(fin.delayCost)} so far in the forecast.</li>}
          {fc.slipDays <= 0 && p.status === 'In Progress' && <li className="flex gap-2"><span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-sage-deep" />On course to finish {fc.slipDays < 0 ? `${-fc.slipDays} days ahead of plan` : 'on plan'}.</li>}
        </ul>
      )}
    </Card>
  )
}

export default function OverviewTab({ a, go }: { a: Analysis; go: Go }) {
  const { project: p, fc, fin, health, game } = a
  const todayIso = fromDay(todayDay())
  const latest = p.updates[0]
  const author = latest ? employeeById(latest.authorId) : undefined
  const posted = latest?.date === todayIso
  const people = p.team.filter((m) => !m.until)
  const assets = p.assetLinks.filter((l) => !l.until)
  const running = p.status === 'In Progress' || p.status === 'On Hold'

  const kpis = [
    { label: 'Progress', value: `${Math.round(fc.progress)}%`, sub: `plan says ${Math.round(fc.plannedPct)}%`, tone: fc.progress >= fc.plannedPct - 2 ? 'bg-sage/50' : 'bg-amber/50' },
    { label: 'Days to finish', value: p.status === 'Completed' ? '—' : String(Math.max(0, fc.daysLeft)), sub: p.status === 'Completed' ? 'delivered' : `finish ${dayLabel(fc.projectedEnd)}`, tone: 'bg-sky/50' },
    { label: 'On-time chance', value: `${Math.round(fc.onTimeChance)}%`, sub: `by ${dayLabel(fc.plannedEnd)}`, tone: fc.onTimeChance >= 60 ? 'bg-sage/50' : fc.onTimeChance >= 25 ? 'bg-amber/50' : 'bg-rose/50' },
    { label: 'Funds used', value: fmtCompact(fin.used), sub: `${Math.round((fin.used / (fin.allotted || 1)) * 100)}% of ${fmtCompact(fin.allotted)} allotted`, tone: fin.used > fin.allotted ? 'bg-rose/50' : 'bg-lime/50' },
    { label: 'Forecast cost', value: fmtCompact(fin.eac), sub: fin.overrun > 0 ? `${fmtCompact(fin.overrun)} over budget` : `${fmtCompact(-fin.overrun)} under budget`, tone: fin.overrun > 0 ? 'bg-rose/50' : 'bg-sage/50' },
  ]

  return (
    <div className="stagger grid gap-4 lg:grid-cols-12">
      <div className="grid gap-4 sm:grid-cols-2 lg:col-span-12 lg:grid-cols-5">
        {kpis.map((k) => (
          <Card key={k.label} className={clsx('!p-4', k.tone)}>
            <p className="text-xs text-ink/60">{k.label}</p>
            <p className="mt-1.5 font-display text-2xl font-semibold leading-none tracking-tight"><CountUp value={k.value} /></p>
            <p className="mt-2 text-[11px] text-ink/60">{k.sub}</p>
          </Card>
        ))}
      </div>

      <ProjectionCard a={a} />

      {/* today's status */}
      <Card className="lg:col-span-4">
        <CardHeader title="Today's status" subtitle={dayLabelFull(todayDay())} action={
          posted ? <Badge tone="green">Posted</Badge> : running ? <Badge tone="amber">Awaiting update</Badge> : undefined
        } />
        {latest ? (
          <div className="mt-4">
            <div className="flex items-center gap-2.5">
              {author && <Avatar name={author.name} hue={author.avatarHue} src={photoFor(author)} size={34} />}
              <div className="leading-tight">
                <p className="text-[13px] font-semibold">{author?.name}</p>
                <p className="text-[11px] text-ash">{posted ? 'Today' : `Last update ${dayLabel(todayDay() - fc.lastUpdateAge)}`} · {p.phases.find((x) => x.id === latest.phaseId)?.name}</p>
              </div>
            </div>
            <p className="mt-3 rounded-2xl bg-soft/70 p-3.5 text-[13px] leading-relaxed">“{latest.note}”</p>
            {latest.blocker && (
              <p className="mt-2 flex items-start gap-2 rounded-2xl bg-rose/50 p-3 text-xs text-[#862c58]"><AlertTriangle size={14} className="mt-0.5 shrink-0" /> Blocker: {latest.blocker}</p>
            )}
            {fc.stalled && <p className="mt-2 flex items-start gap-2 rounded-2xl bg-amber/50 p-3 text-xs text-[#6b4a10]"><Clock size={14} className="mt-0.5 shrink-0" /> No update for {fc.lastUpdateAge} days — the forecast is less reliable until the team checks in.</p>}
          </div>
        ) : (
          <p className="mt-4 rounded-2xl bg-soft/70 p-4 text-sm text-ash">No updates yet — post the first one to start the streak.</p>
        )}
        {running && !posted && <Button size="sm" className="mt-4 self-start" onClick={() => go('Updates')}>Post today's update</Button>}
      </Card>

      {/* phases */}
      <Card className="lg:col-span-7">
        <CardHeader title="Phases" subtitle="Waterfall stages, in order" action={<Button size="sm" variant="ghost" onClick={() => go('Timeline')}>Open timeline <ArrowRight size={13} /></Button>} />
        <ol className="mt-4 space-y-3">
          {fc.phases.map((pf, i) => {
            const owner = employeeById(pf.phase.ownerId)
            return (
              <li key={pf.phase.id} className="flex items-center gap-3">
                <span className={clsx('grid size-7 shrink-0 place-items-center rounded-full text-[11px] font-bold', pf.state === 'done' ? 'bg-sage-deep text-white' : pf.state === 'active' ? 'bg-ink text-white' : 'bg-soft text-ash')}>
                  {pf.state === 'done' ? <CheckCircle2 size={14} /> : i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-[13px] font-semibold">{pf.phase.name}</span>
                    <span className="shrink-0 text-[11px] tabular-nums text-ash">{dayLabel(pf.projStart)} → {dayLabel(pf.projEnd)}</span>
                  </div>
                  <Progress value={pf.phase.progress} className="mt-1.5 !h-1.5" tone={pf.state === 'done' ? 'sage' : pf.slip > 7 ? 'rose' : 'ink'} />
                </div>
                {owner && <Avatar name={owner.name} hue={owner.avatarHue} src={photoFor(owner)} size={26} />}
              </li>
            )
          })}
        </ol>
      </Card>

      {/* achievements */}
      <Card className="lg:col-span-5">
        <CardHeader title="Achievements" subtitle={`Level ${game.level} · ${game.xp} XP · ${game.badges.filter((b) => b.earned).length}/${game.badges.length} badges`} />
        <div className="mt-3">
          <div className="mb-1 flex justify-between text-[11px] text-ash"><span>Level {game.level}</span><span className="tabular-nums">{game.levelEnd - game.xp} XP to level {game.level + 1}</span></div>
          <Progress value={((game.xp - game.levelStart) / (game.levelEnd - game.levelStart)) * 100} tone="lime" />
        </div>
        <div className="mt-4"><BadgeShelf badges={game.badges} compact /></div>
        <p className="mt-3 text-[11px] text-ash">Health {health.score}: schedule {health.parts.schedule} · budget {health.parts.budget} · updates {health.parts.cadence} · risk {health.parts.risk}</p>
      </Card>

      {/* linked resources */}
      <div className="grid gap-4 sm:grid-cols-3 lg:col-span-12">
        <button onClick={() => go('Resources')} className="card animate-in flex items-center gap-4 p-5 text-left">
          <span className="grid size-11 place-items-center rounded-full bg-sky/70 text-sky-deep"><Users size={19} /></span>
          <span><span className="block font-display text-xl font-semibold tabular-nums">{people.length} people</span><span className="text-xs text-ash">{people.reduce((t, m) => t + m.allocation / 100, 0).toFixed(1)} FTE · {fmtCompact(fin.people)} salary cost to date</span></span>
        </button>
        <button onClick={() => go('Resources')} className="card animate-in flex items-center gap-4 p-5 text-left">
          <span className="grid size-11 place-items-center rounded-full bg-sage/70 text-sage-deep"><Boxes size={19} /></span>
          <span><span className="block font-display text-xl font-semibold tabular-nums">{assets.length} assets</span><span className="text-xs text-ash">{fmtCompact(fin.assetCharge)} depreciation charged</span></span>
        </button>
        <button onClick={() => go('Finance')} className="card animate-in flex items-center gap-4 p-5 text-left">
          <span className="grid size-11 place-items-center rounded-full bg-lime/70 text-[#495d16]"><Receipt size={19} /></span>
          <span><span className="block font-display text-xl font-semibold tabular-nums">{fmtCompact(fin.expenseClaims + fin.vendors)}</span><span className="text-xs text-ash">{fin.expenses.length} expense claims + {p.vendors.length} vendor payments</span></span>
        </button>
      </div>
    </div>
  )
}

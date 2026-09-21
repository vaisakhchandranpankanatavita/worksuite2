import clsx from 'clsx'
import { ArrowRight, Boxes, CheckCircle2, Clock, Flame, Medal, Plus, Receipt, Users, Zap } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { CountUp } from '../../components/CountUp'
import { HealthRing, SlipTag } from '../../components/projects/projectUi'
import RaceTrack from '../../components/projects/RaceTrack'
import { Avatar, Badge, Button, Card, CardHeader, PageHeader, Progress, chartTooltip } from '../../components/ui'
import { DEPARTMENTS, employeeById } from '../../data/mock'
import { dayLabel, fromDay, todayDay } from '../../lib/dates'
import { fmtCompact } from '../../lib/format'
import { photoFor } from '../../lib/photo'
import { deptDraw } from '../../lib/projectMetrics'
import NewProjectModal from './NewProjectModal'
import { PORTFOLIO_TITLES, useAnalyzed } from './useAnalyzed'

const XP_PER_LEVEL = 250
const RANK_ICON = ['text-amber-deep', 'text-ash', 'text-[#a8703a]']

export default function ProjectsDashboard() {
  const nav = useNavigate()
  const rows = useAnalyzed()
  const [creating, setCreating] = useState(false)
  const today = todayDay()
  const todayIso = fromDay(today)

  const s = useMemo(() => {
    const live = rows.filter((r) => r.project.status !== 'Completed')
    const running = rows.filter((r) => r.project.status === 'In Progress' || r.project.status === 'On Hold')
    const avgHealth = live.length ? Math.round(live.reduce((t, r) => t + r.health.score, 0) / live.length) : 100
    const budget = rows.reduce((t, r) => t + r.fin.budget, 0)
    const allotted = rows.reduce((t, r) => t + r.fin.allotted, 0)
    const used = rows.reduce((t, r) => t + r.fin.used, 0)
    const eac = rows.reduce((t, r) => t + r.fin.eac, 0)
    const xp = rows.reduce((t, r) => t + r.game.xp, 0)
    const level = 1 + Math.floor(Math.sqrt(xp / XP_PER_LEVEL))
    const posted = running.filter((r) => r.project.updates[0]?.date === todayIso).length
    const slipping = live.filter((r) => r.fc.slipDays > 0)
    return {
      live, running, avgHealth, budget, allotted, used, eac, xp, level, posted, slipping,
      onTrack: live.filter((r) => r.health.tone === 'green').length,
      atRisk: live.filter((r) => r.health.tone === 'amber').length,
      delayed: live.filter((r) => r.health.tone === 'rose').length,
      levelStart: XP_PER_LEVEL * (level - 1) ** 2,
      levelEnd: XP_PER_LEVEL * level ** 2,
    }
  }, [rows, todayIso])

  const chart = rows.map((r) => ({ name: r.project.code.replace('PRJ-', '#'), full: r.project.name, Budget: r.fin.budget, Allotted: r.fin.allotted, Used: Math.round(r.fin.used) }))

  // Project heads ranked by the XP their projects have earned.
  const league = useMemo(() => {
    const m = new Map<string, { id: string; xp: number; n: number; health: number; badges: number }>()
    for (const r of rows) {
      const cur = m.get(r.project.headId) ?? { id: r.project.headId, xp: 0, n: 0, health: 0, badges: 0 }
      cur.xp += r.game.xp; cur.n++; cur.health += r.health.score; cur.badges += r.game.badges.filter((b) => b.earned).length
      m.set(r.project.headId, cur)
    }
    return [...m.values()].sort((a, b) => b.xp - a.xp).slice(0, 5)
  }, [rows])

  // How much of the cross-module resource pool the projects are consuming.
  const resources = useMemo(() => {
    const active = rows.filter((r) => r.project.status !== 'Completed')
    const fte = active.reduce((t, r) => t + r.project.team.filter((m) => !m.until).reduce((x, m) => x + m.allocation / 100, 0), 0)
    const people = active.reduce((t, r) => t + r.project.team.filter((m) => !m.until).length, 0)
    const assetCount = active.reduce((t, r) => t + r.project.assetLinks.filter((l) => !l.until).length, 0)
    const claims = rows.reduce((t, r) => t + r.fin.expenseClaims, 0)
    const billed = rows.reduce((t, r) => t + r.fin.billed, 0)
    const collected = rows.reduce((t, r) => t + r.fin.collected, 0)
    const peopleCost = rows.reduce((t, r) => t + r.fin.people, 0)
    const assetCharge = rows.reduce((t, r) => t + r.fin.assetCharge, 0)
    const draws = DEPARTMENTS.map((d) => ({ dept: d, ...deptDraw(rows, d) })).filter((d) => d.committed > 0)
    return { fte, people, assetCount, claims, billed, collected, peopleCost, assetCharge, draws }
  }, [rows])

  // Projects that still owe an update come first.
  const nudges = [...s.running].sort((a, b) => Number(a.project.updates[0]?.date === todayIso) - Number(b.project.updates[0]?.date === todayIso))
  const overrun = s.eac - s.budget
  const race = [...rows].sort((a, b) => (b.project.status === 'Completed' ? 0 : 1) - (a.project.status === 'Completed' ? 0 : 1) || (a.fc.progress - a.fc.plannedPct) - (b.fc.progress - b.fc.plannedPct))

  return (
    <div>
      <PageHeader
        title="Mission Control"
        subtitle={`${rows.length} projects · ${s.live.length} in flight · ${dayLabel(today)}`}
        actions={<Button onClick={() => setCreating(true)}><Plus size={15} /> New project</Button>}
      />

      <div className="stagger grid gap-4 lg:grid-cols-12">
        {/* ── Hero: portfolio level ── */}
        <Card dark className="lg:col-span-5">
          <div className="flex items-center gap-5">
            <div className="relative shrink-0">
              <HealthRing score={s.avgHealth} tone={s.avgHealth >= 80 ? 'green' : s.avgHealth >= 62 ? 'amber' : 'rose'} size={112} label="health" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-white/50">Delivery league</p>
              <p className="font-display text-2xl font-semibold leading-tight text-white">Level {s.level} · {PORTFOLIO_TITLES[Math.min(s.level - 1, PORTFOLIO_TITLES.length - 1)]}</p>
              <p className="mt-1 text-xs text-white/60"><span className="tabular-nums">{s.xp.toLocaleString('en-IN')}</span> XP earned by all projects</p>
            </div>
          </div>
          <div className="mt-5">
            <div className="mb-1.5 flex justify-between text-[11px] text-white/60">
              <span>Next: Level {s.level + 1}</span>
              <span className="tabular-nums">{s.levelEnd - s.xp} XP to go</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-gradient-to-r from-lime-deep to-lime transition-all duration-1000" style={{ width: `${((s.xp - s.levelStart) / (s.levelEnd - s.levelStart)) * 100}%` }} />
            </div>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-2 text-center">
            {[
              { n: s.onTrack, l: 'On track', c: 'bg-sage/25 text-sage' },
              { n: s.atRisk, l: 'At risk', c: 'bg-amber/25 text-amber' },
              { n: s.delayed, l: 'Delayed', c: 'bg-rose/25 text-rose' },
            ].map((x) => (
              <div key={x.l} className={clsx('rounded-2xl px-2 py-2.5', x.c)}>
                <p className="font-display text-xl font-semibold leading-none tabular-nums">{x.n}</p>
                <p className="mt-1 text-[11px] opacity-80">{x.l}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* ── Portfolio money ── */}
        <div className="grid gap-4 sm:grid-cols-2 lg:col-span-7 lg:grid-cols-3">
          {[
            { label: 'Approved budget', value: fmtCompact(s.budget), sub: `${rows.length} projects`, tone: 'bg-sky/50' },
            { label: 'Allotted so far', value: fmtCompact(s.allotted), sub: `${Math.round((s.allotted / s.budget) * 100)}% of budget released`, tone: 'bg-lime/50' },
            { label: 'Used', value: fmtCompact(s.used), sub: `${Math.round((s.used / s.allotted) * 100)}% of allotted funds`, tone: 'bg-sage/50' },
            { label: overrun > 0 ? 'Forecast overrun' : 'Forecast saving', value: fmtCompact(Math.abs(overrun)), sub: `Forecast at completion ${fmtCompact(s.eac)}`, tone: overrun > 0 ? 'bg-rose/50' : 'bg-sage/50' },
            { label: 'Slipping projects', value: String(s.slipping.length), sub: s.slipping.length ? `Worst: +${Math.max(...s.slipping.map((r) => r.fc.slipDays))} days` : 'Everything on plan', tone: 'bg-amber/50' },
            { label: 'Updates today', value: `${s.posted}/${s.running.length}`, sub: s.posted === s.running.length ? 'Everyone has checked in' : `${s.running.length - s.posted} still to post`, tone: 'bg-white/80' },
          ].map((k) => (
            <Card key={k.label} className={clsx('!p-4', k.tone)}>
              <p className="text-xs text-ink/60">{k.label}</p>
              <p className="mt-1.5 font-display text-[26px] font-semibold leading-none tracking-tight"><CountUp value={k.value} /></p>
              <p className="mt-2 text-[11px] text-ink/60">{k.sub}</p>
            </Card>
          ))}
        </div>

        {/* ── Race track ── */}
        <Card className="lg:col-span-8">
          <CardHeader title="The race to the finish" subtitle="Actual progress against where the plan says each project should be today" />
          <RaceTrack rows={race} onOpen={(id) => nav(`/projects/${id}`)} />
        </Card>

        {/* ── Today's pulse ── */}
        <Card className="lg:col-span-4">
          <CardHeader
            title="Today's pulse"
            subtitle={`${s.posted} of ${s.running.length} projects have posted today`}
            action={<span className="grid size-8 place-items-center rounded-full bg-lime/70"><Zap size={14} /></span>}
          />
          <ul className="scroll-thin mt-3 -mr-2 max-h-[360px] space-y-1 overflow-y-auto pr-2">
            {nudges.map((r) => {
              const u = r.project.updates[0]
              const posted = u?.date === todayIso
              return (
                <li key={r.project.id}>
                  <button onClick={() => nav(`/projects/${r.project.id}?tab=updates`)} className="clickable group flex w-full items-start gap-3 rounded-xl px-2 py-2.5 text-left">
                    <span className={clsx('mt-0.5 grid size-6 shrink-0 place-items-center rounded-full', posted ? 'bg-sage text-sage-deep' : 'bg-amber text-amber-deep')}>
                      {posted ? <CheckCircle2 size={14} /> : <Clock size={14} />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="clickable-title truncate text-[13px] font-semibold transition-colors">{r.project.name}</span>
                        {r.project.status === 'On Hold' && <Badge tone="gray" dot={false}>On hold</Badge>}
                      </span>
                      <span className="mt-0.5 line-clamp-2 text-xs text-ash">
                        {posted ? u.note : u ? `Awaiting today's update — last: ${u.note}` : 'No updates yet'}
                      </span>
                      {u?.blocker && <span className="mt-1 inline-block rounded-full bg-rose/70 px-2 py-0.5 text-[10px] font-bold text-[#862c58]">Blocker · {u.blocker}</span>}
                    </span>
                    {r.game.streak >= 3 && <span className="mt-0.5 inline-flex items-center gap-0.5 text-[11px] font-bold text-amber-deep"><Flame size={12} />{r.game.streak}</span>}
                  </button>
                </li>
              )
            })}
          </ul>
        </Card>

        {/* ── Budget vs allotment vs used ── */}
        <Card className="lg:col-span-7">
          <CardHeader title="Budget · allotment · usage" subtitle="Approved budget, funds released so far, and what has actually been used — by project" />
          <div className="mt-3">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chart} margin={{ top: 12, right: 0, left: -6, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#edf0ed" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tickFormatter={fmtCompact} width={58} tick={{ fontSize: 10 }} />
                <Tooltip {...chartTooltip} cursor={{ fill: 'rgba(38,40,37,0.04)' }} labelFormatter={(l, p) => p?.[0]?.payload?.full ?? l} formatter={(v: number) => fmtCompact(v)} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Budget" fill="#e3e8e3" radius={[6, 6, 2, 2]} barSize={12} />
                <Bar dataKey="Allotted" fill="#aece52" radius={[6, 6, 2, 2]} barSize={12} />
                <Bar dataKey="Used" fill="#262825" radius={[6, 6, 2, 2]} barSize={12} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* ── Date projections watchlist ── */}
        <Card className="lg:col-span-5">
          <CardHeader title="Date projections" subtitle="Where the finish line is really heading, based on how fast work is actually moving" />
          <ul className="mt-3 space-y-3">
            {[...s.live].filter((r) => r.project.status !== 'Initiated').sort((a, b) => b.fc.slipDays - a.fc.slipDays).slice(0, 5).map((r) => (
              <li key={r.project.id}>
                <button onClick={() => nav(`/projects/${r.project.id}?tab=timeline`)} className="clickable group w-full rounded-xl px-2 py-1.5 text-left">
                  <div className="flex items-center justify-between gap-2">
                    <span className="clickable-title truncate text-[13px] font-semibold transition-colors">{r.project.name}</span>
                    <SlipTag days={r.fc.slipDays} />
                  </div>
                  <div className="mt-1.5 flex items-center gap-2 text-[11px] text-ash">
                    <span className="tabular-nums">Plan {dayLabel(r.fc.plannedEnd)}</span>
                    <ArrowRight size={11} />
                    <span className="font-bold tabular-nums text-ink">Now {dayLabel(r.fc.projectedEnd)}</span>
                    <span className="ml-auto tabular-nums">{Math.round(r.fc.onTimeChance)}% on-time</span>
                  </div>
                  <Progress value={r.fc.onTimeChance} className="mt-1.5 !h-1.5" tone={r.fc.onTimeChance >= 60 ? 'sage' : r.fc.onTimeChance >= 25 ? 'lime' : 'rose'} />
                </button>
              </li>
            ))}
          </ul>
        </Card>

        {/* ── Resource flow ── */}
        <Card className="lg:col-span-7">
          <CardHeader title="Where our resources go" subtitle="People, assets and money drawn from the other modules into projects" />
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <button onClick={() => nav('/hr/employees')} className="clickable-tile rounded-2xl border border-line/70 bg-sky/25 p-4 text-left hover:bg-sky/40">
              <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-sky-deep"><Users size={14} /> People</span>
              <p className="mt-2 font-display text-2xl font-semibold tabular-nums">{resources.fte.toFixed(1)} <span className="text-sm font-medium text-ash">FTE</span></p>
              <p className="mt-1 text-xs text-ash">{resources.people} allocations · {fmtCompact(resources.peopleCost)} salary cost to date</p>
            </button>
            <button onClick={() => nav('/assets/inventory')} className="clickable-tile rounded-2xl border border-line/70 bg-sage/25 p-4 text-left hover:bg-sage/40">
              <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-sage-deep"><Boxes size={14} /> Assets</span>
              <p className="mt-2 font-display text-2xl font-semibold tabular-nums">{resources.assetCount} <span className="text-sm font-medium text-ash">deployed</span></p>
              <p className="mt-1 text-xs text-ash">{fmtCompact(resources.assetCharge)} depreciation charged to projects</p>
            </button>
            <button onClick={() => nav('/finance/invoices')} className="clickable-tile rounded-2xl border border-line/70 bg-lime/30 p-4 text-left hover:bg-lime/50">
              <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[#495d16]"><Receipt size={14} /> Finance</span>
              <p className="mt-2 font-display text-2xl font-semibold tabular-nums">{fmtCompact(resources.claims)} <span className="text-sm font-medium text-ash">claims</span></p>
              <p className="mt-1 text-xs text-ash">{fmtCompact(resources.billed)} billed · {fmtCompact(resources.collected)} collected</p>
            </button>
          </div>
          <div className="mt-5 space-y-2.5">
            <p className="text-[11px] font-bold uppercase tracking-wide text-ash/80">Department budget committed to projects</p>
            {resources.draws.map((d) => {
              const pctC = (d.committed / d.allocated) * 100
              return (
                <div key={d.dept} className="flex items-center gap-3">
                  <span className="w-32 shrink-0 truncate text-xs font-semibold">{d.dept}</span>
                  <Progress value={pctC} className="flex-1" tone={pctC > 100 ? 'rose' : 'lime'} />
                  <span className="w-28 shrink-0 text-right text-[11px] tabular-nums text-ash">{fmtCompact(d.committed)} of {fmtCompact(d.allocated)}</span>
                </div>
              )
            })}
          </div>
        </Card>

        {/* ── League table ── */}
        <Card className="lg:col-span-5">
          <CardHeader title="Project head league" subtitle="Ranked by XP — phases delivered, update streaks, schedule and budget discipline" action={<span className="grid size-8 place-items-center rounded-full bg-amber/70"><Medal size={15} /></span>} />
          <ol className="mt-3 space-y-1">
            {league.map((l, i) => {
              const e = employeeById(l.id)
              if (!e) return null
              const lvl = 1 + Math.floor(Math.sqrt(l.xp / 60 / Math.max(1, l.n)))
              return (
                <li key={l.id} className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-soft">
                  <span className={clsx('w-5 text-center font-display text-sm font-bold', RANK_ICON[i] ?? 'text-ash/60')}>{i + 1}</span>
                  <Avatar name={e.name} hue={e.avatarHue} src={photoFor(e)} size={34} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold">{e.name}</span>
                    <span className="block text-[11px] text-ash">{l.n} project{l.n > 1 ? 's' : ''} · health {Math.round(l.health / l.n)} · {l.badges} badges</span>
                  </span>
                  <span className="text-right">
                    <span className="block font-display text-sm font-semibold tabular-nums">{l.xp.toLocaleString('en-IN')}</span>
                    <span className="block text-[10px] font-bold uppercase tracking-wide text-ash">LV {lvl}</span>
                  </span>
                </li>
              )
            })}
          </ol>
          <button onClick={() => nav('/projects/portfolio')} className="group mt-3 inline-flex items-center gap-1.5 self-start text-xs font-semibold text-ash transition-colors hover:text-ink">
            See every project <ArrowRight size={13} className="transition-transform duration-300 group-hover:translate-x-1" />
          </button>
        </Card>
      </div>

      <NewProjectModal open={creating} onClose={() => setCreating(false)} />
    </div>
  )
}

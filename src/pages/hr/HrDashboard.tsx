import clsx from 'clsx'
import { AlertTriangle, ArrowUp, Briefcase, CalendarDays, Cake, CheckCircle2, Plus, Receipt, TrendingDown, TrendingUp, UserPlus, Users, Wallet } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts'
import { AttendanceHeatmap, DonutChart, GroupedBar, HalfGauge, HatchedArea, HeroArt, MultiLineChart, RadialProgress, SoftBars, Sparkline } from '../../components/charts'
import { CountUp } from '../../components/CountUp'
import AiInsights from '../../components/AiInsights'
import { Avatar, AvatarStack, Badge, Button, Card, CardHeader, CornerLink, IconBtn, Segmented, chartTooltip } from '../../components/ui'
import { DEPARTMENTS, TODAY, activity, attendanceTrend, departmentAttendance, employeeById, employees, headcountTrend, jobs, schedule, todayAttendance } from '../../data/mock'
import { fmtShortDate } from '../../lib/format'
import { photoFor } from '../../lib/photo'
import { useParallax } from '../../lib/useParallax'
import { useApp } from '../../store'

const ACTIVITY_STYLE: Record<import('../../data/mock').ActivityType, { icon: typeof Wallet; ring: string; text: string }> = {
  leave:       { icon: CalendarDays, ring: 'bg-amber',   text: 'text-[#80591a]' },
  payroll:     { icon: Wallet,       ring: 'bg-ink',     text: 'text-white' },
  payment:     { icon: CheckCircle2, ring: 'bg-sage',    text: 'text-[#2f6b2b]' },
  recruitment: { icon: Briefcase,    ring: 'bg-lime',    text: 'text-[#56691d]' },
  expense:     { icon: Receipt,      ring: 'bg-sky',     text: 'text-[#2d5597]' },
  onboarding:  { icon: UserPlus,     ring: 'bg-sage',    text: 'text-[#2f6b2b]' },
  alert:       { icon: AlertTriangle,ring: 'bg-rose',    text: 'text-[#9b3563]' },
}

// Derived attrition trend from headcount
const attritionTrend = headcountTrend.map((m) => ({
  month: m.month,
  rate: m.total > 0 ? +((m.exits / m.total) * 100).toFixed(1) : 0,
  hires: m.hires,
  exits: m.exits,
}))

// Performance distribution
const perfDist = [
  { label: 'Exceptional (5)', value: employees.filter((e) => e.performance >= 4.5).length, fill: '#aece52' },
  { label: 'Strong (4–4.4)', value: employees.filter((e) => e.performance >= 4 && e.performance < 4.5).length, fill: '#5fa059' },
  { label: 'Meets (3–3.9)', value: employees.filter((e) => e.performance >= 3 && e.performance < 4).length, fill: '#c8d9f4' },
  { label: 'Below (< 3)', value: employees.filter((e) => e.performance < 3).length, fill: '#f0cad8' },
]

// Heatmap data — 10 weeks × 5 days
const heatmapData = Array.from({ length: 50 }, (_, i) => ({
  week: Math.floor(i / 5),
  day: i % 5,
  value: 70 + Math.round(Math.random() * 28),
}))

// Dept headcount + attendance donut
const deptData = DEPARTMENTS.map((d) => ({
  name: d.replace('Human Resources', 'HR').replace('Customer Success', 'CS'),
  value: employees.filter((e) => e.department === d).length,
}))
const DEPT_COLORS = ['#1a1d1b', '#d8eca0', '#c8d9f4', '#c6e0c0', '#f0cad8', '#f5ddb2', '#aece52', '#6b92d8']

export default function HrDashboard() {
  const nav = useNavigate()
  const { leaves, candidates, setLeaveStatus } = useApp()
  const [range, setRange] = useState<'6M' | '12M'>('12M')
  const [attrRange, setAttrRange] = useState<'6M' | '12M'>('12M')

  // Parallax layers — different depths for visual separation
  const headerParallax = useParallax(0.12) // page title drifts very slightly upward
  const heroParallax   = useParallax(0.22) // hero art card drifts a bit more

  const counts = useMemo(() => {
    const c = { Present: 0, Remote: 0, Absent: 0, 'On Leave': 0, Late: 0 }
    todayAttendance.forEach((a) => c[a.status]++)
    return c
  }, [])
  const present = counts.Present + counts.Late
  const attendanceRate = ((present + counts.Remote) / employees.length) * 100
  const pending = leaves.filter((l) => l.status === 'Pending')
  const openings = jobs.reduce((s, j) => s + j.openings, 0)

  const days = [0, 1, 2].map((d) => {
    const x = new Date(TODAY)
    x.setDate(x.getDate() + d)
    return x.toISOString().slice(0, 10)
  })
  const [day, setDay] = useState(days[0])

  const celebrations = useMemo(() => {
    const m = TODAY.getMonth()
    return employees.flatMap((e) => {
      const out: { e: typeof e; kind: 'Birthday' | 'Anniversary'; date: Date; years?: number }[] = []
      const b = new Date(e.dob)
      const bd = new Date(TODAY.getFullYear(), b.getMonth(), b.getDate())
      if (b.getMonth() === m && bd >= TODAY) out.push({ e, kind: 'Birthday', date: bd })
      const j = new Date(e.joinDate)
      const jd = new Date(TODAY.getFullYear(), j.getMonth(), j.getDate())
      const years = TODAY.getFullYear() - j.getFullYear()
      if (years > 0 && j.getMonth() === m && jd >= TODAY) out.push({ e, kind: 'Anniversary', date: jd, years })
      return out
    }).sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, 5)
  }, [])

  const trend = range === '6M' ? headcountTrend.slice(-6) : headcountTrend
  const attrSeries = attrRange === '6M' ? attritionTrend.slice(-6) : attritionTrend

  const avgPerf = (employees.reduce((s, e) => s + e.performance, 0) / employees.length)
  const avgPerfPct = Math.round((avgPerf / 5) * 100)
  const employeeOfMonth = useMemo(
    () => [...employees].sort((a, b) => b.performance - a.performance)[0],
    []
  )

  return (
    <div>
      {/* Page header */}
      <div
        className="mb-6 flex flex-wrap items-center justify-between gap-4"
        style={{ transform: headerParallax.transform, willChange: 'transform' }}
      >
        <h1 className="text-gradient-heading font-display text-[26px] font-semibold leading-tight tracking-tight md:text-[32px]">Teams Management</h1>
        <div className="flex gap-2">
          <Button variant="light" onClick={() => nav('/hr/leave')}><CalendarDays size={15} /> Leave requests</Button>
          <Button onClick={() => nav('/hr/employees?new=1')}><Plus size={15} /> Add employee</Button>
        </div>
      </div>

      <div className="stagger grid gap-4 lg:grid-cols-12">

        {/* ── AI Insights ─────────────────────────────────────── */}
        <AiInsights />

        {/* ── Left column KPI cards ────────────────────────────── */}
        <div className="grid gap-4 sm:grid-cols-3 lg:col-span-3 lg:grid-cols-1">
          {/* Total Employees dark card */}
          <div className="card-dark animate-in relative overflow-hidden p-5">
            <div className="pointer-events-none absolute -right-14 -top-14 size-48 rounded-full bg-lime/15 blur-3xl" />
            <div className="relative flex items-start justify-between">
              <h3 className="font-display text-[16px] font-semibold leading-tight tracking-tight">Total Employees</h3>
              <button onClick={() => nav('/hr/employees')} aria-label="View employees" className="grid size-9 shrink-0 place-items-center rounded-full bg-white/10 transition-all hover:bg-white/20 active:scale-90">
                <Users size={16} />
              </button>
            </div>
            <div className="relative mt-5 flex items-end justify-between">
              <div>
                <p className="text-xs text-white/55">Active staff</p>
                <p className="font-display text-3xl font-semibold tabular-nums"><CountUp value={employees.length} /></p>
                <p className="mt-1.5 flex items-center gap-1 text-[11px] text-lime">
                  <TrendingUp size={11} /> +12% YTD growth
                </p>
              </div>
              <HalfGauge value={72} size={108} color="#d8eca0" track="rgba(255,255,255,0.12)" />
            </div>
          </div>

          {/* Present Today */}
          <Card>
            <CardHeader title="Present Today" action={<IconBtn onClick={() => nav('/hr/attendance')}><CheckCircle2 size={15} /></IconBtn>} />
            <div className="mt-5 flex items-end justify-between">
              <div>
                <p className="text-xs text-ash">In office</p>
                <p className="font-display text-3xl font-semibold"><CountUp value={present} /></p>
                <p className="mt-1 text-[11px] text-ash">{attendanceRate.toFixed(1)}% rate</p>
              </div>
              <SoftBars values={attendanceTrend.slice(-5).map((d) => d.present)} highlight={4} height={64} />
            </div>
          </Card>

          {/* Open Positions */}
          <Card>
            <CardHeader title="Open Positions" action={<IconBtn onClick={() => nav('/hr/recruitment')}><Briefcase size={15} /></IconBtn>} />
            <div className="mt-4 flex items-end justify-between gap-3">
              <div>
                <p className="text-xs text-ash">{candidates.length} in pipeline</p>
                <p className="font-display text-3xl font-semibold"><CountUp value={openings} /></p>
              </div>
              <div className="w-28">
                <Sparkline values={[4, 6, 5, 9, 7, 12, 10, 14]} />
              </div>
            </div>
          </Card>
        </div>

        {/* ── Centre column ──────────────────────────────────────── */}
        <div className="flex flex-col gap-4 lg:col-span-6">
          {/* Hero art card */}
          <div
            className="group/hero card animate-in relative min-h-[210px] flex-1 overflow-hidden"
            style={{ transform: heroParallax.transform, willChange: 'transform' }}
          >
            <HeroArt className="absolute inset-0 size-full" />
            <div className="relative flex h-full flex-col justify-between p-5">
              <Badge tone="dark" dot={false} className="self-start">
                {TODAY.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
              </Badge>
              <div className="flex flex-wrap gap-2">
                {[
                  ['New joiners this month', String(headcountTrend.at(-1)!.hires)],
                  ['Attrition (YTD)', '6.8%'],
                  ['Avg. tenure', '2.9 yrs'],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-2xl bg-white/70 px-4 py-2.5 backdrop-blur">
                    <p className="font-display text-lg font-semibold leading-none"><CountUp value={v} /></p>
                    <p className="mt-1 text-[11px] text-ash">{k}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Headcount trend */}
          <Card>
            <CardHeader
              title="Employee Headcount"
              subtitle={
                <span className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-[#9aa19a]" />Total</span>
                  <span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-sage-deep" />Hires</span>
                  <span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-rose-deep" />Exits</span>
                </span>
              }
              action={
                <Segmented value={range} options={['6M', '12M'] as const} onChange={(v) => setRange(v as '6M' | '12M')} />
              }
            />
            <HatchedArea data={trend} dataKey="total" xKey="month" height={190} zoom />
            <div className="mt-2 grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl bg-sage/40 px-3 py-2 font-medium">
                <span className="text-ash">Hires: </span><b className="text-sage-deep">{trend.reduce((s, t) => s + t.hires, 0)}</b>
              </div>
              <div className="rounded-xl bg-rose/40 px-3 py-2 font-medium">
                <span className="text-ash">Exits: </span><b className="text-rose-deep">{trend.reduce((s, t) => s + t.exits, 0)}</b>
              </div>
            </div>
          </Card>
        </div>

        {/* ── Right column ───────────────────────────────────────── */}
        <div className="flex flex-col gap-4 lg:col-span-3">
          {/* Attendance card */}
          <Card>
            <CardHeader title="Attendance" action={<CornerLink onClick={() => nav('/hr/attendance')} />} />
            <p className="mt-3 flex items-baseline gap-2">
              <span className="font-display text-3xl font-semibold"><CountUp value={`${attendanceRate.toFixed(1)}%`} /></span>
              <span className={clsx('text-xs font-medium', attendanceRate > 90 ? 'text-sage-deep' : 'text-amber-deep')}>
                {attendanceRate > 90 ? '↑ Healthy' : '⚠ Moderate'}
              </span>
            </p>
            <div className="mt-4 grid grid-cols-3 gap-2 text-[11px]">
              {[
                ['Present', present, 'hatch'],
                ['Absent', counts.Absent + counts['On Leave'], 'bg-sky/60'],
                ['Remote', counts.Remote, 'bg-sage/60'],
              ].map(([k, v, cls]) => (
                <div key={k as string} className="rounded-xl border border-line/60 p-2">
                  <p className="text-ash">{k}</p>
                  <p className="mt-0.5 font-bold text-sm">{v}</p>
                  <div className={clsx('mt-2 h-4 rounded-md', cls)} />
                </div>
              ))}
            </div>
          </Card>

          {/* Schedule */}
          <Card className="flex-1">
            <CardHeader
              title="Schedule"
              action={
                <div className="flex gap-1">
                  <IconBtn><CalendarDays size={13} /></IconBtn>
                  <IconBtn><Plus size={13} /></IconBtn>
                </div>
              }
            />
            <div className="mt-3 flex justify-between border-b border-line/70 text-xs">
              {days.map((d) => (
                <button key={d} onClick={() => setDay(d)} className={clsx('-mb-px flex items-center gap-1.5 border-b-2 pb-2 transition-colors', day === d ? 'border-ink font-bold' : 'border-transparent text-ash hover:text-ink')}>
                  {fmtShortDate(d)}
                  <span className="rounded-full bg-soft px-1.5 text-[10px]">{schedule.filter((s) => s.date === d).length}</span>
                </button>
              ))}
            </div>
            <ul className="mt-3 space-y-2">
              {schedule.filter((s) => s.date === day).map((s) => (
                <li key={s.id} className="flex gap-3">
                  <span className={clsx('mt-1 h-fit rounded-full px-2 py-0.5 text-[10px] font-bold', s.time === '10:00' ? 'bg-lime' : 'bg-soft text-ash')}>{s.time}</span>
                  <div className="flex flex-1 items-center gap-2.5 rounded-2xl border border-line/60 bg-white/60 p-2.5">
                    <Avatar name={s.person} hue={s.avatarHue} size={28} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold">{s.person}</p>
                      <p className="truncate text-[10px] text-ash">{s.title} · {s.subtitle}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        {/* ── NEW: Attrition Trend ────────────────────────────────── */}
        <Card className="lg:col-span-4">
          <CardHeader
            title="Attrition Trend"
            subtitle="Monthly exit rate %"
            action={<Segmented value={attrRange} options={['6M', '12M'] as const} onChange={(v) => setAttrRange(v as '6M' | '12M')} />}
          />
          <MultiLineChart
            data={attrSeries}
            lines={[
              { key: 'rate', color: '#cd6a96' },
              { key: 'hires', color: '#aece52', dashed: true },
            ]}
            xKey="month" height={160}
            format={(v) => `${v}`}
          />
          <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
            <div className="rounded-xl bg-rose/30 px-3 py-2">
              <p className="text-ash">Avg rate</p>
              <p className="font-bold text-rose-deep">{(attrSeries.reduce((s, m) => s + m.rate, 0) / attrSeries.length).toFixed(1)}%</p>
            </div>
            <div className="rounded-xl bg-lime/40 px-3 py-2">
              <p className="text-ash">Total hires</p>
              <p className="font-bold text-sage-deep">{attrSeries.reduce((s, m) => s + m.hires, 0)}</p>
            </div>
            <div className="rounded-xl bg-soft px-3 py-2">
              <p className="text-ash">Total exits</p>
              <p className="font-bold">{attrSeries.reduce((s, m) => s + m.exits, 0)}</p>
            </div>
          </div>
        </Card>

        {/* ── NEW: Department Donut ────────────────────────────────── */}
        <Card className="lg:col-span-4">
          <CardHeader title="Headcount by Dept." subtitle="Distribution across teams" action={<CornerLink onClick={() => nav('/hr/employees')} />} />
          <DonutChart data={deptData} colors={DEPT_COLORS} innerLabel={`${employees.length}`} height={180} />
          <div className="mt-2 grid grid-cols-2 gap-1.5 text-[11px]">
            {deptData.slice(0, 6).map((d, i) => (
              <div key={d.name} className="flex items-center gap-2">
                <span className="size-2.5 shrink-0 rounded-full" style={{ background: DEPT_COLORS[i] }} />
                <span className="truncate text-ash">{d.name}</span>
                <span className="ml-auto font-bold">{d.value}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* ── NEW: Performance distribution ───────────────────────── */}
        <Card className="lg:col-span-4">
          <CardHeader title="Performance Distribution" subtitle="Across all employees" />
          <div className="mt-3 flex items-center gap-4">
            <RadialProgress value={avgPerfPct} color="#aece52" size={100} label="Avg score" />
            <div className="flex-1 space-y-2">
              {perfDist.map((p) => (
                <div key={p.label}>
                  <div className="mb-1 flex justify-between text-[11px]">
                    <span className="text-ash">{p.label}</span>
                    <span className="font-bold">{p.value}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-soft">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(p.value / employees.length) * 100}%`, background: p.fill }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-3 rounded-xl bg-lime/40 px-3 py-2 text-xs">
            <span className="text-ash">Overall avg: </span>
            <b className="text-sage-deep">{avgPerf.toFixed(2)} / 5.0</b>
            <span className="ml-2 text-ash">· Top performers: </span>
            <b>{perfDist[0].value + perfDist[1].value}</b>
          </div>
          <button
            onClick={() => nav(`/hr/employees/${employeeOfMonth.id}`)}
            className="mt-3 flex w-full items-center gap-3 rounded-xl bg-soft/80 px-3 py-2.5 text-left transition-colors hover:bg-soft"
          >
            <Avatar name={employeeOfMonth.name} hue={employeeOfMonth.avatarHue} src={photoFor(employeeOfMonth)} size={40} />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-sage-deep">Employee of the Month</p>
              <p className="truncate text-sm font-bold">{employeeOfMonth.name}</p>
              <p className="truncate text-[11px] text-ash">{employeeOfMonth.role}</p>
            </div>
            <Badge tone="lime">{employeeOfMonth.performance.toFixed(1)}</Badge>
          </button>
        </Card>

        {/* ── NEW: Attendance Heatmap ──────────────────────────────── */}
        <Card className="lg:col-span-6">
          <CardHeader
            title="Attendance Heatmap"
            subtitle="Last 10 weeks — daily presence rate"
            action={
              <div className="flex items-center gap-2 text-[10px] text-ash">
                <span className="flex items-center gap-1"><span className="size-2.5 rounded-sm bg-rose/80" /> Low</span>
                <span className="flex items-center gap-1"><span className="size-2.5 rounded-sm bg-lime/80" /> High</span>
              </div>
            }
          />
          <div className="mt-4">
            <AttendanceHeatmap data={heatmapData} />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
            {departmentAttendance.slice(0, 3).map((d) => (
              <div key={d.dept} className="rounded-xl bg-soft/80 px-3 py-2">
                <p className="truncate text-ash text-[10px]">{d.dept.replace('Human Resources', 'HR').replace('Customer Success', 'CS').replace('Engineering', 'Eng')}</p>
                <p className="font-bold mt-0.5">{d.rate}%</p>
              </div>
            ))}
          </div>
        </Card>

        {/* ── Dept bar chart (dark) ────────────────────────────────── */}
        <div className="card-dark animate-in p-5 lg:col-span-6">
          <div className="mb-1">
            <h3 className="font-display text-[16px] font-semibold leading-tight text-white">Hires vs Exits by Month</h3>
            <p className="mt-1 text-xs text-white/50">Last 6 months workforce movement</p>
          </div>
          <GroupedBar
            data={headcountTrend.slice(-6)}
            keys={['hires', 'exits']}
            colors={['#d8eca0', '#f0cad8']}
            xKey="month"
            height={180}
          />
          <div className="mt-2 flex items-center gap-4 text-[11px]">
            <span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-[#d8eca0]" /><span className="text-white/60">Hires</span></span>
            <span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-[#f0cad8]" /><span className="text-white/60">Exits</span></span>
          </div>
        </div>

        {/* ── Pending Leave Approvals ──────────────────────────────── */}
        <Card className="lg:col-span-5">
          <CardHeader title="Pending Leave Approvals" subtitle={`${pending.length} requests need your action`} action={<CornerLink onClick={() => nav('/hr/leave')} />} />
          <ul className="mt-4 divide-y divide-line/70">
            {pending.slice(0, 4).map((l) => {
              const e = employeeById(l.employeeId)!
              return (
                <li key={l.id} className="flex items-center gap-3 py-2.5">
                  <Avatar name={e.name} hue={e.avatarHue} src={photoFor(e)} size={34} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{e.name}</p>
                    <p className="truncate text-xs text-ash">{l.type} · {fmtShortDate(l.from)} – {fmtShortDate(l.to)} ({l.days}d)</p>
                  </div>
                  <Button size="sm" variant="light" onClick={() => setLeaveStatus(l.id, 'Rejected')}>Decline</Button>
                  <Button size="sm" onClick={() => setLeaveStatus(l.id, 'Approved')}>Approve</Button>
                </li>
              )
            })}
            {pending.length === 0 && <li className="py-8 text-center text-sm text-ash">All caught up 🎉</li>}
          </ul>
        </Card>

        {/* ── Celebrations ────────────────────────────────────────── */}
        <Card className="lg:col-span-4">
          <CardHeader title="Celebrations" subtitle="This month" action={<IconBtn><Cake size={15} /></IconBtn>} />
          <ul className="mt-4 space-y-3">
            {celebrations.map(({ e, kind, date, years }) => (
              <li key={e.id + kind} className="flex items-center gap-3">
                <Avatar name={e.name} hue={e.avatarHue} src={photoFor(e)} size={34} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{e.name}</p>
                  <p className="text-xs text-ash">{kind === 'Birthday' ? '🎂 Birthday' : `🎉 ${years} yr anniversary`}</p>
                </div>
                <span className="text-xs text-ash">{fmtShortDate(date.toISOString())}</span>
              </li>
            ))}
            {celebrations.length === 0 && <li className="text-sm text-ash">No celebrations left this month.</li>}
          </ul>
        </Card>

        {/* ── NEW: Turnover rate KPI row ───────────────────────────── */}
        <Card className="lg:col-span-3">
          <CardHeader title="Workforce Health" subtitle="Key HR KPIs" />
          <div className="mt-4 space-y-3">
            {[
              { label: 'Turnover rate', value: `${((headcountTrend.reduce((s, m) => s + m.exits, 0) / employees.length) * 100).toFixed(1)}%`, tone: 'rose' as const, icon: TrendingDown },
              { label: 'Hire success rate', value: '78%', tone: 'lime' as const, icon: TrendingUp },
              { label: 'Avg. days to hire', value: '24 days', tone: 'sky' as const, icon: CalendarDays },
              { label: 'On probation', value: `${employees.filter((e) => e.status === 'Probation').length}`, tone: 'amber' as const, icon: Users },
            ].map((kpi) => {
              const Icon = kpi.icon
              const bg = { rose: 'bg-rose/50', lime: 'bg-lime/50', sky: 'bg-sky/50', amber: 'bg-amber/50' }[kpi.tone]
              const text = { rose: 'text-rose-deep', lime: 'text-sage-deep', sky: 'text-sky-deep', amber: 'text-amber-deep' }[kpi.tone]
              return (
                <div key={kpi.label} className={clsx('flex items-center gap-3 rounded-xl px-3 py-2.5', bg)}>
                  <Icon size={15} className={text} />
                  <div className="flex-1">
                    <p className="text-[11px] text-ash">{kpi.label}</p>
                    <p className={clsx('text-sm font-bold', text)}>{kpi.value}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>

        {/* ── Recent Activity ──────────────────────────────────────── */}
        <Card className="lg:col-span-12">
          <CardHeader title="Recent Activity" action={<AvatarStack hues={[20, 140, 220, 300]} />} />
          <div className="scroll-thin mt-4 max-h-64 space-y-1.5 overflow-y-auto pr-1">
            {activity.map((a, i) => {
              const s = ACTIVITY_STYLE[a.type]
              const Icon = s.icon
              return (
                <div key={i} className="group flex items-center gap-3 rounded-xl bg-soft/70 p-2 pr-3 transition-colors hover:bg-soft">
                  <span className={clsx('relative grid size-8 shrink-0 place-items-center overflow-hidden rounded-full bg-cover bg-center ring-2 ring-white', s.ring)} style={a.photo ? { backgroundImage: `url(${a.photo})` } : undefined}>
                    {!a.photo && <Icon size={13} className={s.text} />}
                    {a.photo && <span className="absolute inset-0 bg-ink/10 transition-opacity group-hover:bg-ink/0" />}
                  </span>
                  <p className="min-w-0 flex-1 truncate text-sm">
                    <b>{a.who}</b> <span className="text-ash">{a.what}</span> <b>{a.target}</b>
                  </p>
                  <span className="shrink-0 text-xs text-ash">{a.when}</span>
                </div>
              )
            })}
          </div>
        </Card>

      </div>
    </div>
  )
}

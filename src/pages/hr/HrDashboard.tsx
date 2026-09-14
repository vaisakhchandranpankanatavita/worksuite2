import clsx from 'clsx'
import { AlertTriangle, ArrowUp, Briefcase, CalendarDays, Cake, CheckCircle2, Plus, Receipt, UserPlus, Users, Wallet } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import { HalfGauge, HatchedArea, HeroArt, SoftBars, Sparkline } from '../../components/charts'
import { CountUp } from '../../components/CountUp'
import AiInsights from '../../components/AiInsights'
import { Avatar, AvatarStack, Badge, Button, Card, CardHeader, CornerLink, IconBtn, chartTooltip } from '../../components/ui'
import { DEPARTMENTS, TODAY, activity, attendanceTrend, employeeById, employees, headcountTrend, jobs, schedule, todayAttendance } from '../../data/mock'
import { fmtShortDate } from '../../lib/format'
import { photoFor } from '../../lib/photo'
import { useApp } from '../../store'

const ACTIVITY_STYLE: Record<import('../../data/mock').ActivityType, { icon: typeof Wallet; ring: string; text: string }> = {
  leave: { icon: CalendarDays, ring: 'bg-amber', text: 'text-[#80591a]' },
  payroll: { icon: Wallet, ring: 'bg-ink', text: 'text-white' },
  payment: { icon: CheckCircle2, ring: 'bg-sage', text: 'text-[#2f6b2b]' },
  recruitment: { icon: Briefcase, ring: 'bg-lime', text: 'text-[#56691d]' },
  expense: { icon: Receipt, ring: 'bg-sky', text: 'text-[#2d5597]' },
  onboarding: { icon: UserPlus, ring: 'bg-sage', text: 'text-[#2f6b2b]' },
  alert: { icon: AlertTriangle, ring: 'bg-rose', text: 'text-[#9b3563]' },
}

export default function HrDashboard() {
  const nav = useNavigate()
  const { leaves, candidates, setLeaveStatus } = useApp()
  const [range, setRange] = useState<'6M' | '12M'>('12M')

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

  const deptData = DEPARTMENTS.map((d) => ({ name: d.replace('Human Resources', 'HR').replace('Customer Success', 'CS'), value: employees.filter((e) => e.department === d).length }))
  const celebrations = useMemo(() => {
    const m = TODAY.getMonth()
    return employees
      .flatMap((e) => {
        const out: { e: typeof e; kind: 'Birthday' | 'Anniversary'; date: Date; years?: number }[] = []
        const b = new Date(e.dob)
        const bd = new Date(TODAY.getFullYear(), b.getMonth(), b.getDate())
        if (b.getMonth() === m && bd >= TODAY) out.push({ e, kind: 'Birthday', date: bd })
        const j = new Date(e.joinDate)
        const jd = new Date(TODAY.getFullYear(), j.getMonth(), j.getDate())
        const years = TODAY.getFullYear() - j.getFullYear()
        if (years > 0 && j.getMonth() === m && jd >= TODAY) out.push({ e, kind: 'Anniversary', date: jd, years })
        return out
      })
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 5)
  }, [])

  const trend = range === '6M' ? headcountTrend.slice(-6) : headcountTrend

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-normal tracking-tight md:text-[40px] md:leading-[1.1]">Teams Management</h1>
          <p className="mt-2 text-sm text-ash">Manage your people, attendance and performance in one place.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="light" onClick={() => nav('/hr/leave')}>
            <CalendarDays size={16} /> Leave requests
          </Button>
          <Button onClick={() => nav('/hr/employees?new=1')}>
            <Plus size={16} /> Add employee
          </Button>
        </div>
      </div>

      <div className="stagger grid gap-4 lg:grid-cols-12">
        <AiInsights />

        {/* Left column */}
        <div className="grid gap-4 sm:grid-cols-3 lg:col-span-3 lg:grid-cols-1">
          <div className="card-dark animate-in relative overflow-hidden p-5">
            <div className="pointer-events-none absolute -right-14 -top-14 size-44 rounded-full bg-lime/20 blur-3xl" />
            <div className="relative flex items-start justify-between">
              <h3 className="text-[17px] font-medium leading-tight tracking-tight">Total Employees</h3>
              <button onClick={() => nav('/hr/employees')} aria-label="View employees" className="grid size-9 shrink-0 place-items-center rounded-full bg-white/10 transition-all duration-150 hover:bg-white/20 active:scale-90">
                <Users size={16} />
              </button>
            </div>
            <div className="relative mt-6 flex items-end justify-between">
              <div>
                <p className="text-xs text-white/60">Active Staff</p>
                <p className="font-display text-3xl font-medium tabular-nums"><CountUp value={employees.length} /></p>
              </div>
              <div className="relative">
                <HalfGauge value={72} size={110} color="#ddefa8" track="rgba(255,255,255,0.14)" />
                <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-0.5 text-[11px] font-bold text-white">
                  +12% <ArrowUp size={11} className="text-lime" />
                </span>
              </div>
            </div>
          </div>
          <Card>
            <CardHeader title="Present Today" action={<IconBtn onClick={() => nav('/hr/attendance')}><CheckCircle2 size={16} /></IconBtn>} />
            <div className="mt-6 flex items-end justify-between">
              <div>
                <p className="text-xs text-ash">In office</p>
                <p className="font-display text-3xl font-medium"><CountUp value={present} /></p>
              </div>
              <SoftBars values={attendanceTrend.slice(-5).map((d) => d.present)} highlight={4} height={64} />
            </div>
          </Card>
          <Card>
            <CardHeader title="Open Positions" action={<IconBtn onClick={() => nav('/hr/recruitment')}><Briefcase size={16} /></IconBtn>} />
            <div className="mt-4 flex items-end justify-between gap-3">
              <div>
                <p className="text-xs text-ash">{candidates.length} in pipeline</p>
                <p className="font-display text-3xl font-medium"><CountUp value={openings} /></p>
              </div>
              <div className="w-28">
                <Sparkline values={[4, 6, 5, 9, 7, 12, 10, 14]} />
              </div>
            </div>
          </Card>
        </div>

        {/* Centre column */}
        <div className="flex flex-col gap-4 lg:col-span-6">
          <div className="group/hero card animate-in relative min-h-[220px] flex-1 overflow-hidden">
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
                    <p className="font-display text-lg font-medium leading-none"><CountUp value={v} /></p>
                    <p className="mt-1 text-[11px] text-ash">{k}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <Card>
            <CardHeader
              title="Employee Headcount"
              subtitle={
                <span className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-[#9aa19a]" />Total employees</span>
                  <span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-sage-deep" />New hires</span>
                  <span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-rose-deep" />Exits</span>
                </span>
              }
              action={
                <select value={range} onChange={(e) => setRange(e.target.value as '6M')} className="h-9 rounded-full border border-line bg-white px-3 text-xs outline-none">
                  <option value="12M">Last 12 months</option>
                  <option value="6M">Last 6 months</option>
                </select>
              }
            />
            <HatchedArea data={trend} dataKey="total" xKey="month" height={200} zoom />
            <div className="mt-2 grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl bg-soft px-3 py-2">Hires: <b>{trend.reduce((s, t) => s + t.hires, 0)}</b></div>
              <div className="rounded-xl bg-soft px-3 py-2">Exits: <b>{trend.reduce((s, t) => s + t.exits, 0)}</b></div>
            </div>
          </Card>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4 lg:col-span-3">
          <Card>
            <CardHeader title="Attendance" action={<CornerLink onClick={() => nav('/hr/attendance')} />} />
            <p className="mt-3 flex items-baseline gap-2">
              <span className="font-display text-3xl font-medium"><CountUp value={`${attendanceRate.toFixed(1)}%`} /></span>
              <span className="text-xs text-ash">{attendanceRate > 90 ? 'Healthy' : 'Moderate concern'}</span>
            </p>
            <div className="mt-4 grid grid-cols-3 gap-2 text-[11px]">
              {[
                ['Present', present, 'hatch'],
                ['Absent', counts.Absent + counts['On Leave'], 'bg-sky'],
                ['Remote', counts.Remote, 'bg-sage'],
              ].map(([k, v, cls]) => (
                <div key={k as string} className="border-l border-dashed border-line pl-2">
                  <p className="text-ash">{k}:</p>
                  <p className="font-bold">{v} Person</p>
                  <div className={clsx('mt-2 h-5 rounded-md', cls)} />
                </div>
              ))}
            </div>
          </Card>
          <Card className="flex-1">
            <CardHeader
              title="Schedule"
              action={
                <div className="flex gap-1.5">
                  <IconBtn><CalendarDays size={15} /></IconBtn>
                  <IconBtn><Plus size={15} /></IconBtn>
                </div>
              }
            />
            <div className="mt-4 flex justify-between border-b border-line text-xs">
              {days.map((d) => (
                <button key={d} onClick={() => setDay(d)} className={clsx('-mb-px flex items-center gap-1.5 border-b-2 pb-2', day === d ? 'border-ink font-bold' : 'border-transparent text-ash')}>
                  {fmtShortDate(d)}
                  <span className="rounded-full bg-soft px-1.5 text-[10px]">{schedule.filter((s) => s.date === d).length}</span>
                </button>
              ))}
            </div>
            <ul className="mt-3 space-y-2">
              {schedule
                .filter((s) => s.date === day)
                .map((s) => (
                  <li key={s.id} className="flex gap-3">
                    <span className={clsx('mt-1 h-fit rounded-full px-2 py-0.5 text-[10px] font-bold', s.time === '10:00' ? 'bg-lime' : 'bg-soft text-ash')}>{s.time}</span>
                    <div className="flex flex-1 items-center gap-2.5 rounded-2xl border border-line bg-white p-2.5">
                      <Avatar name={s.person} hue={s.avatarHue} size={30} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold">{s.person}</p>
                        <p className="truncate text-[10px] text-ash">{s.title} · {s.subtitle}</p>
                      </div>
                    </div>
                  </li>
                ))}
            </ul>
          </Card>
        </div>

        {/* Bottom row */}
        <Card className="lg:col-span-5">
          <CardHeader title="Pending Leave Approvals" subtitle={`${pending.length} requests need your action`} action={<CornerLink onClick={() => nav('/hr/leave')} />} />
          <ul className="mt-4 divide-y divide-line">
            {pending.slice(0, 4).map((l) => {
              const e = employeeById(l.employeeId)!
              return (
                <li key={l.id} className="flex items-center gap-3 py-2.5">
                  <Avatar name={e.name} hue={e.avatarHue} src={photoFor(e)} size={34} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{e.name}</p>
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

        <div className="card-dark animate-in p-5 lg:col-span-4">
          <div className="mb-1">
            <h3 className="text-[17px] font-medium leading-tight tracking-tight text-white">Headcount by Department</h3>
            <p className="mt-1 text-xs text-white/50">Across 6 locations</p>
          </div>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={deptData} margin={{ top: 20, bottom: 0, left: 0, right: 0 }}>
              <XAxis dataKey="name" axisLine={false} tickLine={false} interval={0} tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.55)' }} />
              <Tooltip {...chartTooltip} cursor={{ fill: 'rgba(255,255,255,0.06)' }} />
              <Bar dataKey="value" radius={[10, 10, 4, 4]} name="Employees">
                {deptData.map((d, i) => (
                  <Cell key={i} fill={i === 0 ? '#eef1ee' : ['#ddefa8', '#cfddf5', '#cde3c8', '#f3cfdc'][i % 4]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <Card className="lg:col-span-3">
          <CardHeader title="Celebrations" subtitle="This month" action={<IconBtn><Cake size={16} /></IconBtn>} />
          <ul className="mt-4 space-y-3">
            {celebrations.map(({ e, kind, date, years }) => (
              <li key={e.id + kind} className="flex items-center gap-3">
                <Avatar name={e.name} hue={e.avatarHue} src={photoFor(e)} size={34} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{e.name}</p>
                  <p className="text-xs text-ash">{kind === 'Birthday' ? '🎂 Birthday' : `🎉 ${years} yr anniversary`}</p>
                </div>
                <span className="text-xs text-ash">{fmtShortDate(date.toISOString())}</span>
              </li>
            ))}
            {celebrations.length === 0 && <li className="text-sm text-ash">No celebrations left this month.</li>}
          </ul>
        </Card>

        <Card className="lg:col-span-12">
          <CardHeader title="Recent Activity" action={<AvatarStack hues={[20, 140, 220, 300]} />} />
          <div className="scroll-thin mt-4 max-h-64 space-y-1.5 overflow-y-auto pr-1">
            {activity.map((a, i) => {
              const s = ACTIVITY_STYLE[a.type]
              const Icon = s.icon
              return (
                <div key={i} className="group flex items-center gap-3 rounded-xl bg-soft p-2 pr-3 transition-colors duration-150 hover:bg-soft/70">
                  <span className={clsx('relative grid size-8 shrink-0 place-items-center overflow-hidden rounded-full bg-cover bg-center ring-2 ring-white', s.ring)} style={a.photo ? { backgroundImage: `url(${a.photo})` } : undefined}>
                    {!a.photo && <Icon size={14} className={s.text} />}
                    {a.photo && <span className="absolute inset-0 bg-ink/10 transition-opacity duration-150 group-hover:bg-ink/0" />}
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

import clsx from 'clsx'
import { AlarmClock, ArrowLeft, Check, ChevronDown, FileText, Headphones, Laptop, Link2, Mail, MessageSquare, Monitor, MoreVertical, Pause, Phone, Play, Smartphone, Target, User, Zap } from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AvatarStack, Badge, Button, CornerLink, IconBtn, Progress } from '../../components/ui'
import { CountUp } from '../../components/CountUp'
import { PayslipModal } from './Payroll'
import { TODAY, computePayslip, employeeById, getEmployeeDetail, type EmployeeDetail } from '../../data/mock'
import { fmtCompact, fmtDate, fmtINR } from '../../lib/format'
import { photoFor } from '../../lib/photo'

const TASK_ICONS: Record<EmployeeDetail['onboarding'][number]['icon'], typeof Monitor> = { monitor: Monitor, zap: Zap, message: MessageSquare, target: Target, link: Link2, file: FileText, laptop: Laptop, user: User }
const DEVICE_ICONS = { laptop: Laptop, phone: Smartphone, monitor: Monitor, headset: Headphones }

export default function EmployeeProfile() {
  const { id } = useParams()
  const nav = useNavigate()
  const [payslip, setPayslip] = useState(false)
  const e = employeeById(id!)
  if (!e) return <p className="py-20 text-center text-ash">Employee not found.</p>
  const d = getEmployeeDetail(e)
  const slip = computePayslip(e)
  const manager = e.managerId ? employeeById(e.managerId) : undefined

  const weekTotal = d.weeklyHours.reduce((s, h) => s + h.hours, 0)
  const doneTasks = d.onboarding.filter((t) => t.done).length
  const onboardingPct = Math.round((doneTasks / d.onboarding.length) * 100)
  const tenure = (() => {
    const m = Math.floor((TODAY.getTime() - new Date(e.joinDate).getTime()) / (30.44 * 864e5))
    return m >= 12 ? `${Math.floor(m / 12)}y ${m % 12}m` : `${m} months`
  })()

  return (
    <div className="relative">
      <div className="pointer-events-none absolute -inset-8 -z-0 rounded-[28px] bg-[radial-gradient(60%_50%_at_90%_100%,rgba(221,239,168,0.55),transparent),radial-gradient(40%_40%_at_100%_0%,rgba(221,239,168,0.35),transparent)]" />
      <div className="relative">
        <button onClick={() => nav('/hr/employees')} className="mb-4 inline-flex items-center gap-2 text-sm text-ash hover:text-ink">
          <ArrowLeft size={16} /> All employees
        </button>

        {/* Header: name + stat pills + big numbers */}
        <div className="mb-6 flex flex-wrap items-end justify-between gap-6">
          <div className="min-w-0 flex-1">
            <h1 className="text-3xl font-normal tracking-tight md:text-[42px] md:leading-[1.1]">{e.name}</h1>
            <p className="mt-1 text-sm text-ash">{e.role} · {e.department} · {e.id}</p>
            <div className="mt-5 grid max-w-2xl grid-cols-[auto_auto_1fr_auto] items-end gap-2 text-xs">
              <PillStat label="Attendance" value="96%" className="bg-ink text-white" />
              <PillStat label="Performance" value={`${e.performance}/5`} className="bg-lime" />
              <PillStat label="Leave used" value={`${d.leaveBalance.reduce((s, l) => s + l.used, 0)} days`} className="hatch border border-line" wide />
              <PillStat label="Goals" value={`${Math.round(e.performance * 18)}%`} className="border border-ash/40" />
            </div>
          </div>
          <div className="flex gap-6 md:gap-10">
            <BigStat label="Tenure" value={tenure.split(' ')[0]} unit={tenure.split(' ').slice(1).join(' ')} />
            <BigStat label="Monthly net" value={fmtCompact(slip.net).replace('₹', '')} unit="₹" />
            <BigStat label="Projects" value={String(3 + (Number(e.id.slice(2)) % 6))} />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {/* Profile photo card */}
          <div className="card animate-in relative min-h-[260px] overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-soft to-lime/50" />
            <img src={photoFor(e)} alt={e.name} className="absolute inset-0 size-full object-cover object-top" onError={(ev) => (ev.currentTarget.style.display = 'none')} />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/65 via-transparent" />
            <div className="absolute left-3 top-3"><Badge className="bg-white/85">{e.status}</Badge></div>
            <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-2 text-white">
              <div className="min-w-0">
                <p className="truncate font-display text-xl leading-tight">{e.name}</p>
                <p className="truncate text-xs text-white/75">{e.role}</p>
              </div>
              <span className="shrink-0 rounded-full border border-white/70 bg-white/10 px-3.5 py-1.5 font-display text-sm backdrop-blur">{fmtCompact(slip.gross)}</span>
            </div>
          </div>

          {/* Progress */}
          <div className="card animate-in p-5">
            <div className="flex items-start justify-between">
              <h3 className="text-[17px] font-medium">Progress</h3>
              <CornerLink onClick={() => nav('/hr/attendance')} />
            </div>
            <div className="mt-1 flex items-center gap-3">
              <span className="font-display text-3xl"><CountUp value={`${weekTotal.toFixed(1)} h`} /></span>
              <span className="text-[11px] leading-tight text-ash">Work time<br />last week</span>
            </div>
            <div className="mt-4 flex h-32 items-end justify-between px-1">
              {d.weeklyHours.map((h, i) => {
                const max = Math.max(...d.weeklyHours.map((x) => x.hours), 1)
                const today = h.hours === max
                return (
                  <div key={i} className="flex flex-col items-center gap-1.5">
                    {today && h.hours > 0 && <span className="whitespace-nowrap rounded-full bg-lime-deep/80 px-1.5 py-0.5 text-[9px] font-bold">{Math.floor(h.hours)}h {Math.round((h.hours % 1) * 60)}m</span>}
                    <div className="relative w-2 rounded-full" style={{ height: h.hours ? `${(h.hours / max) * 76}px` : '34px', background: h.hours === 0 ? 'repeating-linear-gradient(0deg,#d9ddd9 0 2px,transparent 2px 4px)' : today ? '#b9d46a' : '#262825' }} />
                    <span className={clsx('size-1.5 rounded-full', h.hours ? 'bg-ink' : 'bg-line')} />
                    <span className="text-[10px] text-ash">{h.day}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Time tracker */}
          <TimeTracker initial={d.todaySeconds} />

          {/* Onboarding */}
          <div className="flex flex-col gap-4 md:row-span-2">
            <div className="card animate-in p-5">
              <div className="flex items-center justify-between">
                <h3 className="text-[17px] font-medium">Onboarding</h3>
                <span className="font-display text-3xl"><CountUp value={`${onboardingPct}%`} /></span>
              </div>
              <div className="mt-4 grid grid-cols-[1.4fr_1.2fr_0.7fr] gap-1.5 text-[11px]">
                {d.onboardingPhases.map((p, i) => (
                  <div key={p.label}>
                    <p className="mb-1 border-l border-ash/40 pl-1.5 text-ash">{p.pct}%</p>
                    <div className={clsx('flex h-9 items-end rounded-xl px-2 pb-1.5', i === 0 ? 'bg-lime-deep/70' : i === 1 ? 'bg-ink text-white' : 'bg-ash/60 text-white')}>{i === 0 ? 'Docs' : i === 1 ? 'Setup' : ''}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="animate-in flex-1 rounded-[22px] bg-ink p-5 text-white">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-[17px] font-medium">Onboarding Tasks</h3>
                <span className="font-display text-2xl"><CountUp value={`${doneTasks}/${d.onboarding.length}`} /></span>
              </div>
              <ul className="space-y-3">
                {d.onboarding.map((t) => {
                  const Icon = TASK_ICONS[t.icon]
                  return (
                    <li key={t.title} className="flex items-center gap-3">
                      <span className={clsx('grid size-9 shrink-0 place-items-center rounded-full', t.done ? 'bg-white/10 text-white/60' : 'bg-white text-ink')}><Icon size={15} /></span>
                      <div className="min-w-0 flex-1">
                        <p className={clsx('truncate text-xs', t.done && 'text-white/50 line-through')}>{t.title}</p>
                        <p className="text-[10px] text-white/45">{fmtDate(t.date)}</p>
                      </div>
                      <span className={clsx('grid size-5 place-items-center rounded-full', t.done ? 'bg-lime text-ink' : 'bg-white/15')}>{t.done && <Check size={12} strokeWidth={3} />}</span>
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>

          {/* Accordions */}
          <div className="card animate-in p-5 xl:col-span-1">
            <Accordion title="Provident Fund">
              <div className="space-y-2 text-xs">
                <Row k="UAN" v={e.uan} />
                <Row k="Employee (12%)" v={`${fmtINR(slip.pf)}/mo`} />
                <Row k="Employer (12%)" v={`${fmtINR(slip.employerPf)}/mo`} />
                <Row k="Est. PF balance" v={<b>{fmtINR(d.pfBalance)}</b>} />
              </div>
            </Accordion>
            <Accordion title="Devices" defaultOpen>
              <ul className="space-y-3">
                {d.devices.map((dev) => {
                  const Icon = DEVICE_ICONS[dev.kind]
                  return (
                    <li key={dev.serial} className="flex items-center gap-3">
                      <span className="grid h-10 w-14 place-items-center rounded-lg bg-gradient-to-br from-ink to-ash text-white"><Icon size={18} /></span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm">{dev.name}</p>
                        <p className="truncate text-[11px] text-ash">{dev.model}</p>
                      </div>
                      <MoreVertical size={16} className="text-ash" />
                    </li>
                  )
                })}
              </ul>
            </Accordion>
            <Accordion title="Compensation Summary">
              <div className="space-y-2 text-xs">
                <Row k="Annual CTC" v={<b>{fmtINR(e.ctcAnnual)}</b>} />
                <Row k="Basic" v={fmtINR(slip.basic)} />
                <Row k="HRA" v={fmtINR(slip.hra)} />
                <Row k="Special allowance" v={fmtINR(slip.special)} />
                <Row k="TDS / month" v={fmtINR(slip.tds)} />
                <Row k="Net take-home" v={<b>{fmtINR(slip.net)}</b>} />
                <Button size="sm" variant="light" className="mt-2 w-full" onClick={() => setPayslip(true)}>View payslip</Button>
              </div>
            </Accordion>
            <Accordion title="Employee Benefits" last>
              <ul className="space-y-2.5 text-xs">
                {d.benefits.map((b) => (
                  <li key={b.name}>
                    <p className="font-bold">{b.name}</p>
                    <p className="text-ash">{b.detail}</p>
                  </li>
                ))}
              </ul>
            </Accordion>
          </div>

          {/* Calendar */}
          <WeekCalendar meetings={d.meetings} />
        </div>

        {/* Personal info row */}
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <div className="card animate-in p-5">
            <h3 className="mb-4 text-[17px] font-medium">Personal Details</h3>
            <div className="space-y-2.5 text-sm">
              <Row k={<span className="flex items-center gap-2"><Mail size={14} /> Email</span>} v={e.email} />
              <Row k={<span className="flex items-center gap-2"><Phone size={14} /> Phone</span>} v={e.phone} />
              <Row k="Date of birth" v={fmtDate(e.dob)} />
              <Row k="PAN" v={e.pan} />
              <Row k="Bank" v={e.bank} />
              <Row k="Emergency" v={`${d.emergency.name} (${d.emergency.relation})`} />
            </div>
          </div>
          <div className="card animate-in p-5">
            <h3 className="mb-4 text-[17px] font-medium">Job Information</h3>
            <div className="space-y-2.5 text-sm">
              <Row k="Department" v={e.department} />
              <Row k="Reports to" v={manager ? <button className="underline" onClick={() => nav(`/hr/employees/${manager.id}`)}>{manager.name}</button> : '—'} />
              <Row k="Location" v={`${e.location} · ${e.workMode}`} />
              <Row k="Date of joining" v={fmtDate(e.joinDate)} />
              <Row k="Employment" v="Full-time, Permanent" />
              <div className="flex flex-wrap gap-1.5 pt-2">
                {d.skills.map((s) => <span key={s} className="rounded-full bg-soft px-2.5 py-1 text-xs">{s}</span>)}
              </div>
            </div>
          </div>
          <div className="card animate-in p-5">
            <h3 className="mb-4 text-[17px] font-medium">Leave Balance</h3>
            <div className="space-y-4">
              {d.leaveBalance.map((l, i) => (
                <div key={l.type}>
                  <div className="mb-1.5 flex justify-between text-sm">
                    <span>{l.type} leave</span>
                    <span className="text-ash"><b className="text-ink">{l.total - l.used}</b> / {l.total} left</span>
                  </div>
                  <Progress value={((l.total - l.used) / l.total) * 100} tone={(['lime', 'sky', 'sage'] as const)[i]} />
                </div>
              ))}
              <Button variant="dark" size="sm" className="w-full" onClick={() => nav('/hr/leave?apply=' + e.id)}>Apply leave on behalf</Button>
            </div>
          </div>
        </div>
      </div>
      <PayslipModal employee={payslip ? e : null} onClose={() => setPayslip(false)} />
    </div>
  )
}

function PillStat({ label, value, className, wide }: { label: string; value: string; className?: string; wide?: boolean }) {
  return (
    <div className={clsx(wide && 'min-w-0')}>
      <p className="mb-1.5 text-ash">{label}</p>
      <div className={clsx('flex h-10 items-center rounded-full px-4', wide ? 'w-full' : 'min-w-[88px]', className)}>{value}</div>
    </div>
  )
}

function BigStat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div>
      <p className="flex items-baseline gap-1 font-display text-4xl font-light tracking-tight md:text-5xl">
        {unit === '₹' && <span className="text-2xl">₹</span>}
        {value}
        {unit && unit !== '₹' && <span className="text-base text-ash">{unit}</span>}
      </p>
      <p className="mt-1 text-xs text-ash">{label}</p>
    </div>
  )
}

function Row({ k, v }: { k: ReactNode; v: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-ash">{k}</span>
      <span className="truncate text-right">{v}</span>
    </div>
  )
}

function Accordion({ title, children, defaultOpen, last }: { title: string; children: ReactNode; defaultOpen?: boolean; last?: boolean }) {
  const [open, setOpen] = useState(!!defaultOpen)
  return (
    <div className={clsx(!last && 'border-b border-dashed border-line')}>
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between py-3 text-left text-sm">
        {title}
        <ChevronDown size={16} className={clsx('text-ash transition', open && 'rotate-180')} />
      </button>
      {open && <div className="animate-in pb-4">{children}</div>}
    </div>
  )
}

function TimeTracker({ initial }: { initial: number }) {
  const [secs, setSecs] = useState(initial)
  const [running, setRunning] = useState(false)
  useEffect(() => {
    if (!running) return
    const t = setInterval(() => setSecs((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [running])
  const target = 8 * 3600
  const pct = Math.min(1, secs / target)
  const hh = String(Math.floor(secs / 3600)).padStart(2, '0')
  const mm = String(Math.floor((secs % 3600) / 60)).padStart(2, '0')
  const ss = String(secs % 60).padStart(2, '0')
  const r = 62
  const c = 2 * Math.PI * r
  return (
    <div className="card animate-in p-5">
      <div className="flex items-start justify-between">
        <h3 className="text-[17px] font-medium">Time tracker</h3>
        <CornerLink />
      </div>
      <div className="relative mx-auto mt-2 grid size-[160px] place-items-center">
        <svg viewBox="0 0 160 160" className="absolute inset-0 -rotate-90">
          {Array.from({ length: 60 }, (_, i) => {
            const a = (i / 60) * Math.PI * 2
            return <line key={i} x1={80 + Math.cos(a) * 72} y1={80 + Math.sin(a) * 72} x2={80 + Math.cos(a) * 76} y2={80 + Math.sin(a) * 76} stroke="#262825" strokeOpacity={i / 60 < pct ? 0 : 0.35} strokeWidth="1.2" />
          })}
          <circle cx="80" cy="80" r={r} fill="none" stroke="#b9d46a" strokeWidth="12" strokeLinecap="round" strokeDasharray={`${pct * c} ${c}`} className="transition-all" />
        </svg>
        <div className="text-center">
          <p className="font-display text-3xl">{hh}:{mm}</p>
          <p className="text-[11px] text-ash">{ss}s · Work time</p>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <div className="flex gap-2">
          <IconBtn onClick={() => setRunning(true)} className={clsx(running && '!bg-lime')} aria-label="Start"><Play size={14} /></IconBtn>
          <IconBtn onClick={() => setRunning(false)} aria-label="Pause"><Pause size={14} /></IconBtn>
        </div>
        <IconBtn dark aria-label="Reminder"><AlarmClock size={15} /></IconBtn>
      </div>
    </div>
  )
}

function WeekCalendar({ meetings }: { meetings: EmployeeDetail['meetings'] }) {
  const monday = useMemo(() => {
    const m = new Date(TODAY)
    m.setDate(m.getDate() - ((m.getDay() + 6) % 7))
    return m
  }, [])
  const days = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(d.getDate() + i)
    return d
  })
  const hours = [9, 10, 11, 12]
  const rowH = 44
  const monthName = (o: number) => new Date(TODAY.getFullYear(), TODAY.getMonth() + o, 1).toLocaleDateString('en-IN', { month: 'long' })
  return (
    <div className="card animate-in overflow-hidden p-5 md:col-span-2">
      <div className="flex items-center justify-between text-xs">
        <span className="rounded-full bg-soft px-3 py-1 text-ash">{monthName(-1)}</span>
        <span className="font-display text-base">{TODAY.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</span>
        <span className="rounded-full bg-soft px-3 py-1 text-ash">{monthName(1)}</span>
      </div>
      <div className="mt-3 overflow-x-auto scroll-thin">
        <div className="relative min-w-[520px]">
          <div className="grid grid-cols-[64px_repeat(6,1fr)] text-center text-xs">
            <span />
            {days.map((d) => {
              const today = d.toDateString() === TODAY.toDateString()
              return (
                <div key={d.toISOString()} className="pb-2">
                  <p className={clsx(today ? 'font-bold' : 'text-ash')}>{d.toLocaleDateString('en-IN', { weekday: 'short' })}</p>
                  <p className={clsx('mt-0.5 text-base', today ? 'font-display font-medium' : 'text-ash')}>{d.getDate()}</p>
                </div>
              )
            })}
          </div>
          <div className="relative grid grid-cols-[64px_repeat(6,1fr)]">
            <div>
              {hours.map((h) => (
                <p key={h} className="text-[11px] text-ash" style={{ height: rowH }}>{h > 12 ? h - 12 : h}:00 {h >= 12 ? 'pm' : 'am'}</p>
              ))}
            </div>
            {days.map((d) => <div key={d.toISOString()} className="border-l border-dashed border-line" />)}
            <div className="absolute inset-y-0 left-[64px] right-0">
              {meetings.map((m) => {
                const top = (m.start - hours[0]) * rowH
                const height = Math.max(34, (m.end - m.start) * rowH)
                return (
                  <div
                    key={m.title}
                    className={clsx('absolute flex items-center justify-between gap-2 rounded-xl px-2.5 py-1.5 shadow-sm', m.dark ? 'bg-ink text-white' : 'border border-line bg-white')}
                    style={{ top, height, left: `calc(${(m.day / 6) * 100}% + 4px)`, width: `calc(${(1.9 / 6) * 100}% - 8px)` }}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[11px] font-bold">{m.title}</p>
                      <p className={clsx('truncate text-[10px]', m.dark ? 'text-white/60' : 'text-ash')}>{m.subtitle}</p>
                    </div>
                    <AvatarStack hues={m.attendees} size={20} />
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

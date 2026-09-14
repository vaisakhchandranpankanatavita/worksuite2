import clsx from 'clsx'
import { AlertTriangle, ArrowUpRight, CalendarClock, Lightbulb, RefreshCw, Sparkles, TrendingUp, Users, Wallet } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { attendanceTrend, complianceDeadlines, employees, headcountTrend, jobs, monthlyFinance, todayAttendance } from '../data/mock'
import { useApp } from '../store'

type Insight = {
  tone: 'positive' | 'warning' | 'neutral'
  icon: typeof TrendingUp
  stat: string
  statLabel: string
  title: string
  to?: string
  cta?: string
}

function buildInsights(pending: number, overdue: number): Insight[] {
  const present = todayAttendance.filter((a) => a.status === 'Present' || a.status === 'Late').length
  const rate = ((present + todayAttendance.filter((a) => a.status === 'Remote').length) / employees.length) * 100
  const lastHires = headcountTrend.at(-1)!.hires
  const prevHires = headcountTrend.at(-2)!.hires
  const hireDelta = lastHires - prevHires
  const openings = jobs.reduce((s, j) => s + j.openings, 0)
  const attnUp = attendanceTrend.at(-1)!.present - attendanceTrend.at(-2)!.present

  const out: Insight[] = []

  out.push({
    tone: rate >= 90 ? 'positive' : 'warning',
    icon: TrendingUp,
    stat: `${rate.toFixed(1)}%`,
    statLabel: 'present today',
    title: attnUp >= 0 ? `Up ${attnUp} vs. yesterday — Engineering and Sales are leading on-site presence.` : `Down ${Math.abs(attnUp)} vs. yesterday — worth a nudge to team leads before standup.`,
    to: '/hr/attendance',
    cta: 'View attendance',
  })

  out.push({
    tone: pending > 0 ? 'warning' : 'positive',
    icon: AlertTriangle,
    stat: `${pending}`,
    statLabel: 'awaiting approval',
    title: pending > 0 ? `Clearing these keeps rota planning accurate — I can action them from the assistant.` : `No leave requests pending — rota planning is fully up to date.`,
    to: '/hr/leave',
    cta: 'Review requests',
  })

  out.push({
    tone: hireDelta >= 0 ? 'positive' : 'neutral',
    icon: Sparkles,
    stat: `${lastHires}`,
    statLabel: 'hires this month',
    title: `${openings} roles open across ${jobs.length} pipelines — likely to close ${Math.max(1, Math.round(openings * 0.4))} within 30 days.`,
    to: '/hr/recruitment',
    cta: 'Open recruitment',
  })

  out.push({
    tone: overdue > 0 ? 'warning' : 'positive',
    icon: Lightbulb,
    stat: `${overdue}`,
    statLabel: 'invoices overdue',
    title: overdue > 0 ? `Chasing these first would improve this month's collection ratio the most.` : `No overdue invoices — collections are healthy heading into payroll.`,
    to: '/finance/invoices',
    cta: 'Go to invoices',
  })

  return out
}

function buildSignals() {
  const avgTenureYrs = employees.reduce((s, e) => s + (Date.now() - new Date(e.joinDate).getTime()) / 3.15576e10, 0) / employees.length
  const nextDeadline = complianceDeadlines[0]
  const lastMonth = monthlyFinance.at(-1)!
  const profitMargin = (lastMonth.profit / lastMonth.revenue) * 100
  const probation = employees.filter((e) => e.status === 'Probation').length

  return [
    { icon: Users, label: 'Avg. tenure', value: `${avgTenureYrs.toFixed(1)} yrs` },
    { icon: CalendarClock, label: nextDeadline.title, value: `${nextDeadline.daysLeft}d left` },
    { icon: Wallet, label: 'Profit margin (MTD)', value: `${profitMargin.toFixed(1)}%` },
    { icon: Users, label: 'On probation', value: `${probation}` },
  ]
}

const TONE = {
  positive: { ring: 'bg-sage', dot: 'bg-sage-deep', text: 'text-[#115e59]' },
  warning: { ring: 'bg-amber', dot: 'bg-amber-deep', text: 'text-[#92400e]' },
  neutral: { ring: 'bg-sky', dot: 'bg-sky-deep', text: 'text-[#1d4ed8]' },
}

export default function AiInsights() {
  const nav = useNavigate()
  const { leaves, invoices } = useApp()
  const pending = leaves.filter((l) => l.status === 'Pending').length
  const overdue = invoices.filter((i) => i.status === 'Overdue').length
  const insights = useMemo(() => buildInsights(pending, overdue), [pending, overdue])
  const signals = useMemo(() => buildSignals(), [])

  const [analyzing, setAnalyzing] = useState(true)
  const [revealed, setRevealed] = useState(0)
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    setAnalyzing(true)
    setRevealed(0)
    const t = setTimeout(() => setAnalyzing(false), 1300)
    return () => clearTimeout(t)
  }, [nonce])

  useEffect(() => {
    if (analyzing) return
    if (revealed >= insights.length) return
    const t = setTimeout(() => setRevealed((r) => r + 1), 160)
    return () => clearTimeout(t)
  }, [analyzing, revealed, insights.length])

  return (
    <div className="card animate-in relative overflow-hidden p-3 lg:col-span-12">
      {/* ambient glow — always drifting, independent of analysing state */}
      <div className="ai-glow-a pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-lime/40 blur-3xl" />
      <div className="ai-glow-b pointer-events-none absolute -bottom-20 left-1/3 size-48 rounded-full bg-sky/30 blur-3xl" />

      <div className="relative flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid size-7 place-items-center rounded-xl bg-ink text-lime shadow-[0_0_0_4px_rgba(167,243,208,0.35)]">
            <Sparkles size={13} className={clsx(analyzing && 'animate-pulse')} />
          </span>
          <div>
            <h3 className="flex items-center gap-2 text-sm font-medium leading-tight tracking-tight">
              AI Analysis
              <span className="rounded-full bg-lime px-1.5 py-0.5 text-[9px] font-bold text-[#065f46]">BETA</span>
            </h3>
            <p className="mt-0.5 text-[11px] text-ash">{analyzing ? 'Analysing your workspace data…' : `${insights.length} insights · ${signals.length} live signals from HR & finance`}</p>
          </div>
        </div>
        <button onClick={() => setNonce((n) => n + 1)} className="grid size-7 place-items-center rounded-full border border-line bg-white text-ink transition-all hover:bg-soft active:scale-90" aria-label="Re-analyse">
          <RefreshCw size={12} className={clsx(analyzing && 'animate-spin')} />
        </button>
      </div>

      {analyzing ? (
        <div className="relative mt-2.5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-lg bg-soft/80" style={{ animationDelay: `${i * 120}ms` }} />
          ))}
        </div>
      ) : (
        <>
          <div className="relative mt-2.5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {insights.map((ins, i) => {
              const t = TONE[ins.tone]
              const Icon = ins.icon
              const shown = i < revealed
              return (
                <div
                  key={i}
                  className={clsx(
                    'group flex flex-col rounded-lg border border-line bg-white/70 p-2.5 backdrop-blur transition-all duration-500 hover:-translate-y-0.5 hover:border-ink/20 hover:shadow-sm',
                    shown ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0',
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-display text-lg font-medium leading-none tabular-nums">{ins.stat}</span>
                      <span className="text-[10px] text-ash">{ins.statLabel}</span>
                    </div>
                    <span className={clsx('grid size-5 shrink-0 place-items-center rounded-full', t.ring)}>
                      <Icon size={11} className={t.text} />
                    </span>
                  </div>
                  <p className="mt-1.5 line-clamp-2 flex-1 text-[11px] leading-snug text-ash">{ins.title}</p>
                  {ins.to && (
                    <button onClick={() => nav(ins.to!)} className="mt-1.5 inline-flex items-center gap-1 self-start text-[11px] font-bold text-ink transition-colors hover:text-black">
                      {ins.cta} <ArrowUpRight size={11} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          <div className="relative mt-2 flex flex-wrap items-center gap-1.5 border-t border-line/70 pt-2">
            {signals.map((s, i) => (
              <span key={i} className="inline-flex items-center gap-1.5 rounded-full bg-soft/80 px-2.5 py-1 text-[10px] text-ash transition-colors hover:bg-soft" style={{ transitionDelay: `${i * 40}ms` }}>
                <s.icon size={11} className="text-ash" />
                {s.label}: <span className="font-bold text-ink">{s.value}</span>
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

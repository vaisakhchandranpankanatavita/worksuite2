import clsx from 'clsx'
import { AlertTriangle, ArrowUpRight, CalendarClock, Lightbulb, RefreshCw, Sparkles, TrendingUp, Users, Wallet } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { attendanceTrend, complianceDeadlines, employees, headcountTrend, jobs, monthlyFinance, todayAttendance } from '../data/mock'
import { useApp } from '../store'

type InsightTone = 'positive' | 'warning' | 'neutral'
type Insight = {
  tone: InsightTone
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

  return [
    {
      tone: rate >= 90 ? 'positive' : 'warning',
      icon: TrendingUp,
      stat: `${rate.toFixed(1)}%`,
      statLabel: 'present today',
      title: attnUp >= 0
        ? `Up ${attnUp} vs. yesterday — Engineering and Sales leading on-site presence.`
        : `Down ${Math.abs(attnUp)} vs. yesterday — worth a nudge to team leads.`,
      to: '/hr/attendance',
      cta: 'View attendance',
    },
    {
      tone: pending > 0 ? 'warning' : 'positive',
      icon: AlertTriangle,
      stat: `${pending}`,
      statLabel: 'awaiting approval',
      title: pending > 0
        ? `Clearing these keeps rota planning accurate — action from the AI assistant.`
        : `No leave requests pending — rota planning is fully up to date.`,
      to: '/hr/leave',
      cta: 'Review requests',
    },
    {
      tone: hireDelta >= 0 ? 'positive' : 'neutral',
      icon: Sparkles,
      stat: `${lastHires}`,
      statLabel: 'hires this month',
      title: `${openings} roles open across ${jobs.length} pipelines — likely to close ${Math.max(1, Math.round(openings * 0.4))} within 30 days.`,
      to: '/hr/recruitment',
      cta: 'Open recruitment',
    },
    {
      tone: overdue > 0 ? 'warning' : 'positive',
      icon: Lightbulb,
      stat: `${overdue}`,
      statLabel: 'invoices overdue',
      title: overdue > 0
        ? `Chasing these first would improve this month's collection ratio the most.`
        : `No overdue invoices — collections are healthy heading into payroll.`,
      to: '/finance/invoices',
      cta: 'Go to invoices',
    },
  ]
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
    { icon: Wallet, label: 'Profit margin MTD', value: `${profitMargin.toFixed(1)}%` },
    { icon: Users, label: 'On probation', value: `${probation}` },
  ]
}

const TONE_RING: Record<InsightTone, string> = {
  positive: 'bg-sage/70',
  warning: 'bg-amber/70',
  neutral: 'bg-sky/70',
}
const TONE_ICON: Record<InsightTone, string> = {
  positive: 'text-[#235e20]',
  warning: 'text-[#6b4a10]',
  neutral: 'text-[#24498a]',
}
const TONE_STAT: Record<InsightTone, string> = {
  positive: 'text-sage-deep',
  warning: 'text-amber-deep',
  neutral: 'text-sky-deep',
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
    setAnalyzing(true); setRevealed(0)
    const t = setTimeout(() => setAnalyzing(false), 1400)
    return () => clearTimeout(t)
  }, [nonce])

  useEffect(() => {
    if (analyzing || revealed >= insights.length) return
    const t = setTimeout(() => setRevealed((r) => r + 1), 170)
    return () => clearTimeout(t)
  }, [analyzing, revealed, insights.length])

  return (
    <div className="animate-in relative overflow-hidden rounded-[20px] p-[1.5px] lg:col-span-12"
      style={{ background: 'linear-gradient(135deg, rgba(216,236,160,0.65), rgba(107,146,216,0.35), rgba(240,202,216,0.45), rgba(95,160,89,0.3))' }}>
      {/* Inner card */}
      <div className="relative overflow-hidden rounded-[18.5px] bg-card p-4">
        {/* Ambient glow orbs */}
        <div className="ai-glow-a pointer-events-none absolute -right-20 -top-24 size-60 rounded-full bg-lime/30 blur-[60px]" />
        <div className="ai-glow-b pointer-events-none absolute -bottom-20 left-1/4 size-52 rounded-full bg-sky/25 blur-[60px]" />
        <div className="ai-glow-c pointer-events-none absolute -bottom-16 right-1/4 size-40 rounded-full bg-rose/18 blur-[50px]" />

        {/* Header row */}
        <div className="relative flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className={clsx(
              'grid size-8 place-items-center rounded-xl bg-ink shadow-[0_0_0_4px_rgba(216,236,160,0.30),0_0_20px_-4px_rgba(174,206,82,0.35)]',
              analyzing && 'animate-pulse',
            )}>
              <Sparkles size={14} className="text-lime" />
            </span>
            <div>
              <h3 className="flex items-center gap-2 font-display text-sm font-semibold leading-none">
                AI Analysis
                <span className="rounded-full bg-lime px-1.5 py-0.5 text-[9px] font-bold text-[#495d16] uppercase tracking-wide">BETA</span>
              </h3>
              <p className="mt-0.5 text-[11px] text-ash">
                {analyzing ? 'Analysing workspace data…' : `${insights.length} insights · ${signals.length} live signals`}
              </p>
            </div>
          </div>
          <button
            onClick={() => setNonce((n) => n + 1)}
            className="grid size-8 place-items-center rounded-full border border-line bg-white text-ink transition-all hover:bg-soft hover:border-ink/20 active:scale-90"
            aria-label="Re-analyse"
          >
            <RefreshCw size={12} className={clsx(analyzing && 'animate-spin')} />
          </button>
        </div>

        {/* Insight cards */}
        {analyzing ? (
          <div className="relative mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-[88px] animate-pulse rounded-xl bg-soft/70" style={{ animationDelay: `${i * 100}ms` }} />
            ))}
          </div>
        ) : (
          <>
            <div className="relative mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {insights.map((ins, i) => {
                const Icon = ins.icon
                const shown = i < revealed
                return (
                  <div key={i}
                    className={clsx(
                      'group flex flex-col rounded-xl border bg-white/80 p-3 backdrop-blur-sm',
                      'transition-all duration-400 hover:-translate-y-[2px] hover:shadow-[0_8px_24px_-4px_rgba(26,29,27,0.12),0_20px_48px_-12px_rgba(26,29,27,0.13)]',
                      'border-line/60 hover:border-white/90',
                      shown ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0',
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className={clsx('font-display text-[22px] font-semibold leading-none tabular-nums', TONE_STAT[ins.tone])}>
                          {ins.stat}
                        </span>
                        <span className="ml-1.5 text-[10px] text-ash">{ins.statLabel}</span>
                      </div>
                      <span className={clsx('grid size-6 shrink-0 place-items-center rounded-lg', TONE_RING[ins.tone])}>
                        <Icon size={12} className={TONE_ICON[ins.tone]} />
                      </span>
                    </div>
                    <p className="mt-2 line-clamp-2 flex-1 text-[11px] leading-snug text-ash">{ins.title}</p>
                    {ins.to && (
                      <button
                        onClick={() => nav(ins.to!)}
                        className="mt-2 inline-flex items-center gap-1 self-start text-[11px] font-bold text-ink transition-all hover:text-black"
                      >
                        {ins.cta}
                        <ArrowUpRight size={11} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Signal pills */}
            <div className="relative mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-line/50 pt-2.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-ash/60 mr-1">Live signals</span>
              {signals.map((s, i) => (
                <span key={i}
                  className="inline-flex items-center gap-1.5 rounded-full bg-soft/90 border border-line/60 px-2.5 py-1 text-[10px] text-ash transition-colors hover:bg-soft hover:border-ink/15"
                  style={{ transitionDelay: `${i * 40}ms` }}>
                  <s.icon size={10} className="text-ash" />
                  {s.label}: <span className="font-bold text-ink ml-0.5">{s.value}</span>
                </span>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

import clsx from 'clsx'
import { AlertTriangle, ArrowUpRight, Boxes, CalendarClock, FolderKanban, Lightbulb, RefreshCw, Sparkles, TrendingUp, Users, Wallet, Wrench } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { attendanceTrend, complianceDeadlines, employees, headcountTrend, jobs, monthlyFinance, todayAttendance, type Asset, type Expense, type Invoice, type LeaveRequest } from '../data/mock'
import type { Project } from '../data/projects'
import type { ModuleKey } from '../data/roles'
import { toDay, todayDay } from '../lib/dates'
import { fmtCompact } from '../lib/format'
import { useApp, useAuth } from '../store'

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

/** Everything the insights are drawn from (store slices + the role's modules). */
interface Inputs {
  modules: ModuleKey[]
  focus: ModuleKey
  leaves: LeaveRequest[]
  invoices: Invoice[]
  expenses: Expense[]
  assets: Asset[]
  projects: Project[]
}

type Tagged<T> = T & { module: ModuleKey }

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

function hrInsights({ leaves }: Inputs): Tagged<Insight>[] {
  const out: Tagged<Insight>[] = []
  if (employees.length && todayAttendance.length) {
    const present = todayAttendance.filter((a) => a.status === 'Present' || a.status === 'Late').length
    const rate = ((present + todayAttendance.filter((a) => a.status === 'Remote').length) / employees.length) * 100
    const [prev, last] = attendanceTrend.slice(-2)
    const attnUp = last && prev ? last.present - prev.present : 0
    out.push({
      module: 'hr', tone: rate >= 90 ? 'positive' : 'warning', icon: TrendingUp, stat: `${rate.toFixed(1)}%`, statLabel: 'present today',
      title: attnUp >= 0 ? `Up ${attnUp} vs. yesterday — Engineering and Sales leading on-site presence.` : `Down ${Math.abs(attnUp)} vs. yesterday — worth a nudge to team leads.`,
      to: '/hr/attendance', cta: 'View attendance',
    })
  }
  const pending = leaves.filter((l) => l.status === 'Pending').length
  out.push({
    module: 'hr', tone: pending > 0 ? 'warning' : 'positive', icon: AlertTriangle, stat: `${pending}`, statLabel: 'awaiting approval',
    title: pending > 0 ? 'Clearing these keeps rota planning accurate — action from the AI assistant.' : 'No leave requests pending — rota planning is fully up to date.',
    to: '/hr/leave', cta: 'Review requests',
  })
  const [prevM, lastM] = headcountTrend.slice(-2)
  if (lastM) {
    const openings = jobs.reduce((s, j) => s + j.openings, 0)
    out.push({
      module: 'hr', tone: !prevM || lastM.hires >= prevM.hires ? 'positive' : 'neutral', icon: Sparkles, stat: `${lastM.hires}`, statLabel: 'hires this month',
      title: `${openings} roles open across ${jobs.length} pipelines — likely to close ${Math.max(1, Math.round(openings * 0.4))} within 30 days.`,
      to: '/hr/recruitment', cta: 'Open recruitment',
    })
  }
  return out
}

function financeInsights({ invoices, expenses }: Inputs): Tagged<Insight>[] {
  const overdue = invoices.filter((i) => i.status === 'Overdue')
  const claims = expenses.filter((e) => e.status === 'Pending')
  const lastMonth = monthlyFinance.at(-1)
  const out: Tagged<Insight>[] = [
    {
      module: 'finance', tone: overdue.length > 0 ? 'warning' : 'positive', icon: Lightbulb, stat: `${overdue.length}`, statLabel: 'invoices overdue',
      title: overdue.length > 0 ? `Chasing these first would improve this month's collection ratio the most.` : 'No overdue invoices — collections are healthy heading into payroll.',
      to: '/finance/invoices', cta: 'Go to invoices',
    },
    {
      module: 'finance', tone: claims.length > 0 ? 'warning' : 'positive', icon: Wallet, stat: `${claims.length}`, statLabel: 'claims to review',
      title: claims.length > 0 ? `${fmtCompact(claims.reduce((s, e) => s + e.amount, 0))} in expense claims waiting on approval.` : 'Every expense claim has been reviewed.',
      to: '/finance/expenses', cta: 'Review claims',
    },
  ]
  if (lastMonth && lastMonth.revenue) {
    const margin = (lastMonth.profit / lastMonth.revenue) * 100
    out.push({
      module: 'finance', tone: margin >= 15 ? 'positive' : 'neutral', icon: TrendingUp, stat: `${margin.toFixed(1)}%`, statLabel: 'profit margin',
      title: `${fmtCompact(lastMonth.revenue)} revenue against ${fmtCompact(lastMonth.expenses)} spend this month.`,
      to: '/finance/reports', cta: 'Open reports',
    })
  }
  return out
}

function assetInsights({ assets }: Inputs): Tagged<Insight>[] {
  const today = todayDay()
  const live = assets.filter((a) => a.status !== 'Retired')
  const available = live.filter((a) => a.status === 'Available').length
  const due = live.filter((a) => a.nextMaintenanceDate && toDay(a.nextMaintenanceDate) - today <= 7).length
  const late = live.filter((a) => a.status === 'Assigned' && a.returnDue && toDay(a.returnDue) < today).length
  const warranty = live.filter((a) => { const d = a.warrantyUntil ? toDay(a.warrantyUntil) - today : -1; return d >= 0 && d <= 60 }).length
  return [
    {
      module: 'assets', tone: available > 0 ? 'positive' : 'warning', icon: Boxes, stat: `${available}`, statLabel: 'ready to assign',
      title: `${plural(live.length, 'active asset')} — ${Math.round(((live.length - available) / Math.max(1, live.length)) * 100)}% in use or in service.`,
      to: '/assets/inventory', cta: 'Open inventory',
    },
    {
      module: 'assets', tone: due > 0 ? 'warning' : 'positive', icon: Wrench, stat: `${due}`, statLabel: 'maintenance due',
      title: due > 0 ? 'Due within 7 days — schedule them before they fall overdue.' : 'No preventive maintenance due this week.',
      to: '/assets/inventory', cta: 'Plan maintenance',
    },
    {
      module: 'assets', tone: late > 0 ? 'warning' : 'positive', icon: AlertTriangle, stat: `${late}`, statLabel: 'loans overdue',
      title: late > 0 ? 'Loaned devices past their return date — follow up with the holders.' : 'Every loaned device is within its return date.',
      to: '/assets/inventory', cta: 'View loans',
    },
    {
      module: 'assets', tone: warranty > 0 ? 'neutral' : 'positive', icon: CalendarClock, stat: `${warranty}`, statLabel: 'warranties ending',
      title: warranty > 0 ? 'Warranty cover ends within 60 days — raise any claims now.' : 'No warranties expiring in the next 60 days.',
      to: '/assets/inventory', cta: 'Review assets',
    },
  ]
}

function projectInsights({ projects }: Inputs): Tagged<Insight>[] {
  const today = todayDay()
  const active = projects.filter((p) => p.status !== 'Completed')
  const late = active.filter((p) => toDay(p.plannedEnd) < today).length
  const hold = projects.filter((p) => p.status === 'On Hold').length
  const blocked = active.filter((p) => p.updates[0]?.blocker).length
  return [
    {
      module: 'projects', tone: late > 0 ? 'warning' : 'positive', icon: CalendarClock, stat: `${late}`, statLabel: 'past planned end',
      title: late > 0 ? 'Re-plan or unblock these before the slip compounds.' : `All ${plural(active.length, 'active project')} are within their planned dates.`,
      to: '/projects/timeline', cta: 'Open timeline',
    },
    {
      module: 'projects', tone: blocked > 0 ? 'warning' : 'positive', icon: AlertTriangle, stat: `${blocked}`, statLabel: 'reporting blockers',
      title: blocked > 0 ? 'Their latest update flags a blocker — worth a check-in.' : 'No blockers in the latest project updates.',
      to: '/projects/portfolio', cta: 'View portfolio',
    },
    {
      module: 'projects', tone: hold > 0 ? 'neutral' : 'positive', icon: FolderKanban, stat: `${hold}`, statLabel: 'on hold',
      title: `${plural(projects.length, 'project')} in the portfolio, ${plural(projects.length - active.length, 'delivered')}.`,
      to: '/projects/portfolio', cta: 'Open portfolio',
    },
  ]
}

/** Insights for the modules this role can use, the current dashboard's module first. Max 4. */
function buildInsights(input: Inputs): Insight[] {
  const all = [...hrInsights(input), ...financeInsights(input), ...assetInsights(input), ...projectInsights(input)]
    .filter((i) => input.modules.includes(i.module))
  return [...all.filter((i) => i.module === input.focus), ...all.filter((i) => i.module !== input.focus)].slice(0, 4)
}

function buildSignals({ modules, assets, projects }: Inputs) {
  const can = (m: ModuleKey) => modules.includes(m)
  const out: { icon: typeof Users; label: string; value: string }[] = []
  if (can('hr') && employees.length) {
    const avgTenureYrs = employees.reduce((s, e) => s + (Date.now() - new Date(e.joinDate).getTime()) / 3.15576e10, 0) / employees.length
    out.push({ icon: Users, label: 'Avg. tenure', value: `${avgTenureYrs.toFixed(1)} yrs` })
    out.push({ icon: Users, label: 'On probation', value: `${employees.filter((e) => e.status === 'Probation').length}` })
  }
  const nextDeadline = can('hr') || can('finance') ? complianceDeadlines[0] : undefined
  if (nextDeadline) out.push({ icon: CalendarClock, label: nextDeadline.title, value: `${nextDeadline.daysLeft}d left` })
  const lastMonth = can('finance') ? monthlyFinance.at(-1) : undefined
  if (lastMonth?.revenue) out.push({ icon: Wallet, label: 'Profit margin MTD', value: `${((lastMonth.profit / lastMonth.revenue) * 100).toFixed(1)}%` })
  if (can('assets')) {
    const live = assets.filter((a) => a.status !== 'Retired')
    out.push({ icon: Boxes, label: 'Fleet value', value: fmtCompact(live.reduce((s, a) => s + a.cost, 0)) })
    out.push({ icon: Wrench, label: 'In maintenance', value: `${live.filter((a) => a.status === 'Maintenance').length}` })
  }
  if (can('projects')) {
    out.push({ icon: FolderKanban, label: 'Projects in flight', value: `${projects.filter((p) => p.status === 'In Progress').length}` })
    out.push({ icon: Wallet, label: 'Portfolio budget', value: fmtCompact(projects.reduce((s, p) => s + p.budget, 0)) })
  }
  return out.slice(0, 5)
}

const NO_MODULES: ModuleKey[] = []

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
  const { pathname } = useLocation()
  const { leaves, invoices, expenses, assets, projects } = useApp()
  const modules = useAuth((s) => s.user?.modules) ?? NO_MODULES
  // Lead with the insights for the dashboard being viewed.
  const focus = (pathname.split('/')[1] || modules[0]) as ModuleKey
  const insights = useMemo(
    () => buildInsights({ modules, focus, leaves, invoices, expenses, assets, projects }),
    [modules, focus, leaves, invoices, expenses, assets, projects],
  )
  const signals = useMemo(
    () => buildSignals({ modules, focus, leaves, invoices, expenses, assets, projects }),
    [modules, assets, projects],
  )

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

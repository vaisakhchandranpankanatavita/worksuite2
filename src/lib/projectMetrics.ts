import { budgets, employees, type Asset, type Expense, type Invoice } from '../data/mock'
import type { Phase, Project } from '../data/projects'
import { fromDay, isWeekday, toDay, todayDay } from './dates'

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))
const MONTH = 30.44

/* ─────────────────────────── Progress ─────────────────────────── */

const phaseDur = (p: Phase) => Math.max(1, toDay(p.plannedEnd) - toDay(p.plannedStart))

/** Overall progress 0–100, weighted by each phase's planned duration. */
export function overallProgress(phases: Phase[]): number {
  const total = phases.reduce((s, p) => s + phaseDur(p), 0)
  return total ? phases.reduce((s, p) => s + (phaseDur(p) * p.progress) / 100, 0) / total * 100 : 0
}

/** Where the plan says the project should be on `day`, 0–100. */
export function plannedProgress(phases: Phase[], day: number): number {
  const total = phases.reduce((s, p) => s + phaseDur(p), 0)
  if (!total) return 0
  const done = phases.reduce((s, p) => s + phaseDur(p) * clamp((day - toDay(p.plannedStart)) / phaseDur(p), 0, 1), 0)
  return (done / total) * 100
}

/* ─────────────────────── Schedule projection ───────────────────── */

export interface PhaseForecast {
  phase: Phase
  state: 'done' | 'active' | 'pending'
  plannedStart: number
  plannedEnd: number
  projStart: number
  projEnd: number
  /** Projected end minus planned end, in days. Positive = late. */
  slip: number
  /** Work rate relative to plan (1 = exactly on plan). */
  eff: number
}

export interface Forecast {
  phases: PhaseForecast[]
  today: number
  startDay: number
  baselineEnd: number
  plannedEnd: number
  projectedEnd: number
  optimisticEnd: number
  pessimisticEnd: number
  /** Projected end vs the currently approved plan. */
  slipDays: number
  /** Projected end vs the original commitment. */
  slipVsBaseline: number
  daysLeft: number
  progress: number
  plannedPct: number
  /** Schedule performance index: actual ÷ planned progress. */
  spi: number
  onTimeChance: number
  stalled: boolean
  lastUpdateAge: number
}

interface Step { start: number; end: number; eff: number; state: PhaseForecast['state'] }

/**
 * Waterfall cascade: each unfinished phase is projected at the pace it is actually running,
 * and a late phase pushes every phase after it. `mul` scales pace for optimistic / pessimistic runs.
 */
function cascade(p: Project, today: number, spi: number, mul: number): Step[] {
  const hold = p.status === 'On Hold' ? 0.85 : 1
  const future = 1 + (spi - 1) * 0.6 // later phases regress towards plan
  let prevEnd = -Infinity
  return p.phases.map((ph, i): Step => {
    const s = toDay(ph.plannedStart)
    const dur = phaseDur(ph)
    if (ph.progress >= 100) {
      const start = ph.actualStart ? toDay(ph.actualStart) : s
      const end = ph.actualEnd ? toDay(ph.actualEnd) : toDay(ph.plannedEnd)
      prevEnd = end
      return { start, end, eff: 1, state: 'done' }
    }
    if (ph.progress > 0) {
      // Pace is measured from when the phase actually began — an earlier slip is already in `start`.
      const start = ph.actualStart ? toDay(ph.actualStart) : s
      const pp = clamp((today - start) / dur, 0, 1)
      const raw = pp < 0.08 ? spi : clamp(ph.progress / 100 / pp, 0.4, 1.6)
      const eff = clamp(raw * mul * hold, 0.3, 2)
      const end = Math.max(today, start) + Math.ceil(((100 - ph.progress) / 100) * dur / eff)
      prevEnd = end
      return { start, end, eff, state: 'active' }
    }
    const eff = clamp(future * mul * hold, 0.3, 2)
    const start = i === 0 ? Math.max(s, today) : Math.max(prevEnd, today)
    const end = start + Math.ceil(dur / eff)
    prevEnd = end
    return { start, end, eff, state: 'pending' }
  })
}

function erf(x: number) {
  const t = 1 / (1 + 0.3275911 * Math.abs(x))
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x)
  return x >= 0 ? y : -y
}
const normCdf = (z: number) => 0.5 * (1 + erf(z / Math.SQRT2))

export function forecast(p: Project, today = todayDay()): Forecast {
  const startDay = toDay(p.startDate)
  const baselineEnd = toDay(p.baselineEnd)
  const plannedEnd = toDay(p.plannedEnd)
  const progress = overallProgress(p.phases)
  const plannedPct = plannedProgress(p.phases, today)
  const spi = clamp(plannedPct > 1 ? progress / plannedPct : 1, 0.5, 1.4)
  const lastUpdate = p.updates[0] ? toDay(p.updates[0].date) : startDay
  const lastUpdateAge = Math.max(0, today - lastUpdate)

  const base = cascade(p, today, spi, 1)
  const opt = cascade(p, today, spi, 1.2)
  const pes = cascade(p, today, spi, 0.8)
  const done = p.status === 'Completed'
  const projectedEnd = done && p.actualEnd ? toDay(p.actualEnd) : base[base.length - 1].end
  const optimisticEnd = done ? projectedEnd : opt[opt.length - 1].end
  const pessimisticEnd = done ? projectedEnd : pes[pes.length - 1].end
  const sigma = Math.max(1.5, (pessimisticEnd - optimisticEnd) / 2.56)
  const onTimeChance = done ? (projectedEnd <= plannedEnd ? 100 : 0) : clamp(normCdf((plannedEnd - projectedEnd) / sigma) * 100, 1, 99)

  return {
    phases: p.phases.map((phase, i) => ({
      phase,
      state: base[i].state,
      plannedStart: toDay(phase.plannedStart),
      plannedEnd: toDay(phase.plannedEnd),
      projStart: base[i].start,
      projEnd: base[i].end,
      slip: base[i].end - toDay(phase.plannedEnd),
      eff: base[i].eff,
    })),
    today,
    startDay,
    baselineEnd,
    plannedEnd,
    projectedEnd,
    optimisticEnd,
    pessimisticEnd,
    slipDays: projectedEnd - plannedEnd,
    slipVsBaseline: projectedEnd - baselineEnd,
    daysLeft: projectedEnd - today,
    progress,
    plannedPct,
    spi,
    onTimeChance,
    stalled: p.status === 'In Progress' && progress < 100 && lastUpdateAge >= 4,
    lastUpdateAge,
  }
}

/* ────────────────────────── Finance ───────────────────────────── */

export interface Finance {
  budget: number
  /** Funds released to the project so far. */
  allotted: number
  used: number
  people: number
  assetCharge: number
  expenseClaims: number
  vendors: number
  /** Allotted funds not yet used (negative = spending ahead of released funds). */
  headroom: number
  usedPct: number
  allottedPct: number
  /** Estimate at completion — cost-performance run-rate plus the cost of any delay. */
  eac: number
  overrun: number
  dailyBurn: number
  delayCost: number
  cpi: number
  expenses: Expense[]
  invoices: Invoice[]
  billed: number
  collected: number
}

const ASSET_LIFE_MONTHS = 36
const memberMonthly = (empId: string, alloc: number) => ((employees.find((e) => e.id === empId)?.ctcAnnual ?? 0) / 12) * (alloc / 100)

/** Cumulative cost incurred by `day` — used for the burn curve. */
export function costAt(p: Project, day: number, assetById: Map<string, Asset>, expenses: Expense[]): number {
  let total = 0
  for (const m of p.team) {
    const s = toDay(m.since)
    const e = Math.min(day, m.until ? toDay(m.until) : day)
    if (e > s) total += memberMonthly(m.employeeId, m.allocation) * ((e - s) / MONTH)
  }
  for (const l of p.assetLinks) {
    const a = assetById.get(l.assetId)
    const s = toDay(l.since)
    const e = Math.min(day, l.until ? toDay(l.until) : day)
    if (a && e > s) total += (a.cost / ASSET_LIFE_MONTHS) * ((e - s) / MONTH)
  }
  for (const x of expenses) if (toDay(x.date) <= day) total += x.amount
  for (const v of p.vendors) if (toDay(v.date) <= day) total += v.amount
  return total
}

function financeOf(p: Project, fc: Forecast, expenses: Expense[], invoices: Invoice[], assetById: Map<string, Asset>): Finance {
  const today = fc.today
  const end = p.status === 'Completed' && p.actualEnd ? toDay(p.actualEnd) : today
  const people = p.team.reduce((s, m) => {
    const a = toDay(m.since)
    const b = Math.min(end, m.until ? toDay(m.until) : end)
    return b > a ? s + memberMonthly(m.employeeId, m.allocation) * ((b - a) / MONTH) : s
  }, 0)
  const assetCharge = p.assetLinks.reduce((s, l) => {
    const a = assetById.get(l.assetId)
    const from = toDay(l.since)
    const to = Math.min(end, l.until ? toDay(l.until) : end)
    return a && to > from ? s + (a.cost / ASSET_LIFE_MONTHS) * ((to - from) / MONTH) : s
  }, 0)
  const expenseClaims = expenses.filter((e) => e.status !== 'Rejected').reduce((s, e) => s + e.amount, 0)
  const vendors = p.vendors.reduce((s, v) => s + v.amount, 0)
  const used = people + assetCharge + expenseClaims + vendors
  const allotted = p.tranches.reduce((s, t) => s + t.amount, 0)

  const dailyBurn = p.team.filter((m) => !m.until).reduce((s, m) => s + memberMonthly(m.employeeId, m.allocation), 0) / MONTH
  const frac = fc.progress / 100
  const ev = p.budget * frac
  const cpi = used > 0 && ev > 0 ? clamp(ev / used, 0.5, 1.6) : 1
  const delayCost = p.status === 'Completed' || p.status === 'On Hold' ? 0 : Math.max(0, fc.slipDays) * dailyBurn
  const eac = p.status === 'Completed' ? used : frac < 0.03 ? p.budget + delayCost : used + (p.budget - ev) / cpi + delayCost

  const live = invoices.filter((i) => i.status !== 'Draft')
  return {
    budget: p.budget,
    allotted,
    used,
    people,
    assetCharge,
    expenseClaims,
    vendors,
    headroom: allotted - used,
    usedPct: p.budget ? (used / p.budget) * 100 : 0,
    allottedPct: p.budget ? (allotted / p.budget) * 100 : 0,
    eac,
    overrun: eac - p.budget,
    dailyBurn,
    delayCost,
    cpi,
    expenses,
    invoices,
    billed: live.reduce((s, i) => s + i.total, 0),
    collected: invoices.filter((i) => i.status === 'Paid').reduce((s, i) => s + i.total, 0),
  }
}

/* ───────────────────── Health, XP & badges ─────────────────────── */

export type HealthTone = 'green' | 'amber' | 'rose' | 'blue' | 'gray'
export interface Health { score: number; label: string; tone: HealthTone; parts: { schedule: number; budget: number; cadence: number; risk: number } }

function healthOf(p: Project, fc: Forecast, fin: Finance): Health {
  const overrunPct = p.budget ? (fin.overrun / p.budget) * 100 : 0
  const burnGap = fin.usedPct - fc.progress
  const schedule = clamp(100 - Math.max(0, fc.slipDays) * 4.5 - Math.max(0, 1 - fc.spi) * 60, 0, 100)
  const budget = clamp(100 - Math.max(0, overrunPct) * 4 - Math.max(0, burnGap - 8) * 2, 0, 100)
  const cadence = p.status === 'Initiated' || p.status === 'Completed' ? 100 : clamp(100 - Math.max(0, fc.lastUpdateAge - 1) * 15, 0, 100)
  const blockers = p.updates.filter((u) => u.blocker && fc.today - toDay(u.date) <= 6).length
  const risk = clamp(100 - blockers * 20, 0, 100)
  let score = Math.round(schedule * 0.5 + budget * 0.25 + cadence * 0.15 + risk * 0.1)
  if (p.status === 'On Hold') score = Math.min(score, 55)
  const parts = { schedule: Math.round(schedule), budget: Math.round(budget), cadence: Math.round(cadence), risk: Math.round(risk) }
  if (p.status === 'Completed') return { score: Math.max(score, 88), label: 'Delivered', tone: 'blue', parts }
  if (p.status === 'Initiated') return { score: 80, label: 'Initiated', tone: 'gray', parts }
  if (p.status === 'On Hold') return { score, label: 'On hold', tone: 'gray', parts }
  return score >= 80 ? { score, label: 'On track', tone: 'green', parts } : score >= 62 ? { score, label: 'At risk', tone: 'amber', parts } : { score, label: 'Delayed', tone: 'rose', parts }
}

export interface Badge { id: string; label: string; hint: string; earned: boolean; progress?: string; icon: 'flame' | 'target' | 'shield' | 'rocket' | 'layers' | 'users' | 'trophy' }
export interface Game { xp: number; level: number; levelStart: number; levelEnd: number; streak: number; badges: Badge[] }

/** Consecutive working days with an update, ending today (today gets a grace period until it's posted). */
export function updateStreak(p: Project, today = todayDay()): number {
  const days = new Set(p.updates.map((u) => toDay(u.date)))
  let streak = 0
  for (let d = today; d >= toDay(p.startDate); d--) {
    if (!isWeekday(d)) continue
    if (days.has(d)) streak++
    else if (d === today) continue
    else break
  }
  return streak
}

function gameOf(p: Project, fc: Forecast, fin: Finance): Game {
  const streak = updateStreak(p)
  const phasesDone = p.phases.filter((ph) => ph.progress >= 100).length
  const completed = p.status === 'Completed'
  const onBudget = fin.eac <= p.budget * 1.02
  const aheadOrOn = fc.slipDays <= 0
  const xp = phasesDone * 120 + p.updates.length * 10 + streak * 15 + (aheadOrOn && p.status !== 'Initiated' ? 100 : 0) + (onBudget && p.status !== 'Initiated' ? 80 : 0) + (completed ? 300 : 0)
  const level = 1 + Math.floor(Math.sqrt(xp / 60))
  const activeMembers = p.team.filter((m) => !m.until).length
  const activeAssets = p.assetLinks.filter((l) => !l.until).length
  const badges: Badge[] = [
    { id: 'streak', label: 'Update streak', hint: '7 working days of updates in a row', earned: streak >= 7, progress: `${Math.min(streak, 7)}/7 days`, icon: 'flame' },
    { id: 'clock', label: 'On the clock', hint: 'Schedule index of 0.98 or better', earned: p.status !== 'Initiated' && fc.spi >= 0.98, progress: `SPI ${fc.spi.toFixed(2)}`, icon: 'target' },
    { id: 'guardian', label: 'Budget guardian', hint: 'Forecast lands within budget', earned: p.status !== 'Initiated' && onBudget, progress: `${Math.round((fin.eac / (p.budget || 1)) * 100)}% of budget`, icon: 'shield' },
    { id: 'early', label: 'Early bird', hint: 'Projected to finish before plan', earned: p.status !== 'Initiated' && fc.slipDays < 0, progress: fc.slipDays < 0 ? `${-fc.slipDays}d early` : 'not yet', icon: 'rocket' },
    { id: 'crusher', label: 'Phase crusher', hint: 'Three phases fully complete', earned: phasesDone >= 3, progress: `${phasesDone}/3 phases`, icon: 'layers' },
    { id: 'resourced', label: 'Fully resourced', hint: '5+ people, 3+ assets and released funds', earned: activeMembers >= 5 && activeAssets >= 3 && fin.allotted > 0, progress: `${activeMembers} people · ${activeAssets} assets`, icon: 'users' },
    { id: 'ship', label: 'Ship it', hint: 'Project delivered', earned: completed, progress: completed ? 'delivered' : `${Math.round(fc.progress)}% done`, icon: 'trophy' },
  ]
  return { xp, level, levelStart: 60 * (level - 1) ** 2, levelEnd: 60 * level ** 2, streak, badges }
}

/* ─────────────────────────── Analysis ─────────────────────────── */

export interface Analysis { project: Project; fc: Forecast; fin: Finance; health: Health; game: Game }

/** Expense claims are tagged to the project (of those a claimant is on) where they carry the most allocation. */
function expenseOwners(projects: Project[], expenses: Expense[]) {
  const owner = new Map<string, string>()
  for (const x of expenses) {
    let best: { id: string; alloc: number } | undefined
    for (const p of projects) {
      const m = p.team.find((t) => t.employeeId === x.employeeId)
      if (!m || (p.status === 'Completed' && x.date > (p.actualEnd ?? ''))) continue
      if (!best || m.allocation > best.alloc) best = { id: p.id, alloc: m.allocation }
    }
    if (best) owner.set(x.id, best.id)
  }
  return owner
}

export function analyzeAll(projects: Project[], expenses: Expense[], invoices: Invoice[], assets: Asset[]): Analysis[] {
  const assetById = new Map(assets.map((a) => [a.id, a]))
  const owners = expenseOwners(projects, expenses)
  return projects.map((project) => {
    const fc = forecast(project)
    const own = expenses.filter((x) => owners.get(x.id) === project.id && x.date >= project.startDate)
    const inv = project.client === 'Internal' ? [] : invoices.filter((i) => i.client.name === project.client && i.issueDate >= project.startDate)
    const fin = financeOf(project, fc, own, inv, assetById)
    return { project, fc, fin, health: healthOf(project, fc, fin), game: gameOf(project, fc, fin) }
  })
}

/** Cumulative-cost series (planned / actual / forecast) for the burn chart. */
export function burnSeries(a: Analysis, assets: Asset[], steps = 14) {
  const { project: p, fc, fin } = a
  const assetById = new Map(assets.map((x) => [x.id, x]))
  const first = fc.startDay
  const last = Math.max(fc.plannedEnd, fc.projectedEnd)
  const points = Array.from({ length: steps + 1 }, (_, i) => Math.round(first + ((last - first) * i) / steps))
  if (!points.includes(fc.today) && fc.today > first && fc.today < last) points.push(fc.today)
  points.sort((x, y) => x - y)
  return points.map((d) => {
    const plan = p.budget * (plannedProgress(p.phases, d) / 100)
    const actual = d <= fc.today ? costAt(p, d, assetById, fin.expenses) : undefined
    const proj = d >= fc.today ? fin.used + ((fin.eac - fin.used) * (d - fc.today)) / Math.max(1, fc.projectedEnd - fc.today) : undefined
    return { day: d, label: fromDay(d), plan: Math.round(plan), actual: actual === undefined ? undefined : Math.round(actual), forecast: proj === undefined || p.status === 'Completed' ? undefined : Math.round(Math.min(proj, fin.eac)) }
  })
}

/** Department budget draw — how much of a department's annual budget projects commit. */
export function deptDraw(analyses: Analysis[], dept: string) {
  const b = budgets.find((x) => x.dept === dept)
  const committed = analyses.filter((a) => a.project.fundingDept === dept && a.project.status !== 'Completed').reduce((s, a) => s + a.project.budget, 0)
  return { allocated: b?.allocated ?? 0, spent: b?.spent ?? 0, committed }
}

import { assets, employees, type Department } from './mock'
import { fromDay, isWeekday, todayDay, toDay } from '../lib/dates'
import { mulberry32 } from '../lib/format'

export type ProjectStatus = 'Initiated' | 'In Progress' | 'On Hold' | 'Completed'

export interface Phase {
  id: string
  name: string
  plannedStart: string
  plannedEnd: string
  /** 0–100 */
  progress: number
  ownerId: string
  actualStart?: string
  actualEnd?: string
}

export interface ProjectUpdate {
  id: string
  date: string
  authorId: string
  phaseId: string
  /** Overall project progress (0–100) at the time of the update. */
  progress: number
  note: string
  blocker?: string
}

/** A release of funds from the approved budget ("allotment"). */
export interface Tranche { id: string; date: string; amount: number; note: string }
export interface VendorSpend { id: string; date: string; vendor: string; amount: number; note: string }
export interface Member { employeeId: string; role: string; allocation: number; since: string; until?: string }
export interface AssetLink { assetId: string; since: string; until?: string }
export interface Replan { id: string; date: string; from: string; to: string; reason: string }

export interface Project {
  id: string
  code: string
  name: string
  client: string
  summary: string
  status: ProjectStatus
  headId: string
  leadId: string
  fundingDept: Department
  startDate: string
  /** Original commitment — never changes. */
  baselineEnd: string
  /** Current approved end date (moves when the project is re-planned). */
  plannedEnd: string
  actualEnd?: string
  budget: number
  tranches: Tranche[]
  vendors: VendorSpend[]
  team: Member[]
  assetLinks: AssetLink[]
  phases: Phase[]
  updates: ProjectUpdate[]
  replans: Replan[]
}

/* ─── Waterfall template ───────────────────────────────────── */

export const PHASE_TEMPLATE: readonly (readonly [string, number])[] = [
  ['Initiation', 0.1],
  ['Requirements & Design', 0.2],
  ['Build', 0.35],
  ['Testing & QA', 0.2],
  ['Deployment & Handover', 0.15],
]
export const TRANCHE_SPLIT = [0.25, 0.25, 0.25, 0.15, 0.1]

/** Lay out the five waterfall phases back-to-back across `[startDay, startDay + durDays]`. */
export function buildPhases(prefix: string, startDay: number, durDays: number, ownerIds: string[]): Phase[] {
  let cum = 0
  return PHASE_TEMPLATE.map(([name, frac], k) => {
    const s = startDay + Math.round(durDays * cum)
    cum += frac
    const e = startDay + Math.round(durDays * cum)
    return { id: `${prefix}-P${k + 1}`, name, plannedStart: fromDay(s), plannedEnd: fromDay(e), progress: 0, ownerId: ownerIds[k % ownerIds.length] }
  })
}

/** Share of total planned work (0–1) that should be done by `day`. */
export function plannedFraction(phases: Phase[], day: number): number {
  let total = 0
  let done = 0
  for (const p of phases) {
    const s = toDay(p.plannedStart)
    const e = toDay(p.plannedEnd)
    const dur = Math.max(1, e - s)
    total += dur
    done += dur * Math.min(1, Math.max(0, (day - s) / dur))
  }
  return total ? done / total : 0
}

/* ─── Seed ─────────────────────────────────────────────────── */

interface Def {
  code: string
  name: string
  client: string
  summary: string
  dept: Department
  start: number // days from today
  dur: number
  /** Actual work rate ÷ planned work rate. <1 is behind, >1 is ahead. */
  pace: number
  team: number
  budgetFactor: number
  diligence: number
  postedToday: boolean
  status?: ProjectStatus
  completedLateBy?: number
  replans?: { daysAgo: number; shift: number; reason: string }[]
}

const DEFS: Def[] = [
  { code: 'PRJ-101', name: 'Commerce Platform Revamp', client: 'Tata Digital', summary: 'Rebuild the storefront and checkout on a headless architecture.', dept: 'Engineering', start: -78, dur: 150, pace: 0.88, team: 14, budgetFactor: 1.08, diligence: 0.85, postedToday: true },
  { code: 'PRJ-102', name: 'KYC Onboarding Engine', client: 'Zeta Fintech', summary: 'Automated document + video KYC with a four-minute onboarding target.', dept: 'Engineering', start: -60, dur: 110, pace: 1.06, team: 11, budgetFactor: 1.14, diligence: 0.95, postedToday: true },
  { code: 'PRJ-103', name: 'Fleet Tracking App', client: 'Mahindra Logistics', summary: 'Driver + dispatcher apps with live vehicle telemetry.', dept: 'Operations', start: -95, dur: 100, pace: 0.66, team: 12, budgetFactor: 0.97, diligence: 0.55, postedToday: false, replans: [{ daysAgo: 22, shift: 10, reason: 'Telemetry vendor delivered SDK late' }] },
  { code: 'PRJ-104', name: 'D2C Brand & Launch', client: 'Freshleaf Organics', summary: 'Brand identity, storefront and launch campaign for the D2C range.', dept: 'Marketing', start: -40, dur: 90, pace: 1.0, team: 9, budgetFactor: 1.12, diligence: 0.9, postedToday: true },
  { code: 'PRJ-105', name: 'Patient Portal UX', client: 'Nexora Health', summary: 'Research-led redesign of the patient portal and appointment flow.', dept: 'Design', start: -110, dur: 120, pace: 0.93, team: 8, budgetFactor: 1.06, diligence: 0.8, postedToday: false },
  { code: 'PRJ-106', name: 'Sales Analytics Suite', client: 'Bluecart Retail', summary: 'Dashboards and forecasting for regional sales leadership.', dept: 'Sales', start: -50, dur: 130, pace: 0.72, team: 7, budgetFactor: 1.0, diligence: 0.4, postedToday: false, status: 'On Hold' },
  { code: 'PRJ-107', name: 'Dealer CRM Rollout', client: 'Kinetic Motors', summary: 'Roll a CRM out to 140 dealerships with training and data migration.', dept: 'Customer Success', start: 6, dur: 100, pace: 0, team: 8, budgetFactor: 1.15, diligence: 0, postedToday: false, status: 'Initiated' },
  { code: 'PRJ-108', name: 'LMS Migration', client: 'Aster Learning', summary: 'Migrate 60k learners and courses to the new learning platform.', dept: 'Engineering', start: -150, dur: 140, pace: 1, team: 10, budgetFactor: 1.1, diligence: 0.9, postedToday: false, status: 'Completed', completedLateBy: 2 },
  { code: 'PRJ-109', name: 'HR Self-Service Portal', client: 'Internal', summary: 'Employee self-service for leave, payslips and letters.', dept: 'Human Resources', start: -50, dur: 80, pace: 0.97, team: 6, budgetFactor: 1.1, diligence: 0.85, postedToday: true },
]

const NOTES: string[][] = [
  ['Kick-off held with stakeholders; scope sign-off in review.', 'Charter drafted and shared with the sponsor.', 'Team onboarded, access and tooling provisioned.', 'Risk register created — three items rated high.'],
  ['Wireframes reviewed with the client; two rounds of feedback folded in.', 'Requirements baselined — 42 user stories groomed.', 'Design system tokens agreed; high-fidelity screens in progress.', 'Architecture review completed, API contracts frozen.'],
  ['Sprint goals met; core module merged to the main branch.', 'Integration with the payment sandbox working end to end.', 'Two stories carried over; pairing to clear the backlog.', 'Performance pass done — p95 latency under target.', 'Build pipeline stable; nightly deploys green.'],
  ['Regression suite running; 14 defects triaged, 3 critical.', 'UAT started with the client team.', 'Load test at 2× peak passed; fixes for edge cases in review.', 'Security scan clean apart from two medium findings.'],
  ['Go-live checklist 80% complete; cutover rehearsal booked.', 'Training sessions delivered to the first two groups.', 'Hypercare rota agreed for the first fortnight.', 'Handover documents shared and signed off.'],
]
const BLOCKERS = ['Waiting on client sign-off', 'Vendor API access delayed', 'Test environment unstable', 'Key reviewer on leave', 'Scope change request pending']
const VENDORS: [string, string][] = [
  ['AWS Cloud', 'Hosting & environments'],
  ['Figma & design tooling', 'Design seats'],
  ['Third-party licences', 'SDK and component licences'],
  ['Freelance specialists', 'Short-term specialist contractors'],
  ['Load-testing partner', 'Performance test campaign'],
  ['Security audit firm', 'Pre-launch penetration test'],
]
const PROJECT_ROLES = ['Engineer', 'Senior Engineer', 'QA Engineer', 'Designer', 'Analyst', 'Business Analyst', 'DevOps Engineer', 'Scrum Master']
const ALLOCATIONS = [100, 100, 80, 60, 50, 40, 25]

export const DEPT_HEAD_COUNT = 8

function seed(): Project[] {
  const rand = mulberry32(90210)
  const pick = <T,>(a: readonly T[]) => a[Math.floor(rand() * a.length)]
  const between = (a: number, b: number) => Math.floor(a + rand() * (b - a + 1))
  const T = todayDay()
  const heads = employees.slice(0, DEPT_HEAD_COUNT)
  const pool = employees.slice(DEPT_HEAD_COUNT).filter((e) => e.status !== 'Notice Period')
  const deptIdx = (d: Department) => heads.findIndex((h) => h.department === d)

  // Non-laptop assets are shared out across projects round-robin, so every project has kit deployed on it.
  const sharedPool = assets.filter((a) => a.category !== 'Laptop' && a.status !== 'Retired')
  let sharedCursor = 0

  return DEFS.map((def, idx): Project => {
    const startDay = T + def.start
    const baselineEnd = startDay + def.dur
    const head = heads[deptIdx(def.dept)]
    const sameDept = pool.filter((e) => e.department === def.dept)
    const others = pool.filter((e) => e.department !== def.dept)
    const lead = sameDept.find((e) => /Manager|Lead/.test(e.role)) ?? sameDept[0]

    // Team: head + lead + a mix of same-department and cross-functional people.
    const used = new Set<string>([head.id, lead.id])
    const team = [
      { employeeId: head.id, role: 'Project Head', allocation: 20, since: fromDay(startDay) },
      { employeeId: lead.id, role: 'Delivery Lead', allocation: 60, since: fromDay(startDay) },
    ]
    while (team.length < def.team) {
      const e = rand() < 0.6 && sameDept.length ? pick(sameDept) : pick(others)
      if (used.has(e.id)) continue
      used.add(e.id)
      team.push({ employeeId: e.id, role: pick(PROJECT_ROLES), allocation: pick(ALLOCATIONS), since: fromDay(startDay + between(0, 10)) })
    }
    const ownerIds = [head.id, lead.id, team[2].employeeId, team[3].employeeId, lead.id]

    // Waterfall phases, filled sequentially according to the project's pace.
    const phases = buildPhases(def.code, startDay, def.dur, ownerIds)
    const completed = def.status === 'Completed'
    const totalDur = phases.reduce((s, p) => s + (toDay(p.plannedEnd) - toDay(p.plannedStart)), 0)
    const work = completed ? 1 : Math.min(1, def.pace * plannedFraction(phases, T))
    let remaining = work * totalDur
    let cursorWork = 0
    let prevActualEnd: number | undefined
    phases.forEach((p, k) => {
      const len = toDay(p.plannedEnd) - toDay(p.plannedStart)
      const take = Math.min(len, remaining)
      remaining -= take
      cursorWork += len
      p.progress = Math.round((take / len) * 100)
      if (p.progress > 0) p.actualStart = fromDay(prevActualEnd ?? toDay(p.plannedStart))
      if (p.progress >= 100) {
        // When did the cumulative planned work reach this phase's boundary at the project's pace?
        let endDay = toDay(p.plannedEnd)
        if (completed) endDay += k >= 3 ? def.completedLateBy ?? 0 : 0
        else for (let d = startDay; d <= T; d++) if (def.pace * plannedFraction(phases, d) * totalDur >= cursorWork) { endDay = d; break }
        p.actualEnd = fromDay(endDay)
        prevActualEnd = endDay
      }
    })

    // Daily updates — the history behind the velocity used for projections.
    const endDay = completed ? toDay(phases[4].actualEnd!) : T
    const updates: ProjectUpdate[] = []
    let uid = 0
    for (let d = endDay; d >= Math.max(startDay, endDay - 24); d--) {
      if (!isWeekday(d) || def.pace === 0) continue
      if (d === T && !def.postedToday) continue
      if (!(d === endDay && completed) && rand() > def.diligence) continue
      const w = completed ? 1 : Math.min(1, def.pace * plannedFraction(phases, d))
      let acc = 0
      let k = 0
      for (let i = 0; i < phases.length; i++) {
        acc += (toDay(phases[i].plannedEnd) - toDay(phases[i].plannedStart)) / totalDur
        k = i
        if (w * 0.9999 < acc) break
      }
      updates.push({
        id: `${def.code}-U${++uid}`,
        date: fromDay(d),
        authorId: phases[k].ownerId,
        phaseId: phases[k].id,
        progress: Math.round(w * 100),
        note: pick(NOTES[k]),
        blocker: rand() < 0.12 && d > T - 10 ? pick(BLOCKERS) : undefined,
      })
    }

    // Vendor spend to date + approved budget.
    const peopleFull = team.reduce((s, m) => s + (m.allocation / 100) * (employees.find((e) => e.id === m.employeeId)!.ctcAnnual / 12) * (def.dur / 30.44), 0)
    const assetsFull = 5 * 30000 * (def.dur / 30.44 / 36)
    const vendorPlan = peopleFull * 0.14
    const budget = Math.round((peopleFull + assetsFull + vendorPlan) * def.budgetFactor / 50000) * 50000
    const vendorTotal = vendorPlan * Math.min(1, plannedFraction(phases, T)) * (completed ? 1 : 0.92)
    const nVend = def.pace === 0 ? 0 : between(2, 4)
    const vendors: VendorSpend[] = Array.from({ length: nVend }, (_, i) => {
      const [vendor, note] = VENDORS[(idx + i) % VENDORS.length]
      return { id: `${def.code}-V${i + 1}`, date: fromDay(startDay + Math.round(((i + 1) / (nVend + 1)) * Math.max(1, Math.min(T, baselineEnd) - startDay))), vendor, amount: Math.round(vendorTotal / nVend / 500) * 500, note }
    })

    // Funds are released one tranche per phase, as each phase starts.
    const tranches: Tranche[] = phases
      .map((p, k) => ({ id: `${def.code}-T${k + 1}`, date: fromDay(toDay(p.plannedStart) - (k === 0 ? 5 : 0)), amount: Math.round((budget * TRANCHE_SPLIT[k]) / 1000) * 1000, note: k === 0 ? 'Initial mobilisation' : `Release for ${p.name}` }))
      .filter((t) => toDay(t.date) <= T || completed)

    // Kit deployed on the project: shared equipment + the head's and lead's own laptops.
    const assetLinks: AssetLink[] = []
    for (const id of [head.id, lead.id]) {
      const laptop = assets.find((a) => a.assignedTo === id && a.category === 'Laptop')
      if (laptop) assetLinks.push({ assetId: laptop.id, since: fromDay(startDay) })
    }
    for (let i = 0; i < 5 && sharedPool.length; i++) {
      assetLinks.push({ assetId: sharedPool[sharedCursor++ % sharedPool.length].id, since: fromDay(startDay + between(0, 12)) })
    }

    const replans = (def.replans ?? []).map((r, i) => ({ id: `${def.code}-R${i + 1}`, date: fromDay(T - r.daysAgo), from: fromDay(baselineEnd), to: fromDay(baselineEnd + r.shift), reason: r.reason }))
    const plannedEnd = replans.length ? baselineEnd + def.replans![def.replans!.length - 1].shift : baselineEnd
    if (replans.length) {
      // Re-planned schedule: stretch the unfinished phases across the new window.
      const unfinished = phases.filter((p) => p.progress < 100)
      const win = plannedEnd - T
      const rem = unfinished.reduce((s, p) => s + (1 - p.progress / 100) * (toDay(p.plannedEnd) - toDay(p.plannedStart)), 0)
      let cur = T
      unfinished.forEach((p, i) => {
        const len = i === unfinished.length - 1 ? plannedEnd - cur : Math.max(1, Math.round((win * (1 - p.progress / 100) * (toDay(p.plannedEnd) - toDay(p.plannedStart))) / rem))
        if (p.progress === 0) p.plannedStart = fromDay(cur)
        p.plannedEnd = fromDay(cur + len)
        cur += len
      })
    }

    return {
      id: def.code,
      code: def.code,
      name: def.name,
      client: def.client,
      summary: def.summary,
      status: def.status ?? 'In Progress',
      headId: head.id,
      leadId: lead.id,
      fundingDept: def.dept,
      startDate: fromDay(startDay),
      baselineEnd: fromDay(baselineEnd),
      plannedEnd: fromDay(plannedEnd),
      actualEnd: completed ? phases[4].actualEnd : undefined,
      budget,
      tranches,
      vendors,
      team,
      assetLinks,
      phases,
      updates,
      replans,
    }
  })
}

export const projects: Project[] = seed()

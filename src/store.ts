import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { assets, candidates, employeeById, expenses, invoices, leaveRequests, payrollRuns, TODAY, type Asset, type AssetStatus, type Candidate, type Expense, type ExpenseStatus, type Invoice, type InvoiceStatus, type LeaveRequest, type LeaveStatus, type Stage } from './data/mock'
import type { RoleId } from './data/roles'
import { projects as seedProjects, type Project, type ProjectStatus } from './data/projects'
import { fromDay, todayDay, toDay } from './lib/dates'
import { overallProgress } from './lib/projectMetrics'

interface AuthState {
  role: RoleId | null
  showSplash: boolean
  login: (role: RoleId) => void
  logout: () => void
  clearSplash: () => void
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      role: null,
      showSplash: false,
      login: (role) => set({ role, showSplash: true }),
      logout: () => set({ role: null, showSplash: false }),
      clearSplash: () => set({ showSplash: false }),
    }),
    {
      name: 'worksuite-auth',
      // Don't persist splash flag — always start fresh
      partialize: (s) => ({ role: s.role }),
    },
  ),
)

export interface Toast { id: number; message: string; tone?: 'success' | 'info' | 'error' }

export interface AssetLogEntry { id: number; assetId: string; date: string; action: string; detail: string }

interface AppState {
  leaves: LeaveRequest[]
  expenses: Expense[]
  invoices: Invoice[]
  candidates: Candidate[]
  assets: Asset[]
  assetLog: AssetLogEntry[]
  projects: Project[]
  payrollStatus: 'Draft' | 'Processing' | 'Paid'
  toasts: Toast[]
  addProject: (p: Project) => void
  postProjectUpdate: (projectId: string, u: UpdateInput) => UpdateResult
  allotFunds: (projectId: string, amount: number, note: string) => void
  setProjectStatus: (projectId: string, status: ProjectStatus) => void
  replanProject: (projectId: string, newEnd: string, reason: string) => void
  addProjectMember: (projectId: string, employeeId: string, role: string, allocation: number) => void
  removeProjectMember: (projectId: string, employeeId: string) => void
  linkProjectAsset: (projectId: string, assetId: string) => void
  unlinkProjectAsset: (projectId: string, assetId: string) => void
  setLeaveStatus: (id: string, status: LeaveStatus) => void
  addLeave: (l: LeaveRequest) => void
  setExpenseStatus: (id: string, status: ExpenseStatus) => void
  addExpense: (e: Expense) => void
  setInvoiceStatus: (id: string, status: InvoiceStatus) => void
  addInvoice: (i: Invoice) => void
  moveCandidate: (id: string, stage: Stage) => void
  addAsset: (a: Asset) => void
  addAssets: (list: Asset[]) => void
  assignAsset: (id: string, employeeId: string) => void
  unassignAsset: (id: string) => void
  setAssetStatus: (id: string, status: AssetStatus) => void
  retireAsset: (id: string) => void
  updateAsset: (id: string, updates: Partial<Asset>) => void
  completeMaintenance: (id: string) => void
  runPayroll: () => void
  toast: (message: string, tone?: Toast['tone']) => void
  dismissToast: (id: number) => void
}

export interface UpdateInput { phaseId: string; progress: number; note: string; blocker?: string; authorId: string }
export interface UpdateResult { phaseCompleted: boolean; projectCompleted: boolean }

let toastId = 0
let assetLogId = 0
let projectSeq = 0
const nextId = (prefix: string) => `${prefix}-${Date.now().toString(36)}${++projectSeq}`
function logEntry(assetId: string, action: string, detail: string): AssetLogEntry {
  return { id: ++assetLogId, assetId, date: new Date().toISOString(), action, detail }
}

export const useApp = create<AppState>((set, get) => ({
  leaves: leaveRequests,
  expenses,
  invoices,
  candidates,
  assets,
  assetLog: [],
  projects: seedProjects,
  payrollStatus: payrollRuns[0].status as 'Draft',
  toasts: [],
  addProject: (p) => {
    set((s) => ({ projects: [p, ...s.projects] }))
    get().toast(`Project ${p.code} created`)
  },
  postProjectUpdate: (projectId, u) => {
    const proj = get().projects.find((p) => p.id === projectId)
    if (!proj) return { phaseCompleted: false, projectCompleted: false }
    const today = fromDay(todayDay())
    const prev = proj.phases.find((p) => p.id === u.phaseId)
    const phases = proj.phases.map((p) => {
      if (p.id !== u.phaseId) return p
      const progress = Math.min(100, Math.max(0, Math.round(u.progress)))
      return { ...p, progress, actualStart: p.actualStart ?? (progress > 0 ? today : undefined), actualEnd: progress >= 100 ? today : undefined }
    })
    const phaseCompleted = !!prev && prev.progress < 100 && phases.find((p) => p.id === u.phaseId)!.progress >= 100
    const projectCompleted = phases.every((p) => p.progress >= 100)
    const entry = { id: nextId('U'), date: today, authorId: u.authorId, phaseId: u.phaseId, progress: Math.round(overallProgress(phases)), note: u.note, blocker: u.blocker || undefined }
    set((s) => ({
      projects: s.projects.map((p) =>
        p.id !== projectId ? p : {
          ...p,
          phases,
          updates: [entry, ...p.updates],
          status: projectCompleted ? 'Completed' : p.status === 'Initiated' ? 'In Progress' : p.status,
          actualEnd: projectCompleted ? today : p.actualEnd,
        }),
    }))
    get().toast(projectCompleted ? `${proj.name} delivered` : phaseCompleted ? `Phase complete — ${prev!.name}` : `Update posted to ${proj.code}`)
    return { phaseCompleted, projectCompleted }
  },
  allotFunds: (projectId, amount, note) => {
    set((s) => ({ projects: s.projects.map((p) => (p.id === projectId ? { ...p, tranches: [...p.tranches, { id: nextId('T'), date: fromDay(todayDay()), amount, note }] } : p)) }))
    get().toast('Funds released to the project')
  },
  setProjectStatus: (projectId, status) => {
    set((s) => ({ projects: s.projects.map((p) => (p.id === projectId ? { ...p, status } : p)) }))
    get().toast(`Project marked ${status.toLowerCase()}`, status === 'On Hold' ? 'info' : 'success')
  },
  replanProject: (projectId, newEnd, reason) => {
    const proj = get().projects.find((p) => p.id === projectId)
    if (!proj) return
    const today = todayDay()
    const end = toDay(newEnd)
    // Spread the unfinished work across [today, newEnd] in proportion to the work left in each phase.
    const open = proj.phases.filter((p) => p.progress < 100)
    const weight = (p: (typeof open)[number]) => (1 - p.progress / 100) * Math.max(1, toDay(p.plannedEnd) - toDay(p.plannedStart))
    const total = open.reduce((s, p) => s + weight(p), 0) || 1
    const window = Math.max(open.length, end - today)
    let cursor = today
    const replanned = new Map<string, { plannedStart: string; plannedEnd: string }>()
    open.forEach((p, i) => {
      const len = i === open.length - 1 ? Math.max(1, end - cursor) : Math.max(1, Math.round((window * weight(p)) / total))
      replanned.set(p.id, { plannedStart: p.progress > 0 ? p.plannedStart : fromDay(cursor), plannedEnd: fromDay(cursor + len) })
      cursor += len
    })
    set((s) => ({
      projects: s.projects.map((p) =>
        p.id !== projectId ? p : {
          ...p,
          plannedEnd: newEnd,
          phases: p.phases.map((ph) => ({ ...ph, ...(replanned.get(ph.id) ?? {}) })),
          replans: [...p.replans, { id: nextId('R'), date: fromDay(today), from: p.plannedEnd, to: newEnd, reason }],
        }),
    }))
    get().toast('Schedule re-planned — new end date approved', 'info')
  },
  addProjectMember: (projectId, employeeId, role, allocation) => {
    const since = fromDay(todayDay())
    set((s) => ({ projects: s.projects.map((p) => (p.id === projectId && !p.team.some((m) => m.employeeId === employeeId && !m.until) ? { ...p, team: [...p.team, { employeeId, role, allocation, since }] } : p)) }))
    get().toast(`${employeeById(employeeId)?.name ?? 'Team member'} added to the project`)
  },
  removeProjectMember: (projectId, employeeId) => {
    const until = fromDay(todayDay())
    set((s) => ({ projects: s.projects.map((p) => (p.id === projectId ? { ...p, team: p.team.map((m) => (m.employeeId === employeeId && !m.until ? { ...m, until } : m)) } : p)) }))
    get().toast(`${employeeById(employeeId)?.name ?? 'Team member'} released from the project`, 'info')
  },
  linkProjectAsset: (projectId, assetId) => {
    const since = fromDay(todayDay())
    set((s) => ({ projects: s.projects.map((p) => (p.id === projectId && !p.assetLinks.some((l) => l.assetId === assetId && !l.until) ? { ...p, assetLinks: [...p.assetLinks, { assetId, since }] } : p)) }))
    get().toast(`Asset ${assetId} deployed to the project`)
  },
  unlinkProjectAsset: (projectId, assetId) => {
    const until = fromDay(todayDay())
    set((s) => ({ projects: s.projects.map((p) => (p.id === projectId ? { ...p, assetLinks: p.assetLinks.map((l) => (l.assetId === assetId && !l.until ? { ...l, until } : l)) } : p)) }))
    get().toast(`Asset ${assetId} released from the project`, 'info')
  },
  setLeaveStatus: (id, status) => {
    set((s) => ({ leaves: s.leaves.map((l) => (l.id === id ? { ...l, status } : l)) }))
    get().toast(`Leave ${id} ${status.toLowerCase()}`, status === 'Rejected' ? 'error' : 'success')
  },
  addLeave: (l) => {
    set((s) => ({ leaves: [l, ...s.leaves] }))
    get().toast('Leave request submitted')
  },
  setExpenseStatus: (id, status) => {
    set((s) => ({ expenses: s.expenses.map((e) => (e.id === id ? { ...e, status } : e)) }))
    get().toast(`Expense ${id} marked ${status.toLowerCase()}`, status === 'Rejected' ? 'error' : 'success')
  },
  addExpense: (e) => {
    set((s) => ({ expenses: [e, ...s.expenses] }))
    get().toast('Expense claim submitted')
  },
  setInvoiceStatus: (id, status) => {
    set((s) => ({ invoices: s.invoices.map((i) => (i.id === id ? { ...i, status } : i)) }))
    get().toast(`${id} marked as ${status.toLowerCase()}`)
  },
  addInvoice: (i) => {
    set((s) => ({ invoices: [i, ...s.invoices] }))
    get().toast(`Invoice ${i.id} created`)
  },
  moveCandidate: (id, stage) => set((s) => ({ candidates: s.candidates.map((c) => (c.id === id ? { ...c, stage } : c)) })),
  addAsset: (a) => {
    set((s) => ({ assets: [a, ...s.assets], assetLog: [logEntry(a.id, 'Added', 'Added to inventory'), ...s.assetLog] }))
    get().toast(`Asset ${a.id} added to inventory`)
  },
  addAssets: (list) => {
    if (list.length === 0) return
    set((s) => ({
      assets: [...list, ...s.assets],
      assetLog: [...list.map((a) => logEntry(a.id, 'Added', 'Imported via bulk upload')), ...s.assetLog],
    }))
    get().toast(`${list.length} assets imported`)
  },
  assignAsset: (id, employeeId) => {
    const holder = employeeById(employeeId)
    set((s) => ({
      assets: s.assets.map((a) => (a.id === id ? { ...a, status: 'Assigned', assignedTo: employeeId, assignedOn: TODAY.toISOString().slice(0, 10) } : a)),
      assetLog: [logEntry(id, 'Assigned', holder ? `Assigned to ${holder.name}` : 'Assigned'), ...s.assetLog],
    }))
    get().toast(`Asset ${id} assigned`)
  },
  unassignAsset: (id) => {
    const prevHolder = get().assets.find((a) => a.id === id)?.assignedTo
    const holder = prevHolder ? employeeById(prevHolder) : undefined
    set((s) => ({
      assets: s.assets.map((a) => (a.id === id ? { ...a, status: 'Available', assignedTo: undefined, assignedOn: undefined, returnDue: undefined } : a)),
      assetLog: [logEntry(id, 'Returned', holder ? `Returned by ${holder.name}` : 'Unassigned'), ...s.assetLog],
    }))
    get().toast(`Asset ${id} unassigned`)
  },
  setAssetStatus: (id, status) => {
    set((s) => ({
      assets: s.assets.map((a) => (a.id === id ? { ...a, status } : a)),
      assetLog: [logEntry(id, 'Status change', `Marked ${status}`), ...s.assetLog],
    }))
    get().toast(`Asset ${id} marked ${status.toLowerCase()}`)
  },
  retireAsset: (id) => {
    set((s) => ({
      assets: s.assets.map((a) => (a.id === id ? { ...a, status: 'Retired', assignedTo: undefined, assignedOn: undefined, returnDue: undefined } : a)),
      assetLog: [logEntry(id, 'Retired', 'Asset retired'), ...s.assetLog],
    }))
    get().toast(`Asset ${id} retired`, 'info')
  },
  updateAsset: (id, updates) => {
    set((s) => ({
      assets: s.assets.map((a) => (a.id === id ? { ...a, ...updates } : a)),
      assetLog: [logEntry(id, 'Updated', 'Asset details updated'), ...s.assetLog],
    }))
    get().toast(`Asset ${id} updated`)
  },
  completeMaintenance: (id) => {
    const asset = get().assets.find((a) => a.id === id)
    if (!asset) return
    const now = new Date(TODAY)
    const freq = asset.maintenanceFrequency
    let next: string | undefined
    if (freq) {
      const d = new Date(now)
      if (freq === 'Monthly') d.setMonth(d.getMonth() + 1)
      else if (freq === 'Quarterly') d.setMonth(d.getMonth() + 3)
      else if (freq === 'Bi-Annually') d.setMonth(d.getMonth() + 6)
      else if (freq === 'Yearly') d.setFullYear(d.getFullYear() + 1)
      next = d.toISOString().slice(0, 10)
    }
    set((s) => ({
      assets: s.assets.map((a) => (a.id === id ? { ...a, lastMaintenanceDate: TODAY.toISOString().slice(0, 10), nextMaintenanceDate: next } : a)),
      assetLog: [logEntry(id, 'Maintenance', 'Preventive maintenance completed'), ...s.assetLog],
    }))
    get().toast(`Maintenance completed for asset ${id}`)
  },
  runPayroll: () => {

    set({ payrollStatus: 'Processing' })
    get().toast('Payroll run started — processing salaries', 'info')
    setTimeout(() => {
      set({ payrollStatus: 'Paid' })
      get().toast('Payroll disbursed to all employees')
    }, 2200)
  },
  toast: (message, tone = 'success') => {
    const id = ++toastId
    set((s) => ({ toasts: [...s.toasts, { id, message, tone }] }))
    setTimeout(() => get().dismissToast(id), 3200)
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

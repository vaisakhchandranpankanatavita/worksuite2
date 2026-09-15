import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { assets, candidates, expenses, invoices, leaveRequests, payrollRuns, TODAY, type Asset, type AssetStatus, type Candidate, type Expense, type ExpenseStatus, type Invoice, type InvoiceStatus, type LeaveRequest, type LeaveStatus, type Stage } from './data/mock'
import type { RoleId } from './data/roles'

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

interface AppState {
  leaves: LeaveRequest[]
  expenses: Expense[]
  invoices: Invoice[]
  candidates: Candidate[]
  assets: Asset[]
  payrollStatus: 'Draft' | 'Processing' | 'Paid'
  toasts: Toast[]
  setLeaveStatus: (id: string, status: LeaveStatus) => void
  addLeave: (l: LeaveRequest) => void
  setExpenseStatus: (id: string, status: ExpenseStatus) => void
  addExpense: (e: Expense) => void
  setInvoiceStatus: (id: string, status: InvoiceStatus) => void
  addInvoice: (i: Invoice) => void
  moveCandidate: (id: string, stage: Stage) => void
  addAsset: (a: Asset) => void
  assignAsset: (id: string, employeeId: string) => void
  unassignAsset: (id: string) => void
  setAssetStatus: (id: string, status: AssetStatus) => void
  retireAsset: (id: string) => void
  runPayroll: () => void
  toast: (message: string, tone?: Toast['tone']) => void
  dismissToast: (id: number) => void
}

let toastId = 0

export const useApp = create<AppState>((set, get) => ({
  leaves: leaveRequests,
  expenses,
  invoices,
  candidates,
  assets,
  payrollStatus: payrollRuns[0].status as 'Draft',
  toasts: [],
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
    set((s) => ({ assets: [a, ...s.assets] }))
    get().toast(`Asset ${a.id} added to inventory`)
  },
  assignAsset: (id, employeeId) => {
    set((s) => ({
      assets: s.assets.map((a) => (a.id === id ? { ...a, status: 'Assigned', assignedTo: employeeId, assignedOn: TODAY.toISOString().slice(0, 10) } : a)),
    }))
    get().toast(`Asset ${id} assigned`)
  },
  unassignAsset: (id) => {
    set((s) => ({
      assets: s.assets.map((a) => (a.id === id ? { ...a, status: 'Available', assignedTo: undefined, assignedOn: undefined } : a)),
    }))
    get().toast(`Asset ${id} unassigned`)
  },
  setAssetStatus: (id, status) => {
    set((s) => ({ assets: s.assets.map((a) => (a.id === id ? { ...a, status } : a)) }))
    get().toast(`Asset ${id} marked ${status.toLowerCase()}`)
  },
  retireAsset: (id) => {
    set((s) => ({ assets: s.assets.map((a) => (a.id === id ? { ...a, status: 'Retired', assignedTo: undefined, assignedOn: undefined } : a)) }))
    get().toast(`Asset ${id} retired`, 'info')
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

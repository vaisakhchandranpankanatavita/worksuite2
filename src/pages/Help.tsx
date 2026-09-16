import {
  ArrowRight, Boxes, CalendarCheck, FileText, Home, IndianRupee, Laptop,
  LineChart, ListChecks, PiggyBank, Receipt, UserPlus, Users, Wallet, Search, Sparkles,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card, CardHeader, PageHeader } from '../components/ui'
import { roleById, type ModuleKey } from '../data/roles'
import { useAuth } from '../store'

type PageInfo = { to: string; label: string; icon: typeof Home; desc: string }

const MODULE_PAGES: Record<ModuleKey, PageInfo[]> = {
  hr: [
    { to: '/hr', label: 'Dashboard', icon: Home, desc: 'Headcount, attendance and payroll at a glance' },
    { to: '/hr/employees', label: 'Employees', icon: Users, desc: 'Directory and individual employee profiles' },
    { to: '/hr/attendance', label: 'Attendance', icon: CalendarCheck, desc: 'Daily check-in / check-out tracking' },
    { to: '/hr/leave', label: 'Leave', icon: PiggyBank, desc: 'Leave requests, balances and approvals' },
    { to: '/hr/recruitment', label: 'Recruitment', icon: UserPlus, desc: 'Open roles and candidate pipeline' },
    { to: '/hr/payroll', label: 'Payroll', icon: Wallet, desc: 'Monthly salary runs and payslips' },
  ],
  finance: [
    { to: '/finance', label: 'Dashboard', icon: Home, desc: 'Revenue, expenses and cash overview' },
    { to: '/finance/invoices', label: 'Invoices', icon: FileText, desc: 'Client billing and payment status' },
    { to: '/finance/expenses', label: 'Expense Claims', icon: Receipt, desc: 'Employee reimbursement claims, submitted → approved → reimbursed' },
    { to: '/finance/track-expenses', label: 'Track Expenses', icon: ListChecks, desc: 'Company overhead bills by category, month on month' },
    { to: '/finance/budgets', label: 'Budgets', icon: IndianRupee, desc: 'Department budgets vs actual spend' },
    { to: '/finance/reports', label: 'Reports', icon: LineChart, desc: 'Financial trends and exportable reports' },
  ],
  assets: [
    { to: '/assets', label: 'Dashboard', icon: Home, desc: 'Asset health and utilization overview' },
    { to: '/assets/inventory', label: 'Inventory', icon: ListChecks, desc: 'Asset register, assignment and detail' },
    { to: '/assets/stock', label: 'Stock', icon: Boxes, desc: 'Consumable stock levels' },
  ],
}

const MODULE_LABEL: Record<ModuleKey, string> = { hr: 'People', finance: 'Finance', assets: 'Assets' }
const MODULE_ICON: Record<ModuleKey, typeof Home> = { hr: Users, finance: Wallet, assets: Laptop }
const MODULE_TONE: Record<ModuleKey, string> = { hr: 'bg-sky/40 text-sky-deep', finance: 'bg-lime/40 text-lime-deep', assets: 'bg-sage/40 text-sage-deep' }
const MODULE_DESC: Record<ModuleKey, string> = {
  hr: 'Manage people — from hiring through attendance, leave and payroll.',
  finance: 'Track money — invoices coming in, claims and overheads going out, budgets and reports.',
  assets: 'Track equipment — what the company owns, who holds it, and stock on hand.',
}

export default function Help() {
  const roleId = useAuth((s) => s.role)
  const role = roleById(roleId)
  const modules = role?.modules ?? (['hr', 'finance', 'assets'] as ModuleKey[])

  return (
    <div>
      <PageHeader title="Help & Overview" subtitle="A map of Worksuite — what each part does and how they connect" />

      <Card className="mb-4">
        <p className="text-sm leading-relaxed text-ink/80">
          Worksuite is an internal operations app organised into three modules — <strong>People</strong>, <strong>Finance</strong> and{' '}
          <strong>Assets</strong>. Each module has its own dashboard plus a handful of focused pages. Use the module switcher and nav pills
          in the header to move around, <kbd className="rounded border border-line bg-soft px-1 py-px text-[10px] font-bold">⌘K</kbd> to
          search anything by name, and the assistant in the bottom-right corner for quick answers or jumping straight to a page.
        </p>
      </Card>

      {/* ── Flow diagram ─────────────────────────────────────────── */}
      <Card className="mb-4">
        <CardHeader title="How it flows" subtitle="The shape of the app, end to end" />
        <div className="mt-5 flex flex-col items-center gap-3">
          <div className="flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-xs font-bold uppercase tracking-wider text-white">
            <Sparkles size={13} /> Worksuite
          </div>
          <ArrowRight size={16} className="rotate-90 text-ash" />

          <div className="grid w-full gap-3 md:grid-cols-3">
            {(['hr', 'finance', 'assets'] as ModuleKey[]).map((m) => {
              const Icon = MODULE_ICON[m]
              return (
                <div key={m} className="rounded-2xl border border-line bg-soft/60 p-3.5">
                  <div className={`mb-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${MODULE_TONE[m]}`}>
                    <Icon size={12} /> {MODULE_LABEL[m]}
                  </div>
                  <p className="text-xs text-ash">{MODULE_DESC[m]}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {MODULE_PAGES[m].map((p) => (
                      <span key={p.to} className="rounded-full border border-line bg-white px-2 py-0.5 text-[10px] text-ink/70">{p.label}</span>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-1 grid w-full gap-2 text-xs text-ash sm:grid-cols-3">
            <p className="flex items-center gap-1.5"><Wallet size={13} className="shrink-0 text-lime-deep" /> Payroll (People) feeds cash-out in Finance Reports</p>
            <p className="flex items-center gap-1.5"><Receipt size={13} className="shrink-0 text-lime-deep" /> Expense Claims &amp; Track Expenses roll up into Budgets</p>
            <p className="flex items-center gap-1.5"><Boxes size={13} className="shrink-0 text-lime-deep" /> Assets purchases show up as spend in Finance</p>
          </div>
        </div>
      </Card>

      {/* ── Per-module breakdown ─────────────────────────────────── */}
      <div className="grid gap-4">
        {modules.map((m) => {
          const ModIcon = MODULE_ICON[m]
          return (
            <Card key={m}>
              <CardHeader
                title={<span className="flex items-center gap-2"><ModIcon size={15} /> {MODULE_LABEL[m]}</span>}
                subtitle={MODULE_DESC[m]}
              />
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {MODULE_PAGES[m].map((p) => {
                  const PIcon = p.icon
                  return (
                    <Link key={p.to} to={p.to} className="group flex items-start gap-3 rounded-xl border border-line/70 p-3 transition-colors hover:border-ink/20 hover:bg-soft">
                      <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-soft text-ink/70 group-hover:bg-ink group-hover:text-white">
                        <PIcon size={14} />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold">{p.label}</span>
                        <span className="block text-xs text-ash">{p.desc}</span>
                      </span>
                    </Link>
                  )
                })}
              </div>
            </Card>
          )
        })}
      </div>

      <Card className="mt-4">
        <CardHeader title="Handy shortcuts" />
        <div className="mt-2 grid gap-2 text-xs text-ash sm:grid-cols-3">
          <p className="flex items-center gap-1.5"><Search size={13} /> <kbd className="rounded border border-line bg-soft px-1 py-px text-[10px] font-bold">⌘K</kbd> — search employees, invoices &amp; assets</p>
          <p className="flex items-center gap-1.5"><Sparkles size={13} /> Bottom-right bubble — the in-app assistant</p>
          <p className="flex items-center gap-1.5"><Home size={13} /> Module switcher (top-left) — jump between People / Finance / Assets</p>
        </div>
      </Card>
    </div>
  )
}

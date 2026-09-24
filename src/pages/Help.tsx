import clsx from 'clsx'
import {
  Boxes, CalendarCheck, CalendarRange, FileText, FolderKanban, Home, IndianRupee, Laptop, LayoutGrid,
  LineChart, ListChecks, PiggyBank, Receipt, UserPlus, Users, Wallet, Search, Sparkles,
} from 'lucide-react'
import { motion } from 'motion/react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardHeader, PageHeader } from '../components/ui'
import type { ModuleKey } from '../data/roles'
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
  projects: [
    { to: '/projects', label: 'Mission Control', icon: Home, desc: 'Portfolio health, the race to the finish line, today’s pulse and the league table' },
    { to: '/projects/portfolio', label: 'Portfolio', icon: LayoutGrid, desc: 'Every project with its budget, allotment, usage and projected finish' },
    { to: '/projects/timeline', label: 'Timeline', icon: CalendarRange, desc: 'Waterfall chart of all projects — plan, progress and projected slips' },
  ],
}

const MODULE_LABEL: Record<ModuleKey, string> = { hr: 'People', finance: 'Finance', assets: 'Assets', projects: 'Projects' }
const MODULE_ICON: Record<ModuleKey, typeof Home> = { hr: Users, finance: Wallet, assets: Laptop, projects: FolderKanban }
const MODULE_TONE: Record<ModuleKey, string> = { hr: 'bg-sky/40 text-sky-deep', finance: 'bg-lime/40 text-lime-deep', assets: 'bg-sage/40 text-sage-deep', projects: 'bg-amber/60 text-amber-deep' }
const MODULE_DESC: Record<ModuleKey, string> = {
  hr: 'Manage people — from hiring through attendance, leave and payroll.',
  finance: 'Track money — invoices coming in, claims and overheads going out, budgets and reports.',
  assets: 'Track equipment — what the company owns, who holds it, and stock on hand.',
  projects: 'Deliver work — see how people, assets and money are used on each project, and when it will really finish.',
}

const ALL_PAGES: Record<string, PageInfo> = Object.fromEntries(
  (Object.values(MODULE_PAGES) as PageInfo[][]).flat().map((p) => [p.to, p]),
)

// Places money or data crosses from one module's page into another's.
const FLOWS: { from: string; to: string; label: string }[] = [
  { from: '/hr/payroll', to: '/finance/reports', label: 'feeds cash-out' },
  { from: '/finance/expenses', to: '/finance/budgets', label: 'rolls up into' },
  { from: '/finance/track-expenses', to: '/finance/budgets', label: 'rolls up into' },
  { from: '/assets/inventory', to: '/finance/reports', label: 'shows as spend' },
  { from: '/hr/employees', to: '/projects/portfolio', label: 'staff the projects' },
  { from: '/assets/inventory', to: '/projects/portfolio', label: 'is deployed on' },
  { from: '/finance/budgets', to: '/projects/portfolio', label: 'funds' },
  { from: '/finance/expenses', to: '/projects/portfolio', label: 'is charged to' },
]

function relatedSet(key: string): Set<string> {
  const set = new Set([key])
  FLOWS.forEach((f) => { if (f.from === key) set.add(f.to); if (f.to === key) set.add(f.from) })
  return set
}

/** Whether `key` (a page path, or `mod:<id>`) should stay highlighted while `active` is selected. */
function isRelated(key: string, active: string): boolean {
  if (key === active) return true
  if (active.startsWith('mod:')) {
    if (key.startsWith('mod:')) return false
    return MODULE_PAGES[active.slice(4) as ModuleKey].some((p) => p.to === key)
  }
  if (key.startsWith('mod:')) {
    const rel = relatedSet(active)
    return MODULE_PAGES[key.slice(4) as ModuleKey].some((p) => rel.has(p.to))
  }
  return relatedSet(active).has(key)
}

export default function Help() {
  const modules = useAuth((s) => s.user)?.modules ?? (['hr', 'finance', 'assets', 'projects'] as ModuleKey[])
  const [active, setActive] = useState<string | null>(null)

  return (
    <div>
      <PageHeader title="Help & Overview" subtitle="A map of Worksuite — what each part does and how they connect" />

      <Card className="mb-4">
        <p className="text-base leading-relaxed text-ink/80">
          Worksuite is organised into four modules — <strong>People</strong>, <strong>Finance</strong>, <strong>Assets</strong> and <strong>Projects</strong>.
          Each has its own dashboard plus a few focused pages. Use the module switcher in the header to move around,{' '}
          <kbd className="rounded border border-line bg-soft px-1.5 py-0.5 text-xs font-bold">⌘K</kbd> to search anything by name,
          and the assistant in the bottom-right corner for quick answers.
        </p>
      </Card>

      {/* ── Flow diagram ─────────────────────────────────────────── */}
      <Card className="mb-4">
        <CardHeader title="How it flows" subtitle="Every page, grouped by module — click one to trace how it connects" />
        <div className="mt-5 flex flex-col items-center gap-4">
          <div className="grid w-full gap-4 md:grid-cols-2 xl:grid-cols-4">
            {(['hr', 'finance', 'assets', 'projects'] as ModuleKey[]).map((m) => {
              const Icon = MODULE_ICON[m]
              const modKey = `mod:${m}`
              const modDim = active !== null && !isRelated(modKey, active)
              return (
                <div key={m} className={clsx('rounded-2xl border p-4 transition-opacity duration-200', active === modKey ? 'border-ink' : 'border-line', modDim && 'opacity-40')}>
                  <button
                    type="button"
                    onClick={() => setActive(active === modKey ? null : modKey)}
                    className={clsx('mb-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-colors', MODULE_TONE[m])}
                  >
                    <Icon size={14} /> {MODULE_LABEL[m]}
                  </button>
                  <p className="mb-3 text-sm text-ash">{MODULE_DESC[m]}</p>
                  <div className="flex flex-col gap-2">
                    {MODULE_PAGES[m].map((p, i) => {
                      const isActive = active === p.to
                      const dim = active !== null && !isRelated(p.to, active)
                      const rel = isActive ? FLOWS.filter((f) => f.from === p.to || f.to === p.to) : []
                      return (
                        <motion.button
                          key={p.to}
                          type="button"
                          initial={{ opacity: 0, y: 6 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: i * 0.03, duration: 0.3 }}
                          onClick={() => setActive(isActive ? null : p.to)}
                          className={clsx(
                            'flex items-start gap-3 rounded-xl border p-3 text-left transition-all duration-200',
                            isActive ? 'border-ink bg-soft' : 'border-line/70 bg-white hover:border-ink/25',
                            dim && 'opacity-40',
                          )}
                        >
                          <span className={clsx('mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg', MODULE_TONE[m])}>
                            <p.icon size={15} />
                          </span>
                          <span className="min-w-0">
                            <span className="block text-sm font-semibold">{p.label}</span>
                            <span className="block text-xs leading-snug text-ash">{p.desc}</span>
                            {rel.length > 0 && (
                              <span className="mt-1.5 flex flex-col gap-1 text-xs font-semibold text-lime-deep">
                                {rel.map((f) => {
                                  const outgoing = f.from === p.to
                                  const target = ALL_PAGES[outgoing ? f.to : f.from]
                                  return (
                                    <span key={f.from + f.to}>{outgoing ? '→' : '←'} {target?.label} · {f.label}</span>
                                  )
                                })}
                              </span>
                            )}
                          </span>
                        </motion.button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
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
                title={<span className="flex items-center gap-2 text-base"><ModIcon size={17} /> {MODULE_LABEL[m]}</span>}
                subtitle={MODULE_DESC[m]}
              />
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {MODULE_PAGES[m].map((p) => {
                  const PIcon = p.icon
                  return (
                    <Link key={p.to} to={p.to} className="group flex items-start gap-3 rounded-xl border border-line/70 p-3.5 transition-colors hover:border-ink/20 hover:bg-soft">
                      <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-soft text-ink/70 group-hover:bg-ink group-hover:text-white">
                        <PIcon size={16} />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-base font-semibold">{p.label}</span>
                        <span className="block text-sm text-ash">{p.desc}</span>
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
        <div className="mt-3 grid gap-3 text-sm text-ash sm:grid-cols-3">
          <p className="flex items-center gap-2"><Search size={15} /> <kbd className="rounded border border-line bg-soft px-1.5 py-0.5 text-xs font-bold">⌘K</kbd> — search employees, invoices &amp; assets</p>
          <p className="flex items-center gap-2"><Sparkles size={15} /> Bottom-right bubble — the in-app assistant</p>
          <p className="flex items-center gap-2"><Home size={15} /> Module switcher (top-left) — jump between People / Finance / Assets</p>
        </div>
      </Card>
    </div>
  )
}

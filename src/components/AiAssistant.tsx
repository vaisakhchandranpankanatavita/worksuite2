import clsx from 'clsx'
import {
  ArrowRight, ArrowUp, BarChart3, Bot, Boxes, CalendarCheck, CheckCircle2,
  ChevronDown, FileText, FolderKanban, Maximize2, Mic, MicOff, Minimize2, Sparkles, TrendingUp,
  Users, Volume2, VolumeX, Wallet, Wrench, X, Zap,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { employees, invoices as mockInvoices, jobs, monthlyFinance, todayAttendance } from '../data/mock'
import type { ModuleKey } from '../data/roles'
import { toDay, todayDay } from '../lib/dates'
import { fmtCompact, fmtINR } from '../lib/format'
import { useApp, useAuth } from '../store'

/* ─── Types ─────────────────────────────────────────────────── */
type WidgetKind = 'stat-row' | 'action-list' | 'mini-chart' | 'confirm'
type Widget = {
  kind: WidgetKind
  stats?: { label: string; value: string; tone?: 'lime' | 'sky' | 'rose' | 'amber' | 'sage' }[]
  actions?: { label: string; icon: typeof CheckCircle2; cmd: string }[]
  chart?: { label: string; value: number }[]
  confirmLabel?: string
  confirmCmd?: string
}
type Msg = {
  id: number
  role: 'user' | 'ai'
  text: string
  pending?: boolean
  widget?: Widget
}

/* ─── Routes ────────────────────────────────────────────────── */
const ROUTES = [
  { keys: ['employee', 'people', 'staff', 'team'], to: '/hr/employees', label: 'Employees' },
  { keys: ['attendance', 'present', 'clock'], to: '/hr/attendance', label: 'Attendance' },
  { keys: ['leave', 'time off', 'vacation'], to: '/hr/leave', label: 'Leave' },
  { keys: ['recruit', 'hiring', 'candidate', 'pipeline'], to: '/hr/recruitment', label: 'Recruitment' },
  { keys: ['payroll', 'salary', 'salaries'], to: '/hr/payroll', label: 'Payroll' },
  { keys: ['invoice', 'billing'], to: '/finance/invoices', label: 'Invoices' },
  { keys: ['expense', 'reimburse'], to: '/finance/expenses', label: 'Expense Claims' },
  { keys: ['budget'], to: '/finance/budgets', label: 'Budgets' },
  { keys: ['report', 'analytics'], to: '/finance/reports', label: 'Reports' },
  { keys: ['hr dashboard', 'home', 'overview', 'hr'], to: '/hr', label: 'HR Dashboard' },
  { keys: ['finance dashboard', 'finance home'], to: '/finance', label: 'Finance Dashboard' },
  { keys: ['asset', 'inventory', 'laptop', 'device'], to: '/assets/inventory', label: 'Asset Inventory' },
  { keys: ['stock'], to: '/assets/stock', label: 'Stock' },
  { keys: ['project', 'portfolio'], to: '/projects/portfolio', label: 'Project Portfolio' },
  { keys: ['timeline', 'gantt'], to: '/projects/timeline', label: 'Project Timeline' },
]
const moduleOf = (path: string) => path.split('/')[1] as ModuleKey

const MODULE_LABEL: Record<ModuleKey, string> = { hr: 'People (HR)', finance: 'Finance', assets: 'Assets', projects: 'Projects' }

/* ─── Quick action chips ────────────────────────────────────── */
const QUICK: { label: string; icon: typeof Users; cmd: string; module: ModuleKey }[] = [
  { label: 'Headcount', icon: Users, cmd: 'How many employees do we have?', module: 'hr' },
  { label: 'Attendance', icon: CalendarCheck, cmd: 'Attendance today', module: 'hr' },
  { label: 'Financials', icon: BarChart3, cmd: 'Show me the financials', module: 'finance' },
  { label: 'Run payroll', icon: Wallet, cmd: 'Run payroll', module: 'hr' },
  { label: 'Approve leaves', icon: CheckCircle2, cmd: 'Approve all pending leaves', module: 'hr' },
  { label: 'Open invoices', icon: FileText, cmd: 'Show overdue invoices', module: 'finance' },
  { label: 'Asset status', icon: Boxes, cmd: 'Asset status', module: 'assets' },
  { label: 'Maintenance due', icon: Wrench, cmd: 'Which assets are due for maintenance?', module: 'assets' },
  { label: 'Project status', icon: FolderKanban, cmd: 'Project status', module: 'projects' },
]

/* ─── Intent engine ─────────────────────────────────────────── */
type CommandResult = { text: string; widget?: Widget }
type Ctx = { api: ReturnType<typeof useApp.getState>; nav: (to: string) => void; can: (m: ModuleKey) => boolean }
type Intent = {
  /** Module this intent needs — checked once against `can` before `test` even runs. */
  module: ModuleKey | null
  /** Single compiled test; each intent's pattern is defined exactly once. */
  test: (q: string) => boolean
  handle: (q: string, ctx: Ctx) => CommandResult
}

/**
 * Ordered, single-source-of-truth intent table. Each entry owns its own regex —
 * no separate "which module does this need" pass, so a query is matched in one
 * left-to-right scan instead of being tested twice (module lookup + handler dispatch).
 */
const INTENTS: Intent[] = [
  {
    module: 'hr',
    test: (q) => /(approve|accept|clear).*(leave|request)/.test(q) || /approve all/.test(q),
    handle: (_q, { api, nav }) => {
      const pending = api.leaves.filter((l) => l.status === 'Pending')
      if (pending.length === 0) return { text: 'All caught up — no pending leave requests right now. 🎉' }
      pending.forEach((l) => api.setLeaveStatus(l.id, 'Approved'))
      nav('/hr/leave')
      return {
        text: `Done! I approved all ${pending.length} pending leave request${pending.length > 1 ? 's' : ''}.`,
        widget: {
          kind: 'stat-row',
          stats: [
            { label: 'Approved', value: String(pending.length), tone: 'lime' },
            { label: 'Pending now', value: '0', tone: 'sage' },
          ],
        },
      }
    },
  },
  {
    module: 'hr',
    test: (q) => /(decline|reject|deny).*(leave|request)/.test(q),
    handle: (_q, { api, nav }) => {
      const pending = api.leaves.filter((l) => l.status === 'Pending')
      if (pending.length === 0) return { text: 'No pending leave requests to decline.' }
      pending.forEach((l) => api.setLeaveStatus(l.id, 'Rejected'))
      nav('/hr/leave')
      return { text: `Declined ${pending.length} pending request${pending.length > 1 ? 's' : ''}. You can reverse any on the Leave page.` }
    },
  },
  {
    module: 'hr',
    test: (q) => /(run|start|process|disburse).*payroll/.test(q) || q === 'run payroll',
    handle: (_q, { api, nav }) => {
      api.runPayroll()
      nav('/hr/payroll')
      return {
        text: 'Payroll run started — processing all salaries now. I\'ll notify you once disbursement is complete.',
        widget: {
          kind: 'stat-row',
          stats: [
            { label: 'Employees', value: String(employees.length), tone: 'sky' },
            { label: 'Total payout', value: fmtCompact(employees.reduce((s, e) => s + Math.round(e.ctcAnnual / 12), 0)), tone: 'lime' },
            { label: 'Status', value: 'Processing', tone: 'amber' },
          ],
        },
      }
    },
  },
  {
    module: 'finance',
    test: (q) => /inv[-\s]?(\d+)/.test(q) && /paid|settle|clear/.test(q),
    handle: (q, { api, nav }) => {
      const inv = q.match(/inv[-\s]?(\d+)/)!
      const id = `INV-${inv[1].padStart(4, '0')}`
      const found = api.invoices.find((i) => i.id.toLowerCase() === id.toLowerCase())
      if (found) {
        api.setInvoiceStatus(found.id, 'Paid')
        nav('/finance/invoices')
        return { text: `Marked ${found.id} (${found.client.name}) as paid. ✓` }
      }
      return { text: `Couldn't find invoice "${inv[0]}". Check the exact ID on the Invoices page.` }
    },
  },
  {
    module: 'hr',
    test: (q) => /(add|create|onboard|new).*(employee|person|staff|hire)/.test(q),
    handle: (_q, { nav }) => {
      nav('/hr/employees?new=1')
      return { text: 'Opened the new-employee form. Fill in the details and hit Save.' }
    },
  },
  {
    module: 'hr',
    test: (q) => /how many.*(employee|people|staff)/.test(q) || /headcount/.test(q),
    handle: () => ({
      text: `You have ${employees.length} active employees across 8 departments and 6 locations.`,
      widget: {
        kind: 'stat-row',
        stats: [
          { label: 'Total staff', value: String(employees.length), tone: 'sky' },
          { label: 'Departments', value: '8', tone: 'lime' },
          { label: 'On probation', value: String(employees.filter((e) => e.status === 'Probation').length), tone: 'amber' },
          { label: 'New this month', value: String(Math.abs(employees.length - (employees.length - 6))), tone: 'sage' },
        ],
      },
    }),
  },
  {
    module: 'hr',
    test: (q) => /how many.*(pending|leave)/.test(q) || /pending leave/.test(q),
    handle: (_q, { api }) => {
      const pending = api.leaves.filter((l) => l.status === 'Pending')
      return {
        text: `There ${pending.length === 1 ? 'is' : 'are'} ${pending.length} pending leave request${pending.length === 1 ? '' : 's'} awaiting approval.`,
        widget: pending.length > 0 ? {
          kind: 'action-list',
          actions: [
            { label: 'Approve all', icon: CheckCircle2, cmd: 'Approve all pending leaves' },
            { label: 'Go to Leave', icon: CalendarCheck, cmd: 'go to leave' },
          ],
        } : undefined,
      }
    },
  },
  {
    module: 'hr',
    test: (q) => /present|attendance today|attendance/.test(q),
    handle: () => {
      const presentCount = todayAttendance.filter((a) => a.status === 'Present' || a.status === 'Late').length
      const remoteCount = todayAttendance.filter((a) => a.status === 'Remote').length
      const absentCount = todayAttendance.filter((a) => a.status === 'Absent' || a.status === 'On Leave').length
      return {
        text: `Today's attendance is looking ${presentCount + remoteCount > employees.length * 0.85 ? 'healthy' : 'moderate'}.`,
        widget: {
          kind: 'stat-row',
          stats: [
            { label: 'Present', value: String(presentCount), tone: 'lime' },
            { label: 'Remote', value: String(remoteCount), tone: 'sky' },
            { label: 'Absent', value: String(absentCount), tone: 'rose' },
            { label: 'Rate', value: `${(((presentCount + remoteCount) / employees.length) * 100).toFixed(1)}%`, tone: 'sage' },
          ],
        },
      }
    },
  },
  {
    module: 'hr',
    test: (q) => /(open|how many).*(role|position|opening|vacan)/.test(q),
    handle: () => {
      const o = jobs.reduce((s, j) => s + j.openings, 0)
      return { text: `There are ${o} open positions across ${jobs.length} active pipelines.` }
    },
  },
  {
    module: 'finance',
    test: (q) => /financial|finance|revenue|profit|expense/.test(q),
    handle: () => {
      const cm = monthlyFinance.at(-1)!
      const pm = monthlyFinance.at(-2)!
      const delta = (((cm.revenue - pm.revenue) / pm.revenue) * 100).toFixed(1)
      return {
        text: `Here's this month's financial snapshot. Revenue is ${Number(delta) >= 0 ? 'up' : 'down'} ${Math.abs(Number(delta))}% vs last month.`,
        widget: {
          kind: 'stat-row',
          stats: [
            { label: 'Revenue', value: fmtCompact(cm.revenue), tone: 'lime' },
            { label: 'Expenses', value: fmtCompact(cm.expenses), tone: 'rose' },
            { label: 'Net profit', value: fmtCompact(cm.profit), tone: 'sage' },
            { label: 'Margin', value: `${((cm.profit / cm.revenue) * 100).toFixed(1)}%`, tone: 'sky' },
          ],
        },
      }
    },
  },
  {
    module: 'finance',
    test: (q) => /overdue/.test(q) && !/asset|loan|project/.test(q),
    handle: (_q, { api }) => {
      const o = api.invoices.filter((i) => i.status === 'Overdue')
      return {
        text: `${o.length} invoice${o.length !== 1 ? 's are' : ' is'} overdue totalling ${fmtINR(o.reduce((s, i) => s + i.total, 0))}.`,
        widget: {
          kind: 'action-list',
          actions: [
            { label: 'Open Invoices', icon: FileText, cmd: 'go to invoices' },
          ],
        },
      }
    },
  },
  {
    module: 'assets',
    test: (q) => /(asset|maintenance|inventory|laptop|device|loan)/.test(q) && !/(go|open|take me|navigate)/.test(q),
    handle: (q, { api }) => {
      const today = todayDay()
      const live = api.assets.filter((a) => a.status !== 'Retired')
      const due = live.filter((a) => a.nextMaintenanceDate && toDay(a.nextMaintenanceDate) - today <= 7).length
      const late = live.filter((a) => a.status === 'Assigned' && a.returnDue && toDay(a.returnDue) < today).length
      return {
        text: /maintenance/.test(q)
          ? `${due} asset${due === 1 ? ' is' : 's are'} due for maintenance within 7 days.`
          : `You have ${live.length} active assets — ${live.filter((a) => a.status === 'Available').length} ready to assign.`,
        widget: {
          kind: 'stat-row',
          stats: [
            { label: 'Assigned', value: String(live.filter((a) => a.status === 'Assigned').length), tone: 'sky' },
            { label: 'Maintenance due', value: String(due), tone: due ? 'amber' : 'sage' },
            { label: 'Loans overdue', value: String(late), tone: late ? 'rose' : 'sage' },
          ],
        },
      }
    },
  },
  {
    module: 'projects',
    test: (q) => /project/.test(q) && !/(go|open|take me|navigate)/.test(q),
    handle: (_q, { api }) => {
      const today = todayDay()
      const active = api.projects.filter((p) => p.status !== 'Completed')
      const late = active.filter((p) => toDay(p.plannedEnd) < today).length
      return {
        text: `${active.length} projects are active${late ? `, ${late} past their planned end date` : ' and all within their planned dates'}.`,
        widget: {
          kind: 'stat-row',
          stats: [
            { label: 'In progress', value: String(api.projects.filter((p) => p.status === 'In Progress').length), tone: 'lime' },
            { label: 'On hold', value: String(api.projects.filter((p) => p.status === 'On Hold').length), tone: 'amber' },
            { label: 'Late', value: String(late), tone: late ? 'rose' : 'sage' },
          ],
        },
      }
    },
  },
]

function runCommand(prompt: string, api: ReturnType<typeof useApp.getState>, nav: (to: string) => void, modules: ModuleKey[]): CommandResult {
  const q = prompt.toLowerCase().trim()
  const can = (m: ModuleKey) => modules.includes(m)
  const ctx: Ctx = { api, nav, can }

  // ── Single-pass intent scan: each entry's module gate short-circuits its
  // (often costlier) regex test, so denied modules never run their patterns. ──
  for (const intent of INTENTS) {
    if (intent.module && !can(intent.module)) continue
    if (!intent.test(q)) continue
    return intent.handle(q, ctx)
  }
  // A query that *would* match a gated intent but lacks access gets a clear
  // "no access" reply instead of falling through to navigation/fallback.
  for (const intent of INTENTS) {
    if (intent.module && !can(intent.module) && intent.test(q)) {
      return { text: `That's part of ${MODULE_LABEL[intent.module]}, which your role doesn't have access to. I can help with ${modules.map((m) => MODULE_LABEL[m]).join(', ')}.` }
    }
  }

  // ── Navigation (only to modules this role can open) ──────
  const routes = ROUTES.filter((r) => can(moduleOf(r.to)))
  for (const r of routes) {
    if ((/(go|open|show|take me|navigate|view)/.test(q) || q.startsWith(r.label.toLowerCase())) && r.keys.some((k) => q.includes(k))) {
      nav(r.to); return { text: `Opening ${r.label} for you.` }
    }
  }
  for (const r of routes) {
    if (r.keys.some((k) => q === k || q === k + 's')) { nav(r.to); return { text: `Opening ${r.label}.` } }
  }

  // ── Fallback ─────────────────────────────────────────────
  return {
    text: `I can run actions, pull live data and navigate across ${modules.map((m) => MODULE_LABEL[m]).join(', ')}. Try one of these:`,
    widget: { kind: 'action-list', actions: quickFor(modules).slice(0, 3) },
  }
}

const quickFor = (modules: ModuleKey[]) => QUICK.filter((q) => modules.includes(q.module))
const NO_MODULES: ModuleKey[] = []

/* ─── Voice (Web Speech API — native browser, no extra dependency) ──────── */
type SpeechRecognitionLike = {
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: ((e: any) => void) | null
  onerror: ((e: any) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}
const SpeechRecognitionCtor: (new () => SpeechRecognitionLike) | undefined =
  (typeof window !== 'undefined' && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)) || undefined
const speechSupported = !!SpeechRecognitionCtor
const ttsSupported = typeof window !== 'undefined' && 'speechSynthesis' in window

/** Mic-to-text: dictate into the composer, auto-sending once speech finishes. */
function useVoiceInput(onResult: (text: string) => void) {
  const [listening, setListening] = useState(false)
  const recRef = useRef<SpeechRecognitionLike | null>(null)

  const toggle = useCallback(() => {
    if (!speechSupported) return
    if (listening) {
      recRef.current?.stop()
      return
    }
    const rec = new SpeechRecognitionCtor!()
    rec.continuous = false
    rec.interimResults = false
    rec.lang = 'en-US'
    rec.onresult = (e: any) => {
      const text = e.results?.[0]?.[0]?.transcript?.trim()
      if (text) onResult(text)
    }
    rec.onerror = () => setListening(false)
    rec.onend = () => setListening(false)
    recRef.current = rec
    setListening(true)
    rec.start()
  }, [listening, onResult])

  useEffect(() => () => recRef.current?.stop(), [])
  return { listening, toggle }
}

/** Speaks AI replies aloud when voice output is enabled. */
function speak(text: string) {
  if (!ttsSupported || !text) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.rate = 1.02
  window.speechSynthesis.speak(u)
}

/* ─── Widget renderers ──────────────────────────────────────── */
const TONE_STYLES: Record<string, string> = {
  lime:  'bg-lime/70 border-lime-deep/25 text-[#495d16]',
  sky:   'bg-sky/70 border-sky-deep/22 text-[#24498a]',
  rose:  'bg-rose/70 border-rose-deep/22 text-[#862c58]',
  amber: 'bg-amber/70 border-amber-deep/22 text-[#6b4a10]',
  sage:  'bg-sage/70 border-sage-deep/22 text-[#235e20]',
}

function StatRowWidget({ stats }: NonNullable<Widget['stats']> extends infer S ? { stats: S } : never) {
  return (
    <div className="mt-2 grid grid-cols-2 gap-1.5">
      {(stats as NonNullable<Widget['stats']>).map((s) => (
        <div key={s.label} className={clsx('rounded-xl border px-3 py-2', s.tone ? TONE_STYLES[s.tone] : 'bg-white/10 border-white/15 text-white/80')}>
          <p className="font-display text-base font-semibold leading-none tabular-nums">{s.value}</p>
          <p className="mt-0.5 text-[10px] opacity-70">{s.label}</p>
        </div>
      ))}
    </div>
  )
}

function ActionListWidget({ actions, onSend }: { actions: NonNullable<Widget['actions']>; onSend: (cmd: string) => void }) {
  return (
    <div className="mt-2 flex flex-col gap-1">
      {actions.map((a) => {
        const Icon = a.icon
        return (
          <button key={a.label} onClick={() => onSend(a.cmd)}
            className="flex items-center gap-2.5 rounded-xl border border-white/12 bg-white/8 px-3 py-2 text-left text-[12px] text-white/85 transition-all hover:bg-white/16 hover:border-white/20 active:scale-[0.98]">
            <span className="grid size-6 shrink-0 place-items-center rounded-lg bg-lime/20">
              <Icon size={12} className="text-lime" />
            </span>
            {a.label}
            <ArrowRight size={11} className="ml-auto text-white/35" />
          </button>
        )
      })}
    </div>
  )
}

/* ─── Main component ────────────────────────────────────────── */
export default function AiAssistant() {
  const nav = useNavigate()
  const modules = useAuth((s) => s.user?.modules) ?? NO_MODULES
  const quick = quickFor(modules)
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [input, setInput] = useState('')
  const [voiceOut, setVoiceOut] = useState(false)
  const [msgs, setMsgs] = useState<Msg[]>([{
    id: 0, role: 'ai',
    text: 'Hi! I\'m Nova, your AI workspace assistant. I can pull live data, run actions, and navigate anywhere — just ask.',
    widget: {
      kind: 'action-list',
      actions: quick.slice(0, 3),
    },
  }])
  const idRef = useRef(1)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 200)
  }, [open])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    setTimeout(() => el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' }), 60)
  }, [msgs])

  function send(text: string) {
    const t = text.trim()
    if (!t) return
    const uid = idRef.current++
    const pid = idRef.current++
    setMsgs((m) => [...m, { id: uid, role: 'user', text: t }, { id: pid, role: 'ai', text: '', pending: true }])
    setInput('')
    const result = runCommand(t, useApp.getState(), nav, modules)
    setTimeout(() => {
      setMsgs((m) => m.map((x) => x.id === pid ? { ...x, text: result.text, widget: result.widget, pending: false } : x))
      if (voiceOut) speak(result.text)
    }, 680)
  }

  // Dictated speech is sent the same way a typed message is — including "open
  // invoices" / "go to employees" style phrases, which the existing intent
  // table in runCommand already resolves to real navigation.
  const { listening, toggle: toggleMic } = useVoiceInput((text) => send(text))

  const panelH = expanded ? 'min(82vh, 700px)' : 'min(68vh, 540px)'
  const panelW = expanded ? 'min(96vw, 480px)' : 'min(92vw, 380px)'

  return (
    <>
      {/* ── Orb launcher ────────────────────────────────────── */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="ai-orb fixed bottom-5 right-5 z-[70] grid size-14 place-items-center rounded-full text-white shadow-xl transition-all duration-200 active:scale-90 hover:scale-105"
        aria-label="AI assistant"
      >
        <span className="ai-orb-glow" />
        <span className="ai-orb-pulse" />
        {open
          ? <X size={20} className="relative z-10" />
          : <Sparkles size={20} className="relative z-10" />
        }
      </button>

      {/* ── Panel ───────────────────────────────────────────── */}
      <div
        className={clsx(
          'fixed bottom-24 right-5 z-[70] flex origin-bottom-right flex-col overflow-hidden transition-all duration-300',
          open ? 'pointer-events-auto translate-y-0 scale-100 opacity-100' : 'pointer-events-none translate-y-5 scale-95 opacity-0',
        )}
        style={{ width: panelW, height: panelH, borderRadius: 26 }}
      >
        <div className="ai-panel flex h-full flex-col">

          {/* ── Header ────────────────────────────────────── */}
          <div className="relative flex shrink-0 items-center gap-3 border-b border-white/[0.08] px-4 py-3">
            <div className="relative">
              <span className="ai-avatar grid size-9 place-items-center rounded-xl">
                <Bot size={17} className="text-ink" />
              </span>
              <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-[#13151a] bg-lime" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-display text-sm font-semibold text-white flex items-center gap-1.5">
                Nova
                <span className="rounded-full bg-lime/20 px-1.5 py-px text-[9px] font-bold text-lime uppercase tracking-wide">AI</span>
              </p>
              <p className="text-[11px] text-white/50 flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-lime animate-pulse" />
                Live · runs real actions
              </p>
            </div>
            <div className="flex items-center gap-1">
              {ttsSupported && (
                <button onClick={() => { setVoiceOut((v) => !v); window.speechSynthesis.cancel() }}
                  className={clsx('grid size-7 place-items-center rounded-full transition-colors hover:bg-white/10',
                    voiceOut ? 'text-lime' : 'text-white/50 hover:text-white')}
                  aria-label={voiceOut ? 'Mute voice replies' : 'Read replies aloud'}
                  title={voiceOut ? 'Voice replies on' : 'Voice replies off'}>
                  {voiceOut ? <Volume2 size={13} /> : <VolumeX size={13} />}
                </button>
              )}
              <button onClick={() => setExpanded((e) => !e)}
                className="grid size-7 place-items-center rounded-full text-white/50 transition-colors hover:bg-white/10 hover:text-white"
                aria-label={expanded ? 'Shrink' : 'Expand'}>
                {expanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
              </button>
              <button onClick={() => setOpen(false)}
                className="grid size-7 place-items-center rounded-full text-white/50 transition-colors hover:bg-white/10 hover:text-white"
                aria-label="Close">
                <X size={14} />
              </button>
            </div>
          </div>

          {/* ── Messages ──────────────────────────────────── */}
          <div ref={scrollRef} className="scroll-thin flex-1 space-y-3 overflow-y-auto px-3.5 py-4">
            {msgs.map((m) => (
              <div key={m.id} className={clsx('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                <div className={clsx('ai-msg max-w-[88%]', m.role === 'user' ? 'max-w-[78%]' : '')}>
                  {/* AI avatar dot */}
                  {m.role === 'ai' && (
                    <div className="mb-1.5 flex items-center gap-1.5">
                      <span className="grid size-5 place-items-center rounded-lg bg-gradient-to-br from-lime/30 to-lime/10">
                        <Zap size={10} className="text-lime" />
                      </span>
                      <span className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">Nova</span>
                    </div>
                  )}
                  <div className={clsx(
                    'rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed',
                    m.role === 'user'
                      ? 'rounded-tr-sm bg-lime text-ink font-medium'
                      : 'rounded-tl-sm bg-white/[0.09] text-white/90 backdrop-blur-sm border border-white/[0.07]',
                  )}>
                    {m.pending ? (
                      <span className="flex gap-1.5 py-0.5">
                        <i className="ai-dot" style={{ animationDelay: '0ms' }} />
                        <i className="ai-dot" style={{ animationDelay: '160ms' }} />
                        <i className="ai-dot" style={{ animationDelay: '320ms' }} />
                      </span>
                    ) : m.text}
                  </div>

                  {/* Widgets */}
                  {!m.pending && m.widget && (
                    <div className="mt-1.5">
                      {m.widget.kind === 'stat-row' && m.widget.stats && (
                        <StatRowWidget stats={m.widget.stats} />
                      )}
                      {m.widget.kind === 'action-list' && m.widget.actions && (
                        <ActionListWidget actions={m.widget.actions} onSend={send} />
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* ── Quick chips ───────────────────────────────── */}
          <div className="shrink-0 border-t border-white/[0.07] px-3.5 py-2">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/30">Quick actions</p>
            <div className="flex gap-1.5 overflow-x-auto scroll-thin pb-0.5">
              {quick.map((q) => {
                const Icon = q.icon
                return (
                  <button key={q.label} onClick={() => send(q.cmd)}
                    className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] text-white/70 transition-all hover:bg-white/12 hover:border-white/20 hover:text-white active:scale-95">
                    <Icon size={11} />
                    {q.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── Input ─────────────────────────────────────── */}
          <form onSubmit={(e) => { e.preventDefault(); send(input) }}
            className="shrink-0 flex items-center gap-2 border-t border-white/[0.07] p-3">
            <div className="relative flex-1">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={listening ? 'Listening…' : 'Ask Nova anything…'}
                className="h-10 w-full rounded-full border border-white/12 bg-white/6 pl-4 pr-3 text-[13px] text-white outline-none transition-all placeholder:text-white/35 focus:border-lime/50 focus:bg-white/10"
              />
            </div>
            {speechSupported && (
              <button
                type="button"
                onClick={toggleMic}
                aria-label={listening ? 'Stop voice input' : 'Speak a command'}
                title={listening ? 'Stop listening' : 'Speak to Nova — try "open invoices" or "run payroll"'}
                className={clsx(
                  'grid size-10 shrink-0 place-items-center rounded-full transition-all active:scale-90',
                  listening
                    ? 'bg-rose text-ink shadow-[0_2px_12px_rgba(232,124,169,0.45)] animate-pulse'
                    : 'bg-white/10 text-white/60 hover:bg-white/16 hover:text-white',
                )}
              >
                {listening ? <MicOff size={16} /> : <Mic size={16} />}
              </button>
            )}
            <button
              type="submit"
              disabled={!input.trim()}
              className={clsx(
                'grid size-10 shrink-0 place-items-center rounded-full transition-all active:scale-90',
                input.trim()
                  ? 'bg-lime text-ink shadow-[0_2px_12px_rgba(174,206,82,0.4)] hover:brightness-105'
                  : 'bg-white/10 text-white/30',
              )}
            >
              <ArrowUp size={17} />
            </button>
          </form>

        </div>
      </div>
    </>
  )
}

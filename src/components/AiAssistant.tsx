import clsx from 'clsx'
import { ArrowUp, Sparkles, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { employees, invoices as mockInvoices, jobs, todayAttendance } from '../data/mock'
import { useApp } from '../store'

type Msg = { id: number; role: 'user' | 'ai'; text: string; pending?: boolean }

const ROUTES: { keys: string[]; to: string; label: string }[] = [
  { keys: ['employee', 'people', 'staff', 'team'], to: '/hr/employees', label: 'Employees' },
  { keys: ['attendance', 'present', 'clock'], to: '/hr/attendance', label: 'Attendance' },
  { keys: ['leave', 'time off', 'vacation'], to: '/hr/leave', label: 'Leave' },
  { keys: ['recruit', 'hiring', 'candidate', 'pipeline'], to: '/hr/recruitment', label: 'Recruitment' },
  { keys: ['payroll', 'salary', 'salaries'], to: '/hr/payroll', label: 'Payroll' },
  { keys: ['invoice', 'billing'], to: '/finance/invoices', label: 'Invoices' },
  { keys: ['expense', 'reimburse'], to: '/finance/expenses', label: 'Expenses' },
  { keys: ['budget'], to: '/finance/budgets', label: 'Budgets' },
  { keys: ['report', 'analytics', 'finance dashboard'], to: '/finance/reports', label: 'Reports' },
  { keys: ['hr dashboard', 'home', 'overview'], to: '/hr', label: 'HR Dashboard' },
]

const SUGGESTIONS = ['Approve all pending leaves', 'Run payroll', 'How many employees do we have?', 'Open recruitment']

/** Tiny intent engine — maps a prompt to a real store action or navigation, then narrates the result. */
function runCommand(prompt: string, api: ReturnType<typeof useApp.getState>, nav: (to: string) => void): string {
  const q = prompt.toLowerCase().trim()
  const pending = api.leaves.filter((l) => l.status === 'Pending')

  // Approve / decline leaves
  if (/(approve|accept|clear).*(leave|request)/.test(q) || /approve all/.test(q)) {
    if (pending.length === 0) return 'There are no pending leave requests right now — you\'re all caught up. 🎉'
    pending.forEach((l) => api.setLeaveStatus(l.id, 'Approved'))
    nav('/hr/leave')
    return `Done — I approved ${pending.length} pending leave request${pending.length > 1 ? 's' : ''} and opened the Leave page so you can see it.`
  }
  if (/(decline|reject|deny).*(leave|request)/.test(q)) {
    if (pending.length === 0) return 'No pending leave requests to decline.'
    pending.forEach((l) => api.setLeaveStatus(l.id, 'Rejected'))
    nav('/hr/leave')
    return `I declined ${pending.length} pending leave request${pending.length > 1 ? 's' : ''}. You can reverse any of them on the Leave page.`
  }

  // Payroll
  if (/(run|start|process|disburse).*payroll/.test(q) || q === 'run payroll') {
    api.runPayroll()
    nav('/hr/payroll')
    return 'Payroll run started — I\'m processing salaries now and will mark it paid in a moment.'
  }

  // Mark invoice paid
  const inv = q.match(/inv[-\s]?(\d+)/)
  if (inv && /paid|settle|clear/.test(q)) {
    const id = `INV-${inv[1].padStart(4, '0')}`
    const found = api.invoices.find((i) => i.id.toLowerCase() === id.toLowerCase())
    if (found) {
      api.setInvoiceStatus(found.id, 'Paid')
      nav('/finance/invoices')
      return `Marked ${found.id} (${found.client.name}) as paid.`
    }
    return `I couldn't find an invoice matching "${inv[0]}". Try the exact id from the Invoices page.`
  }

  // Add employee
  if (/(add|create|onboard|new).*(employee|person|staff|hire)/.test(q)) {
    nav('/hr/employees?new=1')
    return 'Opened the new-employee form for you — fill in the details and save.'
  }

  // Data questions
  if (/how many.*(employee|people|staff)/.test(q) || /headcount/.test(q)) return `You currently have ${employees.length} active employees across 8 departments and 6 locations.`
  if (/how many.*(pending|leave)/.test(q) || /pending leave/.test(q)) return `There ${pending.length === 1 ? 'is' : 'are'} ${pending.length} pending leave request${pending.length === 1 ? '' : 's'} awaiting your approval.`
  if (/present|attendance today/.test(q)) {
    const p = todayAttendance.filter((a) => a.status === 'Present' || a.status === 'Late').length
    return `${p} employees are present today (including a few who clocked in late), plus remote staff.`
  }
  if (/(open|how many).*(role|position|opening|vacan)/.test(q)) {
    const o = jobs.reduce((s, j) => s + j.openings, 0)
    return `There are ${o} open positions across ${jobs.length} active job pipelines.`
  }
  if (/overdue/.test(q)) {
    const o = mockInvoices.filter((i) => i.status === 'Overdue').length
    return `${o} invoices are currently overdue — I can take you to the Invoices page to chase them.`
  }

  // Navigation
  for (const r of ROUTES) {
    if ((/(go|open|show|take me|navigate|view)/.test(q) || q.startsWith(r.label.toLowerCase())) && r.keys.some((k) => q.includes(k))) {
      nav(r.to)
      return `Here you go — opening ${r.label}.`
    }
  }
  // bare noun navigation
  for (const r of ROUTES) if (r.keys.some((k) => q === k || q === k + 's')) { nav(r.to); return `Opening ${r.label}.` }

  return "I can navigate the app and run actions for you. Try: “approve all pending leaves”, “run payroll”, “mark INV-0007 as paid”, “add a new employee”, or “how many employees do we have?”."
}

export default function AiAssistant() {
  const nav = useNavigate()
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [msgs, setMsgs] = useState<Msg[]>([{ id: 0, role: 'ai', text: 'Hi Anita 👋 I\'m Nova, your workspace assistant. Ask me to run tasks or jump anywhere.' }])
  const idRef = useRef(1)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [msgs, open])

  function send(text: string) {
    const t = text.trim()
    if (!t) return
    const uid = idRef.current++
    const pid = idRef.current++
    setMsgs((m) => [...m, { id: uid, role: 'user', text: t }, { id: pid, role: 'ai', text: '', pending: true }])
    setInput('')
    const reply = runCommand(t, useApp.getState(), nav)
    setTimeout(() => setMsgs((m) => m.map((x) => (x.id === pid ? { ...x, text: reply, pending: false } : x))), 650)
  }

  return (
    <>
      {/* Launcher */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="ai-orb fixed bottom-5 right-5 z-[70] grid size-14 place-items-center rounded-full text-white shadow-xl transition-transform active:scale-90"
        aria-label="AI assistant"
      >
        <span className="ai-orb-glow" />
        {open ? <X size={22} className="relative" /> : <Sparkles size={22} className="relative" />}
      </button>

      {/* Panel */}
      <div
        className={clsx(
          'fixed bottom-24 right-5 z-[70] flex w-[min(92vw,380px)] origin-bottom-right flex-col overflow-hidden rounded-[24px] transition-all duration-300',
          open ? 'pointer-events-auto translate-y-0 scale-100 opacity-100' : 'pointer-events-none translate-y-4 scale-95 opacity-0',
        )}
        style={{ height: 'min(70vh, 560px)' }}
      >
        <div className="ai-panel flex h-full flex-col">
          {/* Header */}
          <div className="relative flex items-center gap-3 border-b border-white/10 px-4 py-3.5">
            <span className="ai-avatar grid size-9 place-items-center rounded-full">
              <Sparkles size={16} className="text-ink" />
            </span>
            <div className="flex-1">
              <p className="font-display text-sm font-medium text-white">Nova</p>
              <p className="flex items-center gap-1.5 text-[11px] text-white/60">
                <span className="size-1.5 animate-pulse rounded-full bg-lime" /> Online · runs real actions
              </p>
            </div>
            <button onClick={() => setOpen(false)} className="grid size-8 place-items-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white">
              <X size={16} />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="scroll-thin flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {msgs.map((m) => (
              <div key={m.id} className={clsx('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                <div
                  className={clsx(
                    'ai-msg max-w-[82%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed',
                    m.role === 'user' ? 'rounded-br-md bg-lime text-ink' : 'rounded-bl-md bg-white/10 text-white/90 backdrop-blur',
                  )}
                >
                  {m.pending ? (
                    <span className="flex gap-1 py-1">
                      <i className="ai-dot" style={{ animationDelay: '0ms' }} />
                      <i className="ai-dot" style={{ animationDelay: '150ms' }} />
                      <i className="ai-dot" style={{ animationDelay: '300ms' }} />
                    </span>
                  ) : (
                    m.text
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Suggestions */}
          {msgs.length <= 1 && (
            <div className="flex flex-wrap gap-1.5 px-4 pb-1">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => send(s)} className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] text-white/80 transition-colors hover:bg-white/15">
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              send(input)
            }}
            className="flex items-center gap-2 p-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Nova to do something…"
              className="h-10 flex-1 rounded-full border border-white/15 bg-white/5 px-4 text-[13px] text-white outline-none transition-colors placeholder:text-white/40 focus:border-lime/60"
            />
            <button type="submit" disabled={!input.trim()} className="grid size-10 shrink-0 place-items-center rounded-full bg-lime text-ink transition-all hover:brightness-105 active:scale-90 disabled:opacity-40">
              <ArrowUp size={18} />
            </button>
          </form>
        </div>
      </div>
    </>
  )
}

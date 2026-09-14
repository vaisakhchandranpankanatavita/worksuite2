import clsx from 'clsx'
import { Bell, CalendarCheck, ChevronDown, FileText, HelpCircle, Home, IndianRupee, LineChart, LogOut, Menu, PiggyBank, Receipt, Search, Settings, User, UserPlus, Users, Wallet, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { employees, invoices } from '../data/mock'
import { roleById, type ModuleKey } from '../data/roles'
import { useAuth } from '../store'
import { Avatar, IconBtn, Toasts } from './ui'
import AiAssistant from './AiAssistant'

const NAV: Record<ModuleKey, { to: string; label: string; icon: typeof Home; end?: boolean }[]> = {
  hr: [
    { to: '/hr', label: 'Dashboard', icon: Home, end: true },
    { to: '/hr/employees', label: 'Employees', icon: Users },
    { to: '/hr/attendance', label: 'Attendance', icon: CalendarCheck },
    { to: '/hr/leave', label: 'Leave', icon: PiggyBank },
    { to: '/hr/recruitment', label: 'Recruitment', icon: UserPlus },
    { to: '/hr/payroll', label: 'Payroll', icon: Wallet },
  ],
  finance: [
    { to: '/finance', label: 'Dashboard', icon: Home, end: true },
    { to: '/finance/invoices', label: 'Invoices', icon: FileText },
    { to: '/finance/expenses', label: 'Expenses', icon: Receipt },
    { to: '/finance/budgets', label: 'Budgets', icon: IndianRupee },
    { to: '/finance/reports', label: 'Reports', icon: LineChart },
  ],
}

const MODULE_LABEL: Record<ModuleKey, string> = { hr: 'HR', finance: 'Finance' }

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden>
        <g className="logo-mark" fill="none" stroke="#1a1d29" strokeWidth="2">
          {[0, 60, 120, 180, 240, 300].map((r) => (
            <ellipse key={r} cx="16" cy="9.5" rx="3.6" ry="6" transform={`rotate(${r} 16 16)`} />
          ))}
        </g>
      </svg>
      <span className="font-display text-[17px] font-medium tracking-tight">Worksuite</span>
    </div>
  )
}

function GlobalSearch({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState('')
  const nav = useNavigate()
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => ref.current?.focus(), [])
  const results = useMemo(() => {
    if (!q.trim()) return []
    const s = q.toLowerCase()
    const emps = employees.filter((e) => `${e.name} ${e.role} ${e.id}`.toLowerCase().includes(s)).slice(0, 5).map((e) => ({ key: e.id, title: e.name, sub: `${e.role} · ${e.department}`, to: `/hr/employees/${e.id}`, hue: e.avatarHue }))
    const invs = invoices.filter((i) => `${i.id} ${i.client.name}`.toLowerCase().includes(s)).slice(0, 4).map((i) => ({ key: i.id, title: i.id, sub: i.client.name, to: `/finance/invoices?open=${i.id}`, hue: undefined }))
    return [...emps, ...invs]
  }, [q])
  return (
    <div className="fixed inset-0 z-50 bg-ink/30 p-4 pt-[12vh] backdrop-blur-sm" onMouseDown={onClose}>
      <div className="card card-static animate-in mx-auto max-w-xl p-3" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-2">
          <Search size={18} className="text-ash" />
          <input ref={ref} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Escape' && onClose()} placeholder="Search employees, invoices…" className="h-11 flex-1 bg-transparent outline-none" />
          <kbd className="rounded-md border border-line px-1.5 text-[10px] text-ash">ESC</kbd>
        </div>
        {results.length > 0 && (
          <ul className="mt-2 border-t border-line pt-2">
            {results.map((r) => (
              <li key={r.key}>
                <button onClick={() => { nav(r.to); onClose() }} className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-soft">
                  {r.hue !== undefined ? <Avatar name={r.title} hue={r.hue} size={32} /> : <span className="grid size-8 place-items-center rounded-full bg-lime"><FileText size={15} /></span>}
                  <span>
                    <span className="block text-sm font-bold">{r.title}</span>
                    <span className="block text-xs text-ash">{r.sub}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {q && results.length === 0 && <p className="px-3 py-6 text-center text-sm text-ash">No matches for “{q}”</p>}
      </div>
    </div>
  )
}

const NOTIFICATIONS = [
  { title: '8 leave requests awaiting approval', time: '10 min ago', tone: 'bg-amber' },
  { title: 'September payroll draft is ready', time: '1 hour ago', tone: 'bg-lime' },
  { title: '3 invoices are overdue', time: 'Today', tone: 'bg-rose' },
  { title: 'PF & ESI remittance due this week', time: 'Today', tone: 'bg-sky' },
]

export default function Layout() {
  const { pathname } = useLocation()
  const nav = useNavigate()
  const roleId = useAuth((s) => s.role)
  const logoutAuth = useAuth((s) => s.logout)
  const role = roleById(roleId)
  const module: ModuleKey = pathname.startsWith('/finance') ? 'finance' : 'hr'
  const [search, setSearch] = useState(false)
  const [bell, setBell] = useState(false)
  const [mobile, setMobile] = useState(false)
  const [profile, setProfile] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearch(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  useEffect(() => { setMobile(false); setBell(false); setProfile(false); window.scrollTo(0, 0) }, [pathname])

  function signOut() {
    setProfile(false)
    logoutAuth()
    nav('/login')
  }

  if (!role) return <Navigate to="/login" replace />
  if (!role.modules.includes(module)) return <Navigate to={`/${role.modules[0]}`} replace />

  const links = NAV[module]
  const visibleModules = role.modules

  return (
    <div className="min-h-full">
      <div className="min-h-screen bg-[#f4f6f8] px-4 pb-4 pt-2 sm:px-6 sm:pb-6 sm:pt-3 lg:px-8 lg:pb-8 lg:pt-3">
        <header className="sticky top-0 z-30 -mx-4 mb-6 flex items-center gap-3 border-b border-white/30 bg-gradient-to-r from-white/40 via-white/25 to-sky/15 px-4 py-4 shadow-[0_1px_0_rgba(38,40,37,0.03)] backdrop-blur-xl backdrop-saturate-150 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <div className="flex flex-1 items-center gap-4">
            <Logo />
            {visibleModules.length > 1 && (
              <div className="hidden rounded-full border border-line bg-white p-1 sm:inline-flex">
                {visibleModules.map((m) => (
                  <button key={m} onClick={() => nav(`/${m}`)} className={clsx('rounded-full px-3 py-1 font-display text-[11px] font-medium uppercase tracking-wider transition-all duration-150', module === m ? 'bg-lime text-ink' : 'text-ash hover:scale-105 hover:text-ink')}>
                    {MODULE_LABEL[m]}
                  </button>
                ))}
              </div>
            )}
          </div>

          <nav className="hidden items-center rounded-full border border-line bg-white p-1 xl:flex">
            {links.map(({ to, label, icon: Icon, end }) => (
              <NavLink key={to} to={to} end={end} className={({ isActive }) => clsx('group flex items-center gap-2 rounded-full px-4 py-2 font-display text-[13px] transition-all duration-150', isActive ? 'bg-ink text-white' : 'text-ink/80 hover:bg-soft hover:text-ink')}>
                {({ isActive }) => (
                  <>
                    {isActive && <Icon size={15} className="transition-transform duration-150 group-hover:rotate-6" />}
                    {label}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="flex flex-1 items-center justify-end gap-2">
            <IconBtn onClick={() => setSearch(true)} aria-label="Search" title="Search (Ctrl+K)">
              <Search size={16} />
            </IconBtn>
            <div className="relative">
              <IconBtn onClick={() => setBell((b) => !b)} aria-label="Notifications">
                <Bell size={16} />
                <span className="absolute right-2 top-2 size-2 rounded-full bg-rose-deep ring-2 ring-white" />
              </IconBtn>
              {bell && (
                <div className="card card-static animate-in absolute right-0 top-12 z-40 w-80 p-3">
                  <p className="px-2 pb-2 font-display text-sm font-medium">Notifications</p>
                  {NOTIFICATIONS.map((n) => (
                    <div key={n.title} className="flex gap-3 rounded-xl px-2 py-2.5 transition-colors duration-150 hover:bg-soft">
                      <span className={clsx('mt-1.5 size-2 shrink-0 rounded-full', n.tone)} />
                      <div>
                        <p className="text-sm">{n.title}</p>
                        <p className="text-xs text-ash">{n.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <IconBtn className="hidden sm:grid" aria-label="Help">
              <HelpCircle size={16} />
            </IconBtn>
            <div className="relative ml-1 hidden md:block">
              <button onClick={() => setProfile((p) => !p)} className="flex items-center gap-2.5 rounded-full py-1 pl-1 pr-2 transition-colors hover:bg-soft" aria-label="Account menu">
                <Avatar name={role.name} hue={role.hue} size={40} src={role.photo} />
                <div className="text-left leading-tight">
                  <p className="text-sm font-bold">{role.name}</p>
                  <p className="text-[11px] text-ash">{role.label}</p>
                </div>
                <ChevronDown size={14} className={clsx('text-ash transition-transform', profile && 'rotate-180')} />
              </button>
              {profile && (
                <div className="card card-static animate-in absolute right-0 top-14 z-40 w-56 p-2">
                  <div className="flex items-center gap-3 px-2 py-2">
                    <Avatar name={role.name} hue={role.hue} size={36} src={role.photo} />
                    <div className="leading-tight">
                      <p className="text-sm font-bold">{role.name}</p>
                      <p className="text-[11px] text-ash">{role.email}</p>
                    </div>
                  </div>
                  <div className="my-1 h-px bg-line" />
                  <button className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm transition-colors hover:bg-soft">
                    <User size={15} className="text-ash" /> View profile
                  </button>
                  <button className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm transition-colors hover:bg-soft">
                    <Settings size={15} className="text-ash" /> Settings
                  </button>
                  <div className="my-1 h-px bg-line" />
                  <button onClick={signOut} className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm font-bold text-rose-deep transition-colors hover:bg-rose/40">
                    <LogOut size={15} /> Sign out
                  </button>
                </div>
              )}
            </div>
            <IconBtn className="xl:hidden" onClick={() => setMobile((m) => !m)} aria-label="Menu">
              {mobile ? <X size={16} /> : <Menu size={16} />}
            </IconBtn>
          </div>

          {mobile && (
            <div className="card card-static animate-in absolute left-0 right-0 top-14 z-40 p-3 xl:hidden">
              {visibleModules.length > 1 && (
                <div className="mb-2 flex gap-1 rounded-full bg-soft p-1 sm:hidden">
                  {visibleModules.map((m) => (
                    <button key={m} onClick={() => nav(`/${m}`)} className={clsx('flex-1 rounded-full py-1.5 text-xs font-bold uppercase', module === m ? 'bg-ink text-white' : 'text-ash')}>
                      {MODULE_LABEL[m]}
                    </button>
                  ))}
                </div>
              )}
              {links.map(({ to, label, icon: Icon, end }) => (
                <NavLink key={to} to={to} end={end} className={({ isActive }) => clsx('flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors duration-150', isActive ? 'bg-ink text-white' : 'hover:bg-soft')}>
                  <Icon size={16} /> {label}
                </NavLink>
              ))}
              <div className="my-1 h-px bg-line" />
              <button onClick={signOut} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold text-rose-deep transition-colors duration-150 hover:bg-rose/40">
                <LogOut size={16} /> Sign out
              </button>
            </div>
          )}
        </header>

        <main>
          <Outlet />
        </main>
      </div>
      {search && <GlobalSearch onClose={() => setSearch(false)} />}
      <AiAssistant />
      <Toasts />
    </div>
  )
}

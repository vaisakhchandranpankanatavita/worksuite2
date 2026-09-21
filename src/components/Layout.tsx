import clsx from 'clsx'
import { Bell, Boxes, CalendarCheck, ChevronDown, FileText, HelpCircle, Home, IndianRupee, Laptop, LineChart, ListChecks, LogOut, Menu, PiggyBank, Receipt, Search, Settings, User, UserPlus, Users, Wallet, X } from 'lucide-react'
import Lenis from 'lenis'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { assets, employees, invoices } from '../data/mock'
import { roleById, type ModuleKey } from '../data/roles'
import { useAuth } from '../store'
import { Avatar, IconBtn, Toasts } from './ui'
import AiAssistant from './AiAssistant'
import AssetsEnterOverlay from './AssetsEnterOverlay'

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
    { to: '/finance/expenses', label: 'Expense Claims', icon: Receipt },
    { to: '/finance/track-expenses', label: 'Track Expenses', icon: ListChecks },
    { to: '/finance/budgets', label: 'Budgets', icon: IndianRupee },
    { to: '/finance/reports', label: 'Reports', icon: LineChart },
  ],
  assets: [
    { to: '/assets', label: 'Dashboard', icon: Home, end: true },
    { to: '/assets/inventory', label: 'Inventory', icon: ListChecks },
    { to: '/assets/stock', label: 'Stock', icon: Boxes },
  ],
}

const MODULE_LABEL: Record<ModuleKey, string> = { hr: 'People', finance: 'Finance', assets: 'Assets' }
const MODULE_ICON: Record<ModuleKey, typeof Home> = { hr: Users, finance: Wallet, assets: Laptop }

function Logo() {
  const nav = useNavigate()
  return (
    <button
      onClick={() => nav('/')}
      aria-label="Go to home"
      className="group flex items-center gap-2.5 rounded-xl px-1 py-0.5 transition-all duration-200 hover:opacity-90 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-deep/60"
    >
      <div className="relative transition-transform duration-300 group-hover:scale-110 group-hover:rotate-[18deg]">
        <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden>
          <defs>
            <linearGradient id="logo-bg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#d8eca0" />
              <stop offset="100%" stopColor="#aece52" />
            </linearGradient>
          </defs>
          {/* Glow halo on hover */}
          <circle cx="16" cy="16" r="15" fill="url(#logo-bg)" className="opacity-0 transition-opacity duration-300 group-hover:opacity-30" />
          <g className="logo-mark" fill="none" stroke="#1a1d1b" strokeWidth="1.8">
            {[0, 60, 120, 180, 240, 300].map((r) => (
              <ellipse key={r} cx="16" cy="9.5" rx="3.5" ry="5.8" transform={`rotate(${r} 16 16)`} />
            ))}
          </g>
        </svg>
        {/* Subtle glow ring behind logo on hover */}
        <span className="pointer-events-none absolute inset-0 rounded-full opacity-0 transition-all duration-300 group-hover:opacity-100 group-hover:shadow-[0_0_14px_4px_rgba(174,206,82,0.35)]" />
      </div>
      <span className="font-display text-[17px] font-semibold tracking-tight transition-colors duration-200 group-hover:text-ink/80">
        Worksuite
      </span>
    </button>
  )
}

function GlobalSearch({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState('')
  const nav = useNavigate()
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => ref.current?.focus(), [])
  useEffect(() => {
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prevOverflow }
  }, [])
  const results = useMemo(() => {
    if (!q.trim()) return []
    const s = q.toLowerCase()
    const emps = employees.filter((e) => `${e.name} ${e.role} ${e.id}`.toLowerCase().includes(s)).slice(0, 5).map((e) => ({ key: e.id, title: e.name, sub: `${e.role} · ${e.department}`, to: `/hr/employees/${e.id}`, hue: e.avatarHue }))
    const invs = invoices.filter((i) => `${i.id} ${i.client.name}`.toLowerCase().includes(s)).slice(0, 4).map((i) => ({ key: i.id, title: i.id, sub: i.client.name, to: `/finance/invoices?open=${i.id}`, hue: undefined }))
    const asts = assets.filter((a) => `${a.name} ${a.serial} ${a.id}`.toLowerCase().includes(s)).slice(0, 4).map((a) => ({ key: a.id, title: a.name, sub: `${a.category} · ${a.status}`, to: `/assets/inventory/${a.id}`, hue: undefined }))
    return [...emps, ...invs, ...asts]
  }, [q])
  return createPortal(
    <div className="fixed inset-0 z-50 bg-ink/25 p-4 pt-[11vh] backdrop-blur-md" onMouseDown={onClose}>
      <div className="card card-static animate-in mx-auto max-w-xl p-3" onMouseDown={(e) => e.stopPropagation()}>
        {/* Top accent line */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px rounded-t-[inherit] bg-gradient-to-r from-transparent via-lime-deep/50 to-transparent" />
        <div className="flex items-center gap-3 px-2">
          <Search size={17} className="text-ash shrink-0" />
          <input ref={ref} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Escape' && onClose()} placeholder="Search employees, invoices, assets…" className="h-11 flex-1 bg-transparent text-sm outline-none placeholder:text-ash/60" />
          <kbd className="shrink-0 rounded-lg border border-line bg-soft px-1.5 py-0.5 text-[10px] font-bold text-ash">ESC</kbd>
        </div>
        {results.length > 0 && (
          <ul className="mt-2 border-t border-line/60 pt-2">
            {results.map((r) => (
              <li key={r.key}>
                <button onClick={() => { nav(r.to); onClose() }} className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-colors hover:bg-soft">
                  {r.hue !== undefined ? <Avatar name={r.title} hue={r.hue} size={32} /> : <span className="grid size-8 place-items-center rounded-full bg-lime"><FileText size={14} /></span>}
                  <span>
                    <span className="block text-sm font-semibold">{r.title}</span>
                    <span className="block text-xs text-ash">{r.sub}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {q && results.length === 0 && <p className="px-3 py-7 text-center text-sm text-ash">No matches for "{q}"</p>}
      </div>
    </div>,
    document.body,
  )
}

const NOTIFICATIONS = [
  { title: '8 leave requests awaiting approval', time: '10 min ago', tone: 'bg-amber', dot: 'bg-amber-deep' },
  { title: 'September payroll draft is ready', time: '1 hour ago', tone: 'bg-lime', dot: 'bg-lime-deep' },
  { title: '3 invoices are overdue', time: 'Today', tone: 'bg-rose', dot: 'bg-rose-deep' },
  { title: 'PF & ESI remittance due this week', time: 'Today', tone: 'bg-sky', dot: 'bg-sky-deep' },
]

/**
 * Decorative static blobs behind the card grid — no scroll-driven motion.
 */
function ParallaxBlobs() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{ zIndex: 0 }}
    >
      {/* Top-left lime blob */}
      <div className="absolute -left-32 -top-20 size-[520px] rounded-full bg-lime/[0.13] blur-[90px]" />
      {/* Top-right sky blob */}
      <div className="absolute -right-24 top-40 size-[420px] rounded-full bg-sky/[0.11] blur-[80px]" />
      {/* Mid-left sage blob */}
      <div className="absolute left-1/3 top-[55%] size-[380px] rounded-full bg-sage/[0.09] blur-[70px]" />
      {/* Bottom-right rose blob */}
      <div className="absolute -bottom-16 right-1/4 size-[460px] rounded-full bg-rose/[0.10] blur-[85px]" />
    </div>
  )
}

export default function Layout() {
  const { pathname } = useLocation()
  const nav = useNavigate()
  const roleId = useAuth((s) => s.role)
  const logoutAuth = useAuth((s) => s.logout)
  const role = roleById(roleId)
  const isHelp = pathname.startsWith('/help')
  const module: ModuleKey = pathname.startsWith('/finance') ? 'finance' : pathname.startsWith('/assets') ? 'assets' : pathname.startsWith('/hr') ? 'hr' : (role?.modules[0] ?? 'hr')
  const [search, setSearch] = useState(false)
  const [bell, setBell] = useState(false)
  const [mobile, setMobile] = useState(false)
  const [profile, setProfile] = useState(false)
  const [enteringAssets, setEnteringAssets] = useState(false)

  function goModule(m: ModuleKey) {
    if (m === 'assets' && module !== 'assets') setEnteringAssets(true)
    nav(`/${m}`)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setSearch(true); setBell(false); setProfile(false); setMobile(false) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  // Inertial page scrolling. Nested scroll areas (modals, tables, chat) use `.scroll-thin` and stay native.
  const lenisRef = useRef<Lenis | null>(null)
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const lenis = new Lenis({
      lerp: 0.1,
      wheelMultiplier: 1,
      prevent: (node) => node.classList.contains('scroll-thin'),
    })
    lenisRef.current = lenis
    let raf = requestAnimationFrame(function tick(t) { lenis.raf(t); raf = requestAnimationFrame(tick) })
    return () => { cancelAnimationFrame(raf); lenis.destroy(); lenisRef.current = null }
  }, [])
  useEffect(() => {
    setMobile(false); setBell(false); setProfile(false)
    if (lenisRef.current) lenisRef.current.scrollTo(0, { immediate: true }); else window.scrollTo(0, 0)
  }, [pathname])
  function signOut() { setProfile(false); logoutAuth(); nav('/login') }

  if (!role) return <Navigate to="/login" replace />
  if (!isHelp && !role.modules.includes(module)) return <Navigate to={`/${role.modules[0]}`} replace />

  const links = NAV[module]
  const visibleModules = role.modules

  return (
    <div className="min-h-full">
      {enteringAssets && <AssetsEnterOverlay onDone={() => setEnteringAssets(false)} />}

      {/* ── Ultra-Premium Glassmorphic Header ── */}
      <header className="sticky top-0 z-30">
        {/* Glass surface */}
        <div className="relative flex items-center gap-3 px-4 py-2 sm:px-6 lg:px-8"
          style={{
            background: 'linear-gradient(180deg, rgba(255,255,255,0.52) 0%, rgba(240,245,239,0.38) 100%)',
            backdropFilter: 'blur(48px) saturate(280%) brightness(1.06)',
            WebkitBackdropFilter: 'blur(48px) saturate(280%) brightness(1.06)',
            boxShadow: [
              '0 1px 0 rgba(255,255,255,0.95) inset',
              '0 -1px 0 rgba(26,29,27,0.03) inset',
              '0 8px 40px -8px rgba(26,29,27,0.10)',
              '0 2px 12px -2px rgba(26,29,27,0.06)',
            ].join(', '),
          }}
        >
            {/* Iridescent shimmer line at very top */}
            <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white to-transparent opacity-90" />
            {/* Prismatic colour wash */}
            <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-lime/[0.07] via-sky/[0.03] to-transparent" />
            {/* Bottom separator — soft glow line */}
            <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-lime-deep/20 to-transparent" />

            {/* Left: Logo + module switcher */}
            <div className="flex flex-1 items-center gap-4">
              <Logo />
              {visibleModules.length > 1 && (
                <div className="hidden rounded-full border border-white/60 bg-white/40 p-1 backdrop-blur-xl sm:inline-flex" style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.8), 0 2px 8px -2px rgba(26,29,27,0.08)' }}>
                  {visibleModules.map((m) => {
                    const Icon = MODULE_ICON[m]
                    return (
                      <button key={m} onClick={() => goModule(m)} className={clsx('flex items-center gap-1.5 rounded-full px-3.5 py-1.5 font-display text-[11px] font-semibold uppercase tracking-wider transition-all duration-200', module === m ? 'bg-ink text-white shadow-sm' : 'text-ash hover:scale-105 hover:text-ink')}>
                        <Icon size={12} />{MODULE_LABEL[m]}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Centre: Desktop nav pills */}
            <nav className="hidden items-center rounded-full border border-white/55 bg-white/35 p-1 backdrop-blur-xl xl:flex" style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.85), inset 0 -1px 0 rgba(26,29,27,0.03), 0 2px 12px -4px rgba(26,29,27,0.08)' }}>
              {links.map(({ to, label, icon: Icon, end }) => (
                <NavLink key={to} to={to} end={end} title={label} aria-label={label} className={({ isActive }) => clsx('group flex items-center gap-2 rounded-full font-display text-[13px] font-medium transition-all duration-200', isActive ? 'size-9 justify-center bg-ink text-white shadow-sm' : 'px-4 py-2 text-ink/75 hover:bg-soft hover:text-ink')}>
                  {({ isActive }) => (isActive ? <Icon size={15} /> : label)}
                </NavLink>
              ))}
            </nav>

            {/* Right: Actions */}
            <div className="flex flex-1 items-center justify-end gap-1.5">
              {/* Search */}
              <button onClick={() => { setSearch(true); setBell(false); setProfile(false); setMobile(false) }} title="Search (Ctrl+K)" aria-label="Search" className="flex h-9 items-center gap-2 rounded-full border border-white/55 bg-white/35 px-3 text-xs text-ash backdrop-blur-xl transition-all hover:border-white/80 hover:bg-white/60 hover:text-ink hover:shadow-sm" style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.8)' }}>
                <Search size={14} />
                <span className="hidden sm:inline">Search</span>
                <kbd className="hidden rounded-md border border-line bg-soft px-1.5 py-0.5 text-[10px] font-bold sm:inline">⌘K</kbd>
              </button>

              {/* Notifications */}
              <div className="relative">
                <IconBtn onClick={() => setBell((b) => { const next = !b; if (next) { setProfile(false); setMobile(false) } return next })} aria-label="Notifications">
                  <Bell size={15} />
                  <span className="absolute right-2 top-2 size-2 rounded-full bg-rose-deep ring-2 ring-white" />
                </IconBtn>
                {bell && (
                  <div className="animate-in absolute right-0 top-12 z-40 w-80 rounded-2xl p-3"
                    style={{
                      background: 'rgba(250,252,249,0.98)',
                      backdropFilter: 'blur(48px) saturate(280%)',
                      WebkitBackdropFilter: 'blur(48px) saturate(280%)',
                      border: '1px solid rgba(255,255,255,0.9)',
                      boxShadow: '0 0 0 1px rgba(255,255,255,0.9) inset, 0 8px 40px -8px rgba(26,29,27,0.18), 0 24px 64px -16px rgba(26,29,27,0.12)',
                    }}
                  >
                    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px rounded-t-2xl bg-gradient-to-r from-transparent via-rose-deep/30 to-transparent" />
                    <p className="px-2 pb-2 font-display text-sm font-semibold">Notifications</p>
                    {NOTIFICATIONS.map((n) => (
                      <div key={n.title} className="flex gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-white/60">
                        <span className={clsx('mt-1.5 size-2 shrink-0 rounded-full', n.dot)} />
                        <div>
                          <p className="text-sm">{n.title}</p>
                          <p className="text-xs text-ash">{n.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Help */}
              <IconBtn className="hidden sm:grid" aria-label="Help" title="Help & overview" onClick={() => nav('/help')}><HelpCircle size={15} /></IconBtn>

              {/* Profile */}
              <div className="relative ml-0.5 hidden md:block">
                <button onClick={() => setProfile((p) => { const next = !p; if (next) { setBell(false); setMobile(false) } return next })} className="flex items-center gap-2.5 rounded-full border border-white/55 bg-white/35 py-1 pl-1 pr-2.5 backdrop-blur-xl transition-all hover:border-white/80 hover:bg-white/60 hover:shadow-sm" style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.8)' }} aria-label="Account menu">
                  <Avatar name={role.name} hue={role.hue} size={32} src={role.photo} />
                  <div className="text-left leading-tight">
                    <p className="text-[13px] font-semibold">{role.name}</p>
                    <p className="text-[11px] text-ash">{role.label}</p>
                  </div>
                  <ChevronDown size={13} className={clsx('text-ash transition-transform', profile && 'rotate-180')} />
                </button>
                {profile && (
                  <div className="animate-in absolute right-0 top-[52px] z-40 w-60 rounded-2xl p-2"
                    style={{
                      background: 'rgba(250,252,249,0.98)',
                      backdropFilter: 'blur(48px) saturate(280%)',
                      WebkitBackdropFilter: 'blur(48px) saturate(280%)',
                      border: '1px solid rgba(255,255,255,0.9)',
                      boxShadow: '0 0 0 1px rgba(255,255,255,0.9) inset, 0 8px 40px -8px rgba(26,29,27,0.18), 0 24px 64px -16px rgba(26,29,27,0.12)',
                    }}
                  >
                    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px rounded-t-2xl bg-gradient-to-r from-transparent via-sky-deep/30 to-transparent" />
                    <div className="flex items-center gap-3 px-2 py-2.5">
                      <Avatar name={role.name} hue={role.hue} size={38} src={role.photo} />
                      <div className="leading-tight">
                        <p className="text-sm font-semibold">{role.name}</p>
                        <p className="text-[11px] text-ash">{role.email}</p>
                      </div>
                    </div>
                    <div className="my-1 h-px bg-line/60" />
                    <button className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm transition-colors hover:bg-white/60">
                      <User size={14} className="text-ash" /> View profile
                    </button>
                    <button className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm transition-colors hover:bg-white/60">
                      <Settings size={14} className="text-ash" /> Settings
                    </button>
                    <div className="my-1 h-px bg-line/60" />
                    <button onClick={signOut} className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm font-semibold text-rose-deep transition-colors hover:bg-rose/30">
                      <LogOut size={14} /> Sign out
                    </button>
                  </div>
                )}
              </div>

              {/* Mobile menu */}
              <IconBtn className="xl:hidden" onClick={() => setMobile((m) => { const next = !m; if (next) { setBell(false); setProfile(false) } return next })} aria-label="Menu">
                {mobile ? <X size={15} /> : <Menu size={15} />}
              </IconBtn>
            </div>

            {/* Mobile dropdown */}
            {mobile && (
              <div className="animate-in absolute left-0 right-0 top-full z-40 p-3 xl:hidden"
                style={{
                  background: 'rgba(250,252,249,0.98)',
                  backdropFilter: 'blur(28px) saturate(200%)',
                  WebkitBackdropFilter: 'blur(28px) saturate(200%)',
                  boxShadow: '0 8px 32px -8px rgba(26,29,27,0.14), 0 24px 56px -16px rgba(26,29,27,0.10)',
                }}
              >
                {visibleModules.length > 1 && (
                  <div className="mb-2 flex gap-1 rounded-full bg-soft p-1 sm:hidden">
                    {visibleModules.map((m) => (
                      <button key={m} onClick={() => goModule(m)} className={clsx('flex-1 rounded-full py-1.5 text-xs font-bold uppercase tracking-wide', module === m ? 'bg-ink text-white' : 'text-ash')}>
                        {MODULE_LABEL[m]}
                      </button>
                    ))}
                  </div>
                )}
                {links.map(({ to, label, icon: Icon, end }) => (
                  <NavLink key={to} to={to} end={end} className={({ isActive }) => clsx('flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-150', isActive ? 'bg-ink text-white' : 'hover:bg-soft')}>
                    <Icon size={15} /> {label}
                  </NavLink>
                ))}
                <div className="my-1 h-px bg-line/70" />
                <button onClick={signOut} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-rose-deep transition-colors hover:bg-rose/30">
                  <LogOut size={15} /> Sign out
                </button>
              </div>
            )}
          </div>
        </header>

      <div className="relative min-h-screen bg-canvas pb-4 pt-4 sm:pb-6 sm:pt-5 lg:pb-8 lg:pt-6">
        {/* Decorative blobs — static background accents */}
        <ParallaxBlobs />
        <main className="px-4 sm:px-6 lg:px-8">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {search && <GlobalSearch onClose={() => setSearch(false)} />}
      <AiAssistant />
      <Toasts />
    </div>
  )
}

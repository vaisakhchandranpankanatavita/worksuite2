import clsx from 'clsx'
import { ArrowRight, Check, ChevronDown, Eye, EyeOff, Lock, Mail } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { HeroArt } from '../components/charts'
import { Avatar, Button } from '../components/ui'
import { ROLES, type RoleId } from '../data/roles'
import { useCountUp } from '../lib/useCountUp'
import { useAuth } from '../store'

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden>
        <g className="logo-mark" fill="none" stroke="#262825" strokeWidth="2">
          {[0, 60, 120, 180, 240, 300].map((r) => (
            <ellipse key={r} cx="16" cy="9.5" rx="3.6" ry="6" transform={`rotate(${r} 16 16)`} />
          ))}
        </g>
      </svg>
      <span className="font-display text-[17px] font-medium tracking-tight">Worksuite</span>
    </div>
  )
}

function AnimatedHeading({ text, as: Tag = 'span', className, baseDelay = 0 }: { text: string; as?: 'h1' | 'h2' | 'p' | 'span'; className?: string; baseDelay?: number }) {
  return (
    <Tag className={className}>
      {text.split(' ').map((word, i) => (
        <span key={i} className="word-in mr-[0.28em] last:mr-0" style={{ animationDelay: `${baseDelay + i * 65}ms` }}>
          {word}
        </span>
      ))}
    </Tag>
  )
}

function HeroStat({ value, label, decimals = 0, suffix = '', delay = 0 }: { value: number; label: string; decimals?: number; suffix?: string; delay?: number }) {
  const text = useCountUp(value, { decimals, suffix, duration: 1200 })
  return (
    <div className="rounded-2xl bg-white/70 px-4 py-2.5 backdrop-blur animate-in" style={{ animationDelay: `${delay}ms` }}>
      <p className="font-display text-lg font-medium leading-none tabular-nums">{text}</p>
      <p className="mt-1 text-[11px] text-ash">{label}</p>
    </div>
  )
}

export default function Login() {
  const nav = useNavigate()
  const login = useAuth((s) => s.login)
  const [roleId, setRoleId] = useState<RoleId>('admin')
  const role = ROLES.find((r) => r.id === roleId)!
  const [email, setEmail] = useState(role.email)
  const [password, setPassword] = useState('demo1234')
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [roleOpen, setRoleOpen] = useState(false)
  const roleRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!roleOpen) return
    const onClick = (e: MouseEvent) => { if (roleRef.current && !roleRef.current.contains(e.target as Node)) setRoleOpen(false) }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [roleOpen])

  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })

  function pickRole(id: RoleId) {
    setRoleId(id)
    setEmail(ROLES.find((r) => r.id === id)!.email)
    setRoleOpen(false)
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    login(roleId)
    nav(`/${role.modules[0]}`)
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f1f3f1] p-4 sm:p-6 lg:p-8">
      {/* Ambient page background — drifting colour blobs behind the auth card */}
      <div className="pointer-events-none absolute inset-0 -z-0 overflow-hidden">
        <div className="login-blob-a absolute -left-32 -top-32 size-[420px] rounded-full bg-lime/60 blur-[100px]" />
        <div className="login-blob-b absolute right-[-12%] top-1/4 size-[480px] rounded-full bg-sky/60 blur-[110px]" />
        <div className="login-blob-c absolute -bottom-40 left-1/3 size-[400px] rounded-full bg-rose/50 blur-[100px]" />
      </div>

      <div className="relative z-10 mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl overflow-hidden rounded-[28px] lg:grid-cols-2">
        {/* Left — form */}
        <div className="card card-static flex flex-col justify-between rounded-[28px] rounded-r-none p-8 sm:p-12 lg:rounded-r-none">
          <Logo />

          <div className="mx-auto w-full max-w-sm py-10">
            <AnimatedHeading as="h1" text="Welcome back" className="font-display text-3xl font-medium tracking-tight" />
            <AnimatedHeading
              as="p"
              text="Sign in to your people & finance workspace."
              className="mt-2 text-sm text-ash"
              baseDelay={160}
            />

            <div className="mt-7">
              <span className="mb-1.5 block text-xs font-bold text-ash">Sign in as</span>
              <div ref={roleRef} className="relative">
                <button
                  type="button"
                  onClick={() => setRoleOpen((o) => !o)}
                  className="flex h-11 w-full items-center gap-2.5 rounded-lg border border-line bg-white pl-2.5 pr-3.5 text-left transition-all focus:border-ink focus:shadow-sm"
                  aria-haspopup="listbox"
                  aria-expanded={roleOpen}
                >
                  <Avatar name={role.name} hue={role.hue} src={role.photo} size={26} />
                  <span className="flex-1 truncate text-sm font-medium">{role.label}</span>
                  <ChevronDown size={16} className={clsx('shrink-0 text-ash transition-transform', roleOpen && 'rotate-180')} />
                </button>

                {roleOpen && (
                  <div
                    role="listbox"
                    className="animate-in absolute left-0 right-0 top-[calc(100%+6px)] z-20 max-h-64 overflow-y-auto scroll-thin rounded-lg p-1.5"
                    style={{
                      background: 'rgba(250,252,249,0.98)',
                      backdropFilter: 'blur(48px) saturate(280%)',
                      WebkitBackdropFilter: 'blur(48px) saturate(280%)',
                      border: '1px solid rgba(255,255,255,0.9)',
                      boxShadow: '0 0 0 1px rgba(255,255,255,0.9) inset, 0 8px 40px -8px rgba(26,29,27,0.18), 0 24px 64px -16px rgba(26,29,27,0.12)',
                    }}
                  >
                    {ROLES.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        role="option"
                        aria-selected={r.id === roleId}
                        onClick={() => pickRole(r.id)}
                        className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm transition-colors hover:bg-white/60"
                      >
                        <Avatar name={r.name} hue={r.hue} src={r.photo} size={26} />
                        <span className="min-w-0 flex-1 truncate font-medium">{r.label}</span>
                        {r.id === roleId && <Check size={14} className="shrink-0 text-ink" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <p className="mt-1.5 text-[11px] text-ash">{role.description}</p>
            </div>

            <form onSubmit={submit} className="mt-5 space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold text-ash">Work email</span>
                <div className="flex h-11 items-center gap-2.5 rounded-lg border border-line bg-white px-3.5 transition-all focus-within:border-ink focus-within:shadow-sm">
                  <Mail size={16} className="text-ash" />
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-full flex-1 bg-transparent text-sm outline-none" placeholder="you@company.com" />
                </div>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-bold text-ash">Password</span>
                <div className="flex h-11 items-center gap-2.5 rounded-lg border border-line bg-white px-3.5 transition-all focus-within:border-ink focus-within:shadow-sm">
                  <Lock size={16} className="text-ash" />
                  <input type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required className="h-full flex-1 bg-transparent text-sm outline-none" placeholder="••••••••" />
                  <button type="button" onClick={() => setShow((s) => !s)} className="text-ash transition-colors hover:text-ink" aria-label={show ? 'Hide password' : 'Show password'}>
                    {show ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </label>

              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 text-ash">
                  <input type="checkbox" defaultChecked className="size-3.5 accent-ink" /> Remember me
                </label>
                <a href="#" className="font-bold text-ink hover:underline">Forgot password?</a>
              </div>

              <Button type="submit" disabled={loading} className="mt-2 w-full">
                {loading ? 'Signing in…' : <>Sign in <ArrowRight size={16} /></>}
              </Button>
            </form>

            <p className="mt-6 text-center text-xs text-ash">
              New to Worksuite? <a href="#" className="font-bold text-ink hover:underline">Request access</a>
            </p>
          </div>

          <p className="text-[11px] text-ash">© {new Date().getFullYear()} Worksuite · Privacy · Terms</p>
        </div>

        {/* Right — animated hero (mirrors the dashboard hero card) */}
        <div className="group/hero card card-static relative hidden overflow-hidden rounded-[28px] rounded-l-none lg:block">
          <HeroArt className="absolute inset-0 size-full" />
          <div className="relative flex h-full flex-col justify-between p-10">
            <span className="inline-flex w-fit items-center gap-1.5 whitespace-nowrap rounded-full bg-ink px-2.5 py-1 text-[11px] font-bold text-white">{today}</span>

            <div>
              <AnimatedHeading
                as="h2"
                text="Your team, at a glance."
                className="max-w-xs font-display text-2xl font-medium leading-snug text-ink"
                baseDelay={80}
              />
              <AnimatedHeading
                as="p"
                text="Attendance, payroll and hiring — one calm workspace."
                className="mt-2 max-w-xs text-sm text-ash"
                baseDelay={260}
              />
              <div className="mt-5 flex flex-wrap gap-2">
                <HeroStat value={6} label="New joiners this month" delay={0} />
                <HeroStat value={6.8} decimals={1} suffix="%" label="Attrition (YTD)" delay={120} />
                <HeroStat value={2.9} decimals={1} suffix=" yrs" label="Avg. tenure" delay={240} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

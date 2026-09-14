import { ArrowRight, ChevronDown, Eye, EyeOff, Lock, Mail } from 'lucide-react'
import { useState } from 'react'
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

  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })

  function pickRole(id: RoleId) {
    setRoleId(id)
    setEmail(ROLES.find((r) => r.id === id)!.email)
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setTimeout(() => {
      login(roleId)
      nav(`/${role.modules[0]}`)
    }, 700)
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f4f6f8] p-4 sm:p-6 lg:p-8">
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

            <label className="mt-7 block">
              <span className="mb-1.5 block text-xs font-bold text-ash">Sign in as</span>
              <div className="relative flex h-11 items-center gap-2.5 rounded-xl border border-line bg-white pl-2.5 pr-3.5 transition-all focus-within:border-ink focus-within:shadow-sm">
                <Avatar name={role.name} hue={role.hue} src={role.photo} size={26} />
                <select
                  value={roleId}
                  onChange={(e) => pickRole(e.target.value as RoleId)}
                  className="h-full flex-1 appearance-none bg-transparent pr-6 text-sm font-medium outline-none"
                >
                  {ROLES.map((r) => (
                    <option key={r.id} value={r.id}>{r.label}</option>
                  ))}
                </select>
                <ChevronDown size={16} className="pointer-events-none absolute right-3.5 text-ash" />
              </div>
              <p className="mt-1.5 text-[11px] text-ash">{role.description}</p>
            </label>

            <form onSubmit={submit} className="mt-5 space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold text-ash">Work email</span>
                <div className="flex h-11 items-center gap-2.5 rounded-xl border border-line bg-white px-3.5 transition-all focus-within:border-ink focus-within:shadow-sm">
                  <Mail size={16} className="text-ash" />
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-full flex-1 bg-transparent text-sm outline-none" placeholder="you@company.com" />
                </div>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-bold text-ash">Password</span>
                <div className="flex h-11 items-center gap-2.5 rounded-xl border border-line bg-white px-3.5 transition-all focus-within:border-ink focus-within:shadow-sm">
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

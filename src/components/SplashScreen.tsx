import { useEffect, useRef, useState } from 'react'

const STEPS = [
  { label: 'Authenticating credentials', pct: 22 },
  { label: 'Loading workspace data',     pct: 45 },
  { label: 'Syncing people & finance',   pct: 68 },
  { label: 'Preparing your dashboard',  pct: 88 },
  { label: 'Almost there…',             pct: 100 },
]

/* ── Dotted grid canvas with mouse-proximity glow ──────────── */
function DotCanvas() {
  const ref    = useRef<HTMLCanvasElement>(null)
  const mouse  = useRef({ x: -9999, y: -9999 })

  useEffect(() => {
    const canvas = ref.current!
    const ctx    = canvas.getContext('2d')!
    let raf: number

    const resize = () => {
      canvas.width  = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const onMove = (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect()
      mouse.current = { x: e.clientX - r.left, y: e.clientY - r.top }
    }
    const onLeave = () => { mouse.current = { x: -9999, y: -9999 } }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseleave', onLeave)

    // Dot grid config
    const GAP    = 28      // spacing between dots
    const R_BASE = 1.1     // resting dot radius
    const R_MAX  = 3.2     // max radius near cursor
    const REACH  = 110     // px influence radius around cursor

    // Accent colours matched to app palette
    const COLORS = ['#d8eca0', '#c8d9f4', '#f0cad8', '#aece52', '#6b92d8']

    // Precompute grid
    type Dot = { gx: number; gy: number; color: string; phase: number }
    let dots: Dot[] = []

    const buildGrid = () => {
      const W = canvas.width
      const H = canvas.height
      dots = []
      const cols = Math.ceil(W / GAP) + 1
      const rows = Math.ceil(H / GAP) + 1
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          dots.push({
            gx:    c * GAP,
            gy:    r * GAP,
            color: Math.random() < 0.08 ? COLORS[Math.floor(Math.random() * COLORS.length)] : 'rgba(255,255,255,1)',
            phase: Math.random() * Math.PI * 2,   // for slow pulse
          })
        }
      }
    }
    buildGrid()
    window.addEventListener('resize', buildGrid)

    let t = 0
    const draw = () => {
      t += 0.012
      const W = canvas.width
      const H = canvas.height
      ctx.clearRect(0, 0, W, H)

      const mx = mouse.current.x
      const my = mouse.current.y

      for (const d of dots) {
        const dist = Math.hypot(d.gx - mx, d.gy - my)
        const near  = Math.max(0, 1 - dist / REACH)   // 0–1, 1 = at cursor

        // Gentle pulse for non-hovered dots
        const pulse = 0.18 + 0.06 * Math.sin(t + d.phase)

        // Radius swells near cursor
        const r = R_BASE + near * (R_MAX - R_BASE)

        // Alpha: base dim + hover boost
        const alpha = near > 0
          ? 0.15 + near * 0.75
          : pulse

        ctx.globalAlpha = alpha
        ctx.fillStyle   = d.color

        ctx.beginPath()
        ctx.arc(d.gx, d.gy, r, 0, Math.PI * 2)
        ctx.fill()

        // Ripple ring right at cursor
        if (near > 0.55) {
          ctx.globalAlpha = near * 0.18
          ctx.strokeStyle = d.color
          ctx.lineWidth   = 0.8
          ctx.beginPath()
          ctx.arc(d.gx, d.gy, r + 2.5 + near * 3, 0, Math.PI * 2)
          ctx.stroke()
        }
      }

      ctx.globalAlpha = 1
      raf = requestAnimationFrame(draw)
    }

    raf = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      window.removeEventListener('resize', buildGrid)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseleave', onLeave)
    }
  }, [])

  return <canvas ref={ref} className="absolute inset-0 size-full" aria-hidden />
}

/* ── Splash screen ───────────────────────────────────────────── */
interface Props { name: string; onDone: () => void }

export default function SplashScreen({ name, onDone }: Props) {
  const [step, setStep]       = useState(0)
  const [pct,  setPct]        = useState(0)
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    let idx = 0
    const tick = () => {
      if (idx < STEPS.length) { setStep(idx); setPct(STEPS[idx].pct); idx++ }
    }
    tick()
    const interval  = setInterval(tick, 750)
    const exitTimer = setTimeout(() => {
      setExiting(true)
      setTimeout(onDone, 600)
    }, 4000)
    return () => { clearInterval(interval); clearTimeout(exitTimer) }
  }, [onDone])

  const firstName = name.split(' ')[0]

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden"
      style={{
        background: '#0d0f0e',
        opacity:    exiting ? 0 : 1,
        transition: exiting ? 'opacity 0.65s cubic-bezier(.22,1,.36,1)' : undefined,
        pointerEvents: exiting ? 'none' : 'all',
      }}
    >
      {/* Dotted canvas background */}
      <DotCanvas />

      {/* Radial vignette — keeps the centre content readable */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse 65% 65% at 50% 50%, transparent 20%, #0d0f0e 85%)',
        }}
      />

      {/* Very subtle colour wash at edges */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="ai-glow-a absolute -left-40 -top-40 size-[500px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(216,236,160,0.14), transparent 65%)' }}
        />
        <div
          className="ai-glow-b absolute -bottom-40 right-[-10%] size-[480px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(200,217,244,0.11), transparent 65%)' }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 flex w-full max-w-xs flex-col items-center px-6 text-center">

        {/* Spinning logo orb */}
        <div
          className="mb-7 flex size-[72px] items-center justify-center rounded-full"
          style={{
            background: 'conic-gradient(from 0deg, #d8eca0, #c8d9f4, #f0cad8, #aece52, #d8eca0)',
            animation: 'ai-orb-rot 5s linear infinite',
          }}
        >
          <div className="flex size-[60px] items-center justify-center rounded-full bg-[#0d0f0e]">
            <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden>
              <defs>
                <linearGradient id="splash-logo" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#d8eca0" />
                  <stop offset="100%" stopColor="#aece52" />
                </linearGradient>
              </defs>
              <g className="logo-mark" fill="none" stroke="url(#splash-logo)" strokeWidth="1.8">
                {[0, 60, 120, 180, 240, 300].map((r) => (
                  <ellipse key={r} cx="16" cy="9.5" rx="3.5" ry="5.8"
                    transform={`rotate(${r} 16 16)`} />
                ))}
              </g>
            </svg>
          </div>
        </div>

        {/* Greeting */}
        <p className="animate-in font-display text-[26px] font-semibold tracking-tight text-white">
          Welcome, {firstName}
        </p>
        <p
          className="animate-in mt-1.5 text-[13px] text-white/40"
          style={{ animationDelay: '100ms' }}
        >
          Setting up your workspace
        </p>

        {/* Progress bar */}
        <div className="mt-9 w-full">
          <div className="h-[3px] overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.07)' }}>
            <div
              className="h-full rounded-full"
              style={{
                width: `${pct}%`,
                background: 'linear-gradient(90deg, #aece52, #6b92d8)',
                transition: 'width 0.65s cubic-bezier(.22,1,.36,1)',
                boxShadow: '0 0 10px rgba(174,206,82,0.6)',
              }}
            />
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[11px]">
            <span key={step} className="animate-in text-white/40">{STEPS[step]?.label}</span>
            <span className="tabular-nums font-medium text-white/25">{pct}%</span>
          </div>
        </div>

        {/* Bouncing dots */}
        <div className="mt-7 flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="ai-dot"
              style={{ animationDelay: `${i * 0.2}s`, background: '#aece52', opacity: 0.5 }}
            />
          ))}
        </div>
      </div>

      {/* Brand footer */}
      <p className="absolute bottom-5 z-10 text-[11px] tracking-widest text-white/12">
        WORKSUITE
      </p>
    </div>
  )
}

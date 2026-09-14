import { useEffect, useState } from 'react'

interface Props {
  label?: string
  onDone: () => void
  duration?: number // ms, default 3000
}

export default function PageLoader({ label = 'Loading…', onDone, duration = 3000 }: Props) {
  const [pct, setPct]         = useState(0)
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    // Smooth progress: tick every 30 ms
    const INTERVAL = 30
    const steps    = duration / INTERVAL
    let current    = 0

    const id = setInterval(() => {
      current++
      // Ease-out: fast start, slow finish (never quite hits 100 until done)
      const raw = current / steps
      const eased = raw < 1 ? 1 - Math.pow(1 - raw, 2.4) : 1
      setPct(Math.min(98, Math.round(eased * 100)))
    }, INTERVAL)

    const exitTimer = setTimeout(() => {
      setPct(100)
      setExiting(true)
      setTimeout(onDone, 380)
    }, duration)

    return () => {
      clearInterval(id)
      clearTimeout(exitTimer)
    }
  }, [onDone, duration])

  return (
    <>
      {/* ── Top progress bar (always visible, no overlay) ── */}
      <div
        className="fixed inset-x-0 top-0 z-[100] h-[2.5px]"
        style={{
          opacity:    exiting ? 0 : 1,
          transition: exiting ? 'opacity 0.38s ease' : undefined,
        }}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${pct}%`,
            background: 'linear-gradient(90deg, #aece52 0%, #6b92d8 60%, #cd6a96 100%)',
            boxShadow: '0 0 10px rgba(174,206,82,0.7), 0 0 24px rgba(107,146,216,0.4)',
            transition: 'width 0.12s linear',
          }}
        >
          {/* Leading glow dot */}
          <span
            className="absolute right-0 top-1/2 size-2 -translate-y-1/2 translate-x-1/2 rounded-full"
            style={{ background: '#aece52', boxShadow: '0 0 8px 3px rgba(174,206,82,0.8)' }}
          />
        </div>
      </div>

      {/* ── Minimal toast chip ── */}
      <div
        className="fixed bottom-5 left-1/2 z-[100] -translate-x-1/2"
        style={{
          opacity:    exiting ? 0 : 1,
          transform:  exiting ? 'translateX(-50%) translateY(8px)' : 'translateX(-50%) translateY(0)',
          transition: exiting ? 'opacity 0.38s ease, transform 0.38s ease' : 'opacity 0.28s ease, transform 0.28s ease',
        }}
      >
        <div
          className="flex items-center gap-2.5 rounded-full px-4 py-2.5 text-[12px] font-medium"
          style={{
            background: 'rgba(20,23,22,0.80)',
            backdropFilter: 'blur(20px) saturate(200%)',
            WebkitBackdropFilter: 'blur(20px) saturate(200%)',
            border: '1px solid rgba(255,255,255,0.09)',
            boxShadow: '0 4px 24px -4px rgba(0,0,0,0.40), inset 0 1px 0 rgba(255,255,255,0.07)',
            color: 'rgba(255,255,255,0.70)',
          }}
        >
          {/* Animated spinner ring */}
          <span className="relative flex size-3.5 shrink-0 items-center justify-center">
            <span
              className="absolute size-full rounded-full border border-white/15"
            />
            <span
              className="absolute size-full rounded-full border-t border-[#aece52]"
              style={{ animation: 'ai-orb-rot 0.9s linear infinite' }}
            />
          </span>
          <span>{label}</span>
        </div>
      </div>
    </>
  )
}

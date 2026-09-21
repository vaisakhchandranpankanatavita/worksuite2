import clsx from 'clsx'
import { Flame, Layers, Rocket, ShieldCheck, Target, Trophy, Users } from 'lucide-react'
import { motion } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Badge as BadgeT, HealthTone } from '../../lib/projectMetrics'

/** Solid + soft colours for each health tone, matching the app's accent palette. */
export const TONE_HEX: Record<HealthTone, { solid: string; soft: string; text: string }> = {
  green: { solid: '#5fa059', soft: '#c6e0c0', text: '#235e20' },
  amber: { solid: '#c08a24', soft: '#f5ddb2', text: '#6b4a10' },
  rose: { solid: '#cd6a96', soft: '#f0cad8', text: '#862c58' },
  blue: { solid: '#6b92d8', soft: '#c8d9f4', text: '#24498a' },
  gray: { solid: '#8a9088', soft: '#e3e8e3', text: '#4a4f48' },
}

/** "+17d late", "4d early" or "on plan". */
export function SlipTag({ days, className }: { days: number; className?: string }) {
  const tone = days > 7 ? 'bg-rose/80 text-[#862c58]' : days > 0 ? 'bg-amber/80 text-[#6b4a10]' : days < 0 ? 'bg-sage/80 text-[#235e20]' : 'bg-soft text-ash'
  return (
    <span className={clsx('inline-flex items-center rounded-full px-2 py-[3px] text-[11px] font-bold leading-none tabular-nums', tone, className)}>
      {days > 0 ? `+${days}d late` : days < 0 ? `${-days}d early` : 'on plan'}
    </span>
  )
}

/* ─── Health ring ───────────────────────────────────────────── */

export function HealthRing({ score, tone, size = 84, label }: { score: number; tone: HealthTone; size?: number; label?: string }) {
  const stroke = Math.max(6, size * 0.1)
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const color = TONE_HEX[tone].solid
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={`Health score ${score} out of 100`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e8ece7" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - score / 100) }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <p className="font-display font-semibold leading-none tabular-nums" style={{ fontSize: size * 0.3 }}>{score}</p>
          {label && <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wide text-ash">{label}</p>}
        </div>
      </div>
    </div>
  )
}

/* ─── Confetti ──────────────────────────────────────────────── */

const CONFETTI = ['#aece52', '#6b92d8', '#cd6a96', '#c08a24', '#5fa059', '#d8eca0']

/** Fires a short burst whenever `burst` changes to a non-zero value. */
export function Confetti({ burst }: { burst: number }) {
  const [live, setLive] = useState(0)
  useEffect(() => {
    if (!burst || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    setLive(burst)
    const t = setTimeout(() => setLive(0), 2400)
    return () => clearTimeout(t)
  }, [burst])
  const bits = useMemo(
    () => Array.from({ length: 70 }, (_, i) => ({
      id: i,
      x: (Math.random() - 0.5) * 900,
      y: -120 - Math.random() * 260,
      fall: 380 + Math.random() * 300,
      rot: (Math.random() - 0.5) * 900,
      color: CONFETTI[i % CONFETTI.length],
      w: 6 + Math.random() * 6,
      h: 8 + Math.random() * 8,
      delay: Math.random() * 0.12,
    })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [live],
  )
  if (!live) return null
  return createPortal(
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[70] overflow-hidden">
      {bits.map((b) => (
        <motion.span
          key={b.id}
          className="absolute left-1/2 top-[45%] block rounded-[2px]"
          style={{ width: b.w, height: b.h, background: b.color }}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
          animate={{ x: b.x, y: [0, b.y, b.fall], opacity: [1, 1, 0], rotate: b.rot }}
          transition={{ duration: 1.9, delay: b.delay, ease: 'easeOut', times: [0, 0.35, 1] }}
        />
      ))}
    </div>,
    document.body,
  )
}

/* ─── Achievement badges ────────────────────────────────────── */

const BADGE_ICON = { flame: Flame, target: Target, shield: ShieldCheck, rocket: Rocket, layers: Layers, users: Users, trophy: Trophy } as const
const BADGE_TONE: Record<BadgeT['icon'], string> = {
  flame: 'from-amber to-[#f0b96a] text-[#6b4a10]',
  target: 'from-sky to-[#9bb9ea] text-[#24498a]',
  shield: 'from-sage to-[#9fce97] text-[#235e20]',
  rocket: 'from-rose to-[#e6a3c0] text-[#862c58]',
  layers: 'from-lime to-lime-deep text-[#495d16]',
  users: 'from-sky to-sage text-[#24498a]',
  trophy: 'from-amber to-lime text-[#6b4a10]',
}

export function BadgeShelf({ badges, compact }: { badges: BadgeT[]; compact?: boolean }) {
  return (
    <div className={clsx('grid gap-2.5', compact ? 'grid-cols-4 sm:grid-cols-7' : 'grid-cols-2 sm:grid-cols-4')}>
      {badges.map((b, i) => {
        const Icon = BADGE_ICON[b.icon]
        return (
          <motion.div
            key={b.id}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05, type: 'spring', stiffness: 300, damping: 20 }}
            title={`${b.label} — ${b.hint}${b.earned ? ' (earned)' : ''}`}
            className={clsx(
              'flex flex-col items-center rounded-2xl border text-center',
              compact ? 'gap-1 p-2' : 'gap-1.5 p-3',
              b.earned ? 'border-white/80 bg-white/80 shadow-[0_4px_16px_-6px_rgba(26,29,27,0.18)]' : 'border-dashed border-line bg-soft/40',
            )}
          >
            <span className={clsx('grid place-items-center rounded-full', compact ? 'size-8' : 'size-11', b.earned ? clsx('bg-gradient-to-br shadow-inner', BADGE_TONE[b.icon]) : 'bg-soft text-ash/50')}>
              <Icon size={compact ? 15 : 20} strokeWidth={b.earned ? 2.2 : 1.8} />
            </span>
            <span className={clsx('font-display font-semibold leading-tight', compact ? 'text-[10px]' : 'text-xs', !b.earned && 'text-ash')}>{b.label}</span>
            {!compact && <span className="text-[10px] leading-tight text-ash">{b.earned ? 'Earned' : b.progress}</span>}
          </motion.div>
        )
      })}
    </div>
  )
}

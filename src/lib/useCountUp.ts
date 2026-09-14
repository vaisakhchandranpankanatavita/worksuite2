import { useEffect, useRef, useState } from 'react'

/**
 * Animates a number from 0 → `end` on mount.
 * Returns a formatted string so it can drive values like "6", "6.8%", "2.9 yrs".
 */
export function useCountUp(end: number, { duration = 1100, decimals = 0, suffix = '', prefix = '', start = 0 }: { duration?: number; decimals?: number; suffix?: string; prefix?: string; start?: number } = {}) {
  const [value, setValue] = useState(start)
  const raf = useRef<number>()

  useEffect(() => {
    const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced) {
      setValue(end)
      return
    }
    const t0 = performance.now()
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / duration)
      // easeOutExpo for a lively-then-settling count
      const eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p)
      setValue(start + (end - start) * eased)
      if (p < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current)
    }
  }, [end, duration, start])

  return `${prefix}${value.toFixed(decimals)}${suffix}`
}

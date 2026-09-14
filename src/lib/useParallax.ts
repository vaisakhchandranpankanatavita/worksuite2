import { useEffect, useRef, useState } from 'react'

/**
 * useParallax — lightweight scroll-parallax hook.
 *
 * Returns a CSS transform string that moves the element at `speed` fraction
 * of the page scroll position (0 = pinned, 1 = moves with scroll, 0.3 = 30%).
 *
 * Automatically pauses when `prefers-reduced-motion: reduce` is set.
 *
 * @param speed  multiplier (0–1). Positive = slower than scroll (move up).
 *               Negative = moves in opposite direction.
 * @param axis   'Y' (default) | 'X'
 */
export function useParallax(speed = 0.3, axis: 'X' | 'Y' = 'Y') {
  const [offset, setOffset] = useState(0)
  const rafRef = useRef<number | null>(null)
  const scrollRef = useRef(0)

  useEffect(() => {
    // Respect reduced-motion preference
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mq.matches) return

    const onScroll = () => {
      scrollRef.current = window.scrollY
    }

    const tick = () => {
      setOffset(scrollRef.current * speed)
      rafRef.current = requestAnimationFrame(tick)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    rafRef.current = requestAnimationFrame(tick)

    const onChange = (e: MediaQueryListEvent) => {
      if (e.matches && rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
        setOffset(0)
      }
    }
    mq.addEventListener('change', onChange)

    return () => {
      window.removeEventListener('scroll', onScroll)
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
      mq.removeEventListener('change', onChange)
    }
  }, [speed])

  const transform =
    axis === 'Y' ? `translateY(${offset.toFixed(2)}px)` : `translateX(${offset.toFixed(2)}px)`

  return { transform, offset }
}

/**
 * useScrollY — raw scroll offset with RAF smoothing.
 * Useful when you want to drive multiple parallax layers from one listener.
 */
export function useScrollY() {
  const [scrollY, setScrollY] = useState(0)
  const rafRef = useRef<number | null>(null)
  const rawRef = useRef(0)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mq.matches) return

    const onScroll = () => { rawRef.current = window.scrollY }
    const tick = () => {
      setScrollY(rawRef.current)
      rafRef.current = requestAnimationFrame(tick)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    rafRef.current = requestAnimationFrame(tick)

    return () => {
      window.removeEventListener('scroll', onScroll)
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return scrollY
}

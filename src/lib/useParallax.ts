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
  const tickingRef = useRef(false)

  useEffect(() => {
    // Respect reduced-motion preference
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mq.matches) return

    // Coalesce scroll events into at most one state update per animation
    // frame, and only while the page is actually scrolling — avoids a
    // perpetual 60fps re-render loop that fights other work for frame time.
    const update = () => {
      setOffset(window.scrollY * speed)
      tickingRef.current = false
    }

    const onScroll = () => {
      if (!tickingRef.current) {
        tickingRef.current = true
        requestAnimationFrame(update)
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    update()

    const onChange = (e: MediaQueryListEvent) => {
      if (e.matches) setOffset(0)
    }
    mq.addEventListener('change', onChange)

    return () => {
      window.removeEventListener('scroll', onScroll)
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
  const tickingRef = useRef(false)

  useEffect(() => {
    const update = () => {
      setScrollY(window.scrollY)
      tickingRef.current = false
    }

    const onScroll = () => {
      if (!tickingRef.current) {
        tickingRef.current = true
        requestAnimationFrame(update)
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true })

    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return scrollY
}

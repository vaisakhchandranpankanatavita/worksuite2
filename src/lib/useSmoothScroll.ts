import { useEffect } from 'react'

/**
 * Slows and eases mouse-wheel scrolling on the main window, instead of the
 * browser's instant per-tick jump. Skips reduced-motion users and leaves
 * nested scrollable areas (modals, dropdowns, .scroll-thin lists) untouched
 * so their native scroll behavior isn't affected.
 */
export function useSmoothScroll() {
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mq.matches) return

    let target = window.scrollY
    let current = window.scrollY
    let rafId: number | null = null

    const isNestedScrollable = (node: EventTarget | null) => {
      let el = node instanceof Element ? node : null
      while (el && el !== document.body) {
        const style = getComputedStyle(el)
        if (/(auto|scroll)/.test(style.overflowY) && el.scrollHeight > el.clientHeight) return true
        el = el.parentElement
      }
      return false
    }

    const step = () => {
      current += (target - current) * 0.15
      if (Math.abs(target - current) < 0.5) {
        current = target
        window.scrollTo(0, current)
        rafId = null
        return
      }
      window.scrollTo(0, current)
      rafId = requestAnimationFrame(step)
    }

    const onWheel = (e: WheelEvent) => {
      if (isNestedScrollable(e.target)) return
      e.preventDefault()
      const max = document.documentElement.scrollHeight - window.innerHeight
      target = Math.min(Math.max(target + e.deltaY * 0.5, 0), Math.max(max, 0))
      if (rafId == null) rafId = requestAnimationFrame(step)
    }

    const syncTarget = () => { target = window.scrollY; current = window.scrollY }
    window.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('resize', syncTarget)

    return () => {
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('resize', syncTarget)
      if (rafId != null) cancelAnimationFrame(rafId)
    }
  }, [])
}

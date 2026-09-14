import { useCountUp } from '../lib/useCountUp'

/** Renders a number that counts up from 0 on mount. Parses a leading number out of `value`. */
export function CountUp({ value, duration = 1100, className }: { value: string | number; duration?: number; className?: string }) {
  const raw = String(value)
  const match = raw.match(/-?\d+(\.\d+)?/)
  const num = match ? parseFloat(match[0]) : 0
  const decimals = match && match[0].includes('.') ? match[0].split('.')[1].length : 0
  const prefix = match ? raw.slice(0, match.index) : ''
  const suffix = match ? raw.slice((match.index ?? 0) + match[0].length) : ''
  const text = useCountUp(num, { decimals, prefix, suffix, duration })
  if (!match) return <span className={className}>{raw}</span>
  return <span className={className} style={{ fontVariantNumeric: 'tabular-nums' }}>{text}</span>
}

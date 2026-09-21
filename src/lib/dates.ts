/**
 * Day-number date maths for the Projects module.
 * Dates are stored as local `YYYY-MM-DD` strings; all arithmetic happens on integer
 * day numbers (days since epoch, timezone-free) so schedules never drift by an hour or a DST shift.
 */
export const DAY = 864e5

const pad = (n: number) => String(n).padStart(2, '0')

/** Local calendar date → `YYYY-MM-DD`. */
export const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

/** `YYYY-MM-DD` → integer day number. */
export function toDay(s: string): number {
  const [y, m, d] = s.split('-').map(Number)
  return Math.round(Date.UTC(y, m - 1, d) / DAY)
}

/** Integer day number → `YYYY-MM-DD`. */
export function fromDay(n: number): string {
  const d = new Date(n * DAY)
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}

export const todayDay = () => toDay(ymd(new Date()))

export const isWeekday = (day: number) => {
  const w = new Date(day * DAY).getUTCDay()
  return w !== 0 && w !== 6
}

/** e.g. "14 Oct" */
export const dayLabel = (day: number) =>
  new Date(day * DAY).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', timeZone: 'UTC' })

/** e.g. "14 Oct 2026" */
export const dayLabelFull = (day: number) =>
  new Date(day * DAY).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })

export const monthLabelOf = (day: number) =>
  new Date(day * DAY).toLocaleDateString('en-IN', { month: 'short', timeZone: 'UTC' })

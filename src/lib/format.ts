/** Currency and number locale come from the company's configuration (set on sign-in by data/hydrate). */
let money = { currency: 'INR', locale: 'en-IN' }
let moneyFmt = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
let numFmt = new Intl.NumberFormat('en-IN')

export function setMoneyFormat(currency: string, locale: string) {
  money = { currency, locale }
  moneyFmt = new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 0 })
  numFmt = new Intl.NumberFormat(locale)
}

/** The currency's symbol, e.g. "₹" or "$" — for labels like "Cost (₹)". */
export const currencySymbol = () =>
  new Intl.NumberFormat(money.locale, { style: 'currency', currency: money.currency }).formatToParts(0).find((p) => p.type === 'currency')?.value ?? money.currency

export const fmtMoney = (n: number) => moneyFmt.format(Math.round(n))
export const fmtNum = (n: number) => numFmt.format(Math.round(n))

/** Compact amounts: ₹4.2L / ₹1.35Cr for rupees, the locale's own short form (e.g. $4.2M) otherwise. */
export function fmtCompact(n: number) {
  if (money.currency !== 'INR') {
    return new Intl.NumberFormat(money.locale, { style: 'currency', currency: money.currency, notation: 'compact', maximumFractionDigits: 1 }).format(n)
  }
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  if (abs >= 1e7) return `${sign}₹${(abs / 1e7).toFixed(2)}Cr`
  if (abs >= 1e5) return `${sign}₹${(abs / 1e5).toFixed(1)}L`
  if (abs >= 1e3) return `${sign}₹${(abs / 1e3).toFixed(1)}K`
  return `${sign}₹${abs}`
}

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

export const fmtShortDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })

export const initials = (name: string) =>
  name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()

/** Seeded PRNG so the demo data is identical on every load. */
export function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

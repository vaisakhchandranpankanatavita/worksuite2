/** Straight-line depreciation over a fixed useful life (months), floored at a residual %. */
const USEFUL_LIFE_MONTHS = 48
const RESIDUAL_PCT = 0.05

export function monthsBetween(from: string | Date, to: Date = new Date()) {
  const a = new Date(from)
  return Math.max(0, (to.getFullYear() - a.getFullYear()) * 12 + (to.getMonth() - a.getMonth()))
}

export function bookValue(cost: number, purchaseDate: string, asOf: Date = new Date()) {
  const elapsed = monthsBetween(purchaseDate, asOf)
  const residual = cost * RESIDUAL_PCT
  const depreciable = cost - residual
  const remaining = Math.max(0, 1 - elapsed / USEFUL_LIFE_MONTHS)
  return Math.round(residual + depreciable * remaining)
}

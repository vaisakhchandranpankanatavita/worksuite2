/**
 * Loads the app's data from the API before first render.
 *
 * Pages import data straight from `data/mock` (`employees`, `budgets`, …), so the server's values are
 * written into those same exported arrays/objects in place — every existing import sees them. If the
 * API is unreachable the app keeps running on the built-in demo data.
 */
import { api, connection } from '../lib/api'
import { appSettings, collectionSources, datasetSources } from './registry'

function replaceInPlace(target: unknown, value: unknown) {
  if (Array.isArray(target) && Array.isArray(value)) {
    target.splice(0, target.length, ...value)
  } else if (target && typeof target === 'object' && value && typeof value === 'object') {
    for (const k of Object.keys(target)) delete (target as Record<string, unknown>)[k]
    Object.assign(target, value)
  }
}

export async function hydrateFromApi(timeoutMs = 5000): Promise<boolean> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const data = await api.bootstrap(ctrl.signal)
    for (const [name, target] of Object.entries(collectionSources)) {
      const rows = data.collections[name as keyof typeof collectionSources]
      if (rows) replaceInPlace(target, rows)
    }
    for (const [name, target] of Object.entries(datasetSources)) {
      const value = data.datasets[name as keyof typeof datasetSources]
      if (value !== undefined) replaceInPlace(target, value)
    }
    for (const key of Object.keys(appSettings) as (keyof typeof appSettings)[]) {
      const value = data.settings[key]
      if (value !== undefined) (appSettings as Record<string, unknown>)[key] = value
    }
    connection.online = true
    return true
  } catch (err) {
    console.warn('[worksuite] API unavailable — running on built-in demo data. Changes will not be saved.', err)
    return false
  } finally {
    clearTimeout(timer)
  }
}

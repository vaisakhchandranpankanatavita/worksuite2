/**
 * Seeds the database from the app's current demo data (src/data/*). The generators use fixed PRNG
 * seeds, so the records are the same ones the UI shipped with; dates are relative to the day of seeding.
 *
 * `npm run seed` (server/seed-cli.ts) wipes and re-seeds; the server seeds an empty database on start.
 */
import { COLLECTIONS, type Collection, type Doc, type Store } from './db'
import { collectionSources, datasetSources, appSettings } from '../src/data/registry'

/** JSON round-trip drops `undefined` fields and gives the stored shape exactly what the API will return. */
const plain = <T,>(v: T): T => JSON.parse(JSON.stringify(v))

export function seedDatabase(store: Store) {
  const counts: Record<string, number> = {}
  store.tx(() => {
    for (const name of Object.keys(COLLECTIONS) as Collection[]) {
      const docs = plain(collectionSources[name]) as Doc[]
      store.replaceAll(name, docs)
      counts[name] = docs.length
    }
    store.db.exec('DELETE FROM datasets; DELETE FROM settings;')
    for (const [key, value] of Object.entries(datasetSources)) store.setJson('datasets', key, plain(value))
    for (const [key, value] of Object.entries(appSettings)) store.setJson('settings', key, plain(value))
    store.setMeta('seededAt', new Date().toISOString())
  })
  return counts
}

/** Seeds only when the database is empty — used on server start. */
export function ensureSeeded(store: Store) {
  if (store.getMeta('seededAt')) return null
  return seedDatabase(store)
}

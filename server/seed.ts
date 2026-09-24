/**
 * Seeds the database from the app's current demo data (src/data/*). The generators use fixed PRNG
 * seeds, so the records are the same ones the UI shipped with; dates are relative to the day of seeding.
 *
 * `npm run seed` (server/seed-cli.ts) wipes and re-seeds data and accounts; the server fills in an empty database on start.
 */
import { COLLECTIONS, type Collection, type Doc, type Store } from './db'
import { collectionSources, datasetSources, appSettings } from '../src/data/registry'
import { ROLES } from '../src/data/roles'
import { hashPassword } from './auth'

/** Password for the seeded demo accounts (override with WORKSUITE_DEMO_PASSWORD). */
export const DEMO_PASSWORD = process.env.WORKSUITE_DEMO_PASSWORD ?? 'demo1234'

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

/** One sign-in account per role (Super Admin, HR, Finance, Production, Project Director). Signs everyone out. */
export function seedUsers(store: Store) {
  const users = ROLES.map((r) => ({
    id: `U-${r.id}`, email: r.email, name: r.name, role: r.id, label: r.label, description: r.description,
    modules: r.modules, photo: r.photo, hue: r.hue, passwordHash: hashPassword(DEMO_PASSWORD),
  }))
  store.tx(() => store.replaceUsers(users))
  return users.length
}

/** Fills in whatever is missing (data and/or accounts) — used on server start. */
export function ensureSeeded(store: Store) {
  const users = store.listUsers().length === 0 ? seedUsers(store) : 0
  const data = store.getMeta('seededAt') ? null : seedDatabase(store)
  return users || data ? { users, data } : null
}

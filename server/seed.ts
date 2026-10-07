/**
 * Seeds the database from the app's current demo data (src/data/*). The generators use fixed PRNG
 * seeds, so the records are the same ones the UI shipped with; dates are relative to the day of seeding.
 *
 * `npm run seed` (server/seed-cli.ts) wipes and re-seeds data and accounts; the server fills in an empty database on start.
 */
import { COLLECTIONS, type Collection, type Doc, type Store } from './db.js'
import { collectionSources, datasetSources, appSettings } from '../src/data/registry.js'
import { randomBytes } from 'node:crypto'
import { hashPassword } from './auth.js'
import { isConfigSetting } from './access.js'

/** JSON round-trip drops `undefined` fields and gives the stored shape exactly what the API will return. */
const plain = <T,>(v: T): T => JSON.parse(JSON.stringify(v))

export async function seedDatabase(store: Store) {
  const counts: Record<string, number> = {}
  await store.tx(async () => {
    for (const name of Object.keys(COLLECTIONS) as Collection[]) {
      const docs = plain(collectionSources[name]) as Doc[]
      await store.replaceAll(name, docs)
      counts[name] = docs.length
    }
    // Company configuration is the superadmin's, not demo data — a reseed keeps what they set up.
    const kept = Object.entries(await store.allJson('settings')).filter(([k]) => isConfigSetting(k))
    await store.clearTable('datasets')
    await store.clearTable('settings')
    for (const [key, value] of Object.entries(datasetSources)) await store.setJson('datasets', key, plain(value))
    for (const [key, value] of Object.entries(appSettings)) await store.setJson('settings', key, plain(value))
    for (const [key, value] of kept) await store.setJson('settings', key, value)
    await store.setMeta('seededAt', new Date().toISOString())
  })
  return counts
}

/**
 * A fresh database gets exactly one account, the superadmin, who creates everyone else. The password comes
 * from SUPERADMIN_PASSWORD; without it a random one is generated and printed once (it is never stored in clear).
 */
export async function bootstrapSuperadmin(store: Store): Promise<{ email: string; password?: string } | null> {
  if ((await store.countUsers()) > 0) return null
  const email = process.env.SUPERADMIN_EMAIL?.trim() || 'superadmin@worksuite.local'
  const generated = process.env.SUPERADMIN_PASSWORD ? undefined : randomBytes(9).toString('base64url')
  try {
    await store.createUser({
      id: 'U-superadmin', email, passwordHash: hashPassword(process.env.SUPERADMIN_PASSWORD ?? generated!),
      name: 'Super Admin', label: 'Super Admin', description: 'Manages users, access and company configuration',
      modules: ['hr', 'finance', 'assets', 'projects'], readOnly: [], isSuperadmin: true, hue: 200,
    })
  } catch {
    return null // another instance created it first
  }
  return { email, password: generated }
}

/** Fills in whatever is missing (data and/or the superadmin) — used on server start. */
export async function ensureSeeded(store: Store) {
  const superadmin = await bootstrapSuperadmin(store)
  const data = (await store.getMeta('seededAt')) ? null : await seedDatabase(store)
  return superadmin || data ? { superadmin, data } : null
}

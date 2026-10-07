import { openDb } from './db.js'
import { seedDatabase } from './seed.js'

// Resets business data to the demo data. Accounts and company configuration are kept
// (a brand-new database gets its superadmin the first time the server starts).
const store = openDb()
const counts = await seedDatabase(store)
await store.close()
const target = (process.env.DATABASE_URL ?? '').replace(/:\/\/([^:]+):[^@]+@/, '://$1:***@')
console.log(`Seeded ${target}`)
for (const [name, n] of Object.entries(counts)) console.log(`  ${name.padEnd(22)} ${n}`)

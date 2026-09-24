import { openDb } from './db.js'
import { DEMO_PASSWORD, seedDatabase, seedUsers } from './seed.js'

const store = openDb()
const counts = await seedDatabase(store)
const users = await seedUsers(store)
await store.close()
const target = (process.env.DATABASE_URL ?? '').replace(/:\/\/([^:]+):[^@]+@/, '://$1:***@')
console.log(`Seeded ${target}`)
for (const [name, n] of Object.entries(counts)) console.log(`  ${name.padEnd(22)} ${n}`)
console.log(`  ${'users'.padEnd(22)} ${users}  (password: ${DEMO_PASSWORD})`)

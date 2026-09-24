import { openDb } from './db'
import { DEMO_PASSWORD, seedDatabase, seedUsers } from './seed'

const store = openDb()
const counts = await seedDatabase(store)
const users = await seedUsers(store)
await store.close()
console.log(`Seeded ${process.env.DATABASE_URL}`)
for (const [name, n] of Object.entries(counts)) console.log(`  ${name.padEnd(22)} ${n}`)
console.log(`  ${'users'.padEnd(22)} ${users}  (password: ${DEMO_PASSWORD})`)

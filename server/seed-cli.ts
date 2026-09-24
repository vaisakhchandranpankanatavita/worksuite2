import { DB_PATH, openDb } from './db'
import { DEMO_PASSWORD, seedDatabase, seedUsers } from './seed'

const store = openDb()
const counts = seedDatabase(store)
const users = seedUsers(store)
store.db.close()
console.log(`Seeded ${DB_PATH}`)
for (const [name, n] of Object.entries(counts)) console.log(`  ${name.padEnd(22)} ${n}`)
console.log(`  ${'users'.padEnd(22)} ${users}  (password: ${DEMO_PASSWORD})`)

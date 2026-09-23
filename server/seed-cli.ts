import { DB_PATH, openDb } from './db'
import { seedDatabase } from './seed'

const counts = seedDatabase(openDb())
console.log(`Seeded ${DB_PATH}`)
for (const [name, n] of Object.entries(counts)) console.log(`  ${name.padEnd(22)} ${n}`)

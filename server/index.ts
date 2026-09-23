import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createApp } from './app'
import { DB_PATH, openDb } from './db'
import { ensureSeeded } from './seed'

const PORT = Number(process.env.PORT ?? 4000)
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const store = openDb()
const seeded = ensureSeeded(store)
if (seeded) console.log(`[api] empty database — seeded from demo data (${Object.values(seeded).reduce((a, b) => a + b, 0)} records)`)

createApp(store, { staticDir: resolve(root, 'dist') }).listen(PORT, () => {
  console.log(`[api] Worksuite API on http://localhost:${PORT}/api  (db: ${DB_PATH})`)
})

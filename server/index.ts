import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createApp } from './app.js'
import { openDb } from './db.js'
import { ensureSeeded } from './seed.js'

const PORT = Number(process.env.PORT ?? 4000)
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const store = openDb()
const seeded = await ensureSeeded(store)
if (seeded?.data) console.log(`[api] empty database — seeded from demo data (${Object.values(seeded.data).reduce((a, b) => a + b, 0)} records)`)
if (seeded?.users) console.log(`[api] created ${seeded.users} demo sign-in accounts`)

createApp(store, { staticDir: resolve(root, 'dist') }).listen(PORT, () => {
  console.log(`[api] Worksuite API on http://localhost:${PORT}/api`)
})

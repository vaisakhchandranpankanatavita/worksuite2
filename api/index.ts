/**
 * Vercel serverless entry point. vercel.json rewrites every /api/* request here, which hands it to
 * the same Express app used locally (server/app.ts). The app + DB pool are built once and reused
 * across warm invocations.
 */
import type { IncomingMessage, ServerResponse } from 'node:http'
import { createApp } from '../server/app.js'
import { openDb } from '../server/db.js'
import { ensureSeeded } from '../server/seed.js'

let appPromise: ReturnType<typeof buildApp> | null = null

async function buildApp() {
  const store = openDb()
  const seeded = await ensureSeeded(store)
  // The only place a generated superadmin password is ever shown — it lands in the function logs.
  if (seeded?.superadmin) console.log(`[api] created the superadmin account: ${seeded.superadmin.email}${seeded.superadmin.password ? `  password: ${seeded.superadmin.password}` : ''}`)
  return createApp(store)
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  appPromise ??= buildApp()
  const app = await appPromise
  app(req as never, res as never)
}

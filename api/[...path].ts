/**
 * Vercel serverless entry point: catches every /api/* request and hands it to the same Express app
 * used locally (server/app.ts). The app + DB pool are built once and reused across warm invocations.
 */
import type { IncomingMessage, ServerResponse } from 'node:http'
import { createApp } from '../server/app'
import { openDb } from '../server/db'
import { ensureSeeded } from '../server/seed'

let appPromise: ReturnType<typeof buildApp> | null = null

async function buildApp() {
  const store = openDb()
  await ensureSeeded(store)
  return createApp(store)
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  appPromise ??= buildApp()
  const app = await appPromise
  app(req as never, res as never)
}

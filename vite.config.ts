import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/** Serves the Worksuite API (server/) from the dev server at /api, so `npm run dev` runs the whole app. */
function worksuiteApi(): Plugin {
  return {
    name: 'worksuite-api',
    apply: 'serve',
    async configureServer(server) {
      // Vite only exposes VITE_* values to the app; the API needs DATABASE_URL, SUPERADMIN_* etc. from .env (real env vars win).
      for (const [k, v] of Object.entries(loadEnv(server.config.mode, server.config.envDir || process.cwd(), ''))) process.env[k] ??= v
      const { openDb } = await import('./server/db')
      const { ensureSeeded } = await import('./server/seed')
      const { createApp } = await import('./server/app')
      const store = openDb()
      const seeded = await ensureSeeded(store)
      if (seeded?.data) server.config.logger.info('[api] empty database — seeded from demo data')
      if (seeded?.superadmin) {
        const { email, password } = seeded.superadmin
        server.config.logger.info(`[api] created the superadmin account: ${email}${password ? `  password: ${password}  (generated — shown once; set SUPERADMIN_PASSWORD to choose your own)` : ''}`)
      }
      const app = createApp(store)
      server.middlewares.use((req, res, next) => (req.url?.startsWith('/api') ? app(req as never, res as never, next) : next()))
    },
  }
}

export default defineConfig({
  plugins: [worksuiteApi(), react(), tailwindcss()],
})

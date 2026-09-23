import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/** Serves the Worksuite API (server/) from the dev server at /api, so `npm run dev` runs the whole app. */
function worksuiteApi(): Plugin {
  return {
    name: 'worksuite-api',
    apply: 'serve',
    async configureServer(server) {
      const { openDb } = await import('./server/db')
      const { ensureSeeded } = await import('./server/seed')
      const { createApp } = await import('./server/app')
      const store = openDb()
      if (ensureSeeded(store)) server.config.logger.info('[api] empty database — seeded from demo data')
      const app = createApp(store)
      server.middlewares.use((req, res, next) => (req.url?.startsWith('/api') ? app(req as never, res as never, next) : next()))
    },
  }
}

export default defineConfig({
  plugins: [worksuiteApi(), react(), tailwindcss()],
})

import express, { type NextFunction, type Request, type Response } from 'express'
import { existsSync } from 'node:fs'
import { COLLECTIONS, HttpError, isCollection, type Collection, type Doc, type Store } from './db'
import { seedDatabase } from './seed'
import { appSettings } from '../src/data/registry'

const isSetting = (k: string): k is keyof typeof appSettings => Object.hasOwn(appSettings, k)
const isPlainObject = (v: unknown): v is Doc => typeof v === 'object' && v !== null && !Array.isArray(v)

function collectionParam(req: Request): Collection {
  const c = req.params.collection
  if (!isCollection(c)) throw new HttpError(404, `Unknown collection "${c}"`)
  return c
}

function body(req: Request): Doc {
  if (!isPlainObject(req.body)) throw new HttpError(400, 'Expected a JSON object body')
  return req.body
}

/** Exact-match filtering on top-level fields, e.g. GET /api/assets?status=Available&assignedTo=E1004 */
function filter(docs: Doc[], query: Request['query']) {
  const pairs = Object.entries(query).filter(([k, v]) => typeof v === 'string' && !k.startsWith('_')) as [string, string][]
  if (pairs.length === 0) return docs
  return docs.filter((d) => pairs.every(([k, v]) => d[k] !== undefined && String(d[k]) === v))
}

export function createApp(store: Store, opts: { staticDir?: string } = {}) {
  const app = express()
  app.disable('x-powered-by')
  app.use(express.json({ limit: '5mb' }))

  const api = express.Router()

  api.get('/health', (_req, res) => {
    res.json({ ok: true, seededAt: store.getMeta('seededAt') ?? null })
  })

  /** Everything the client needs to start, in one round-trip. */
  api.get('/bootstrap', (_req, res) => {
    const collections = Object.fromEntries((Object.keys(COLLECTIONS) as Collection[]).map((c) => [c, store.list(c)]))
    res.json({ seededAt: store.getMeta('seededAt') ?? null, collections, datasets: store.allJson('datasets'), settings: store.allJson('settings') })
  })

  api.get('/datasets', (_req, res) => res.json(store.allJson('datasets')))
  api.get('/datasets/:key', (req, res) => {
    const v = store.getJson('datasets', req.params.key)
    if (v === undefined) throw new HttpError(404, `Unknown dataset "${req.params.key}"`)
    res.json(v)
  })

  api.get('/settings', (_req, res) => res.json(store.allJson('settings')))
  api.get('/settings/:key', (req, res) => {
    if (!isSetting(req.params.key)) throw new HttpError(404, `Unknown setting "${req.params.key}"`)
    res.json({ value: store.getJson('settings', req.params.key) ?? null })
  })
  api.put('/settings/:key', (req, res) => {
    const key = req.params.key
    if (!isSetting(key)) throw new HttpError(404, `Unknown setting "${key}"`)
    const value = body(req).value
    if (value === undefined) throw new HttpError(400, 'Expected { "value": … }')
    if (key === 'payrollStatus' && !['Draft', 'Processing', 'Paid'].includes(value as string)) throw new HttpError(400, 'Invalid payroll status')
    if (key === 'expenseTrackCategories' && !(Array.isArray(value) && value.every((v) => typeof v === 'string'))) throw new HttpError(400, 'Expected an array of strings')
    store.setJson('settings', key, value)
    res.json({ value })
  })

  /** Wipe all data and restore the original demo data. */
  api.post('/admin/reseed', (_req, res) => {
    res.json({ ok: true, counts: seedDatabase(store) })
  })

  api.get('/:collection', (req, res) => {
    res.json(filter(store.list(collectionParam(req)), req.query))
  })

  api.get('/:collection/:id', (req, res) => {
    const c = collectionParam(req)
    const doc = store.get(c, req.params.id)
    if (!doc) throw new HttpError(404, `${c}/${req.params.id} not found`)
    res.json(doc)
  })

  /** Create. `?at=end` appends instead of prepending. */
  api.post('/:collection', (req, res) => {
    const c = collectionParam(req)
    res.status(201).json(store.insert(c, body(req), req.query.at === 'end' ? 'end' : 'start'))
  })

  api.put('/:collection/:id', (req, res) => {
    res.json(store.put(collectionParam(req), req.params.id, body(req)))
  })

  api.patch('/:collection/:id', (req, res) => {
    res.json(store.patch(collectionParam(req), req.params.id, body(req)))
  })

  api.delete('/:collection/:id', (req, res) => {
    const c = collectionParam(req)
    if (!store.remove(c, req.params.id)) throw new HttpError(404, `${c}/${req.params.id} not found`)
    res.status(204).end()
  })

  app.use('/api', api)
  app.use('/api', (_req, _res, next) => next(new HttpError(404, 'Not found')))

  // Serve the built front-end (npm run build) when present, so one process can run the whole app.
  if (opts.staticDir && existsSync(opts.staticDir)) app.use(express.static(opts.staticDir))

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof HttpError) return res.status(err.status).json({ error: err.message })
    if (err instanceof SyntaxError && 'body' in err) return res.status(400).json({ error: 'Malformed JSON' })
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  })

  return app
}

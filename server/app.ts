import express, { type NextFunction, type Request, type Response } from 'express'
import { existsSync } from 'node:fs'
import { canReadCollection, canReadDataset, canReadSetting, canWriteCollection, canWriteSetting } from './access'
import { login, logout, currentUser, requireAuth } from './auth'
import { COLLECTIONS, HttpError, isCollection, type Collection, type Doc, type PublicUser, type Store } from './db'
import { seedDatabase } from './seed'
import { appSettings } from '../src/data/registry'

const isSetting = (k: string): k is keyof typeof appSettings => Object.hasOwn(appSettings, k)
const isPlainObject = (v: unknown): v is Doc => typeof v === 'object' && v !== null && !Array.isArray(v)

const userOf = (req: Request): PublicUser => req.user!

function forbidden(what: string): never {
  throw new HttpError(403, `Your role doesn't have access to ${what}`)
}

/** Resolves `:collection` and checks the signed-in role may read (or write) it. */
function collectionParam(req: Request, mode: 'read' | 'write'): Collection {
  const c = req.params.collection
  if (!isCollection(c)) throw new HttpError(404, `Unknown collection "${c}"`)
  const { modules } = userOf(req)
  if (!canReadCollection(modules, c)) forbidden(c)
  if (mode === 'write' && !canWriteCollection(modules, c)) throw new HttpError(403, `Your role can view ${c} but not change them`)
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
  app.set('trust proxy', 'loopback')
  app.use(express.json({ limit: '5mb' }))

  const api = express.Router()

  /* ── Public ── */

  api.get('/health', (_req, res) => {
    res.json({ ok: true, seededAt: store.getMeta('seededAt') ?? null })
  })

  /** Demo accounts for the sign-in screen's quick-fill (no secrets). Set WORKSUITE_DEMO_ACCOUNTS=off to hide them. */
  api.get('/auth/accounts', (_req, res) => {
    if (process.env.WORKSUITE_DEMO_ACCOUNTS === 'off') return void res.json([])
    res.json(store.listUsers().map(({ id, email, name, label, description, photo, hue, role }) => ({ id, email, name, label, description, photo, hue, role })))
  })

  api.post('/auth/login', (req, res) => {
    const { email, password } = body(req)
    if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) throw new HttpError(400, 'Email and password are required')
    res.json({ user: login(store, req, res, email, password) })
  })

  api.post('/auth/logout', (req, res) => {
    logout(store, req, res)
    res.status(204).end()
  })

  api.get('/auth/me', (req, res) => {
    const user = currentUser(store, req)
    if (!user) throw new HttpError(401, 'Not signed in')
    res.json({ user })
  })

  /* ── Everything below needs a session ── */
  api.use(requireAuth(store))

  /** Everything the signed-in role may see, in one round-trip. */
  api.get('/bootstrap', (req, res) => {
    const user = userOf(req)
    const collections = Object.fromEntries(
      (Object.keys(COLLECTIONS) as Collection[]).filter((c) => canReadCollection(user.modules, c)).map((c) => [c, store.list(c)]),
    )
    const datasets = Object.fromEntries(Object.entries(store.allJson('datasets')).filter(([k]) => canReadDataset(user.modules, k)))
    const settings = Object.fromEntries(Object.entries(store.allJson('settings')).filter(([k]) => canReadSetting(user.modules, k)))
    res.json({ user, seededAt: store.getMeta('seededAt') ?? null, collections, datasets, settings })
  })

  api.get('/datasets', (req, res) => {
    res.json(Object.fromEntries(Object.entries(store.allJson('datasets')).filter(([k]) => canReadDataset(userOf(req).modules, k))))
  })
  api.get('/datasets/:key', (req, res) => {
    const key = req.params.key
    const v = store.getJson('datasets', key)
    if (v === undefined) throw new HttpError(404, `Unknown dataset "${key}"`)
    if (!canReadDataset(userOf(req).modules, key)) forbidden(key)
    res.json(v)
  })

  api.get('/settings', (req, res) => {
    res.json(Object.fromEntries(Object.entries(store.allJson('settings')).filter(([k]) => canReadSetting(userOf(req).modules, k))))
  })
  api.get('/settings/:key', (req, res) => {
    const key = req.params.key
    if (!isSetting(key)) throw new HttpError(404, `Unknown setting "${key}"`)
    if (!canReadSetting(userOf(req).modules, key)) forbidden(key)
    res.json({ value: store.getJson('settings', key) ?? null })
  })
  api.put('/settings/:key', (req, res) => {
    const key = req.params.key
    if (!isSetting(key)) throw new HttpError(404, `Unknown setting "${key}"`)
    if (!canWriteSetting(userOf(req).modules, key)) forbidden(`change ${key}`)
    const value = body(req).value
    if (value === undefined) throw new HttpError(400, 'Expected { "value": … }')
    if (key === 'payrollStatus' && !['Draft', 'Processing', 'Paid'].includes(value as string)) throw new HttpError(400, 'Invalid payroll status')
    if (key === 'expenseTrackCategories' && !(Array.isArray(value) && value.every((v) => typeof v === 'string'))) throw new HttpError(400, 'Expected an array of strings')
    store.setJson('settings', key, value)
    res.json({ value })
  })

  /** Wipe all business data and restore the original demo data (accounts are kept). Super Admin only. */
  api.post('/admin/reseed', (req, res) => {
    if (userOf(req).role !== 'admin') forbidden('reset data')
    res.json({ ok: true, counts: seedDatabase(store) })
  })

  api.get('/:collection', (req, res) => {
    res.json(filter(store.list(collectionParam(req, 'read')), req.query))
  })

  api.get('/:collection/:id', (req, res) => {
    const c = collectionParam(req, 'read')
    const doc = store.get(c, req.params.id)
    if (!doc) throw new HttpError(404, `${c}/${req.params.id} not found`)
    res.json(doc)
  })

  /** Create. `?at=end` appends instead of prepending. */
  api.post('/:collection', (req, res) => {
    const c = collectionParam(req, 'write')
    res.status(201).json(store.insert(c, body(req), req.query.at === 'end' ? 'end' : 'start'))
  })

  api.put('/:collection/:id', (req, res) => {
    res.json(store.put(collectionParam(req, 'write'), req.params.id, body(req)))
  })

  api.patch('/:collection/:id', (req, res) => {
    res.json(store.patch(collectionParam(req, 'write'), req.params.id, body(req)))
  })

  api.delete('/:collection/:id', (req, res) => {
    const c = collectionParam(req, 'write')
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

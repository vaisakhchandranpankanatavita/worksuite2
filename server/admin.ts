/**
 * Superadmin-only account management: create users, choose which modules they can open (and whether they can
 * change data there), deactivate them, reset their password. Company configuration is saved through
 * `PUT /settings/:key` (see app.ts) and is superadmin-only too.
 */
import { randomBytes } from 'node:crypto'
import { Router, type NextFunction, type Request, type Response } from 'express'
import type { ModuleKey } from '../src/data/roles.js'
import { hashPassword } from './auth.js'
import { HttpError, type Doc, type PublicUser, type Store, type UserChanges } from './db.js'

const MODULES: ModuleKey[] = ['hr', 'finance', 'assets', 'projects']
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export const MIN_PASSWORD = 8

export const requireSuperadmin = (req: Request, _res: Response, next: NextFunction) =>
  next(req.user?.isSuperadmin ? undefined : new HttpError(403, 'Only the superadmin can do this'))

const wrap = (fn: (req: Request, res: Response) => Promise<void>) => (req: Request, res: Response, next: NextFunction) => {
  fn(req, res).catch(next)
}

const str = (v: unknown, what: string, max = 120) => {
  if (typeof v !== 'string' || !v.trim() || v.length > max) throw new HttpError(400, `${what} is required`)
  return v.trim()
}

function modulesOf(v: unknown): ModuleKey[] {
  if (!Array.isArray(v) || !v.every((m): m is ModuleKey => MODULES.includes(m))) throw new HttpError(400, 'Invalid modules')
  return MODULES.filter((m) => v.includes(m))
}

/** A user must be able to open at least one module, or there is nowhere for them to land after signing in. */
function accessModules(v: unknown): ModuleKey[] {
  const modules = modulesOf(v)
  if (modules.length === 0) throw new HttpError(400, 'Give the user access to at least one module')
  return modules
}

export function checkPassword(v: unknown): string {
  if (typeof v !== 'string' || v.length < MIN_PASSWORD) throw new HttpError(400, `Password must be at least ${MIN_PASSWORD} characters`)
  return v
}

export function adminRouter(store: Store) {
  const r = Router()
  const body = (req: Request): Doc => {
    if (typeof req.body !== 'object' || req.body === null || Array.isArray(req.body)) throw new HttpError(400, 'Expected a JSON object body')
    return req.body as Doc
  }
  /** Superadmin accounts are fixed: they can't be deactivated or have their access trimmed. */
  const editable = async (id: string): Promise<PublicUser> => {
    const u = await store.userById(id)
    if (!u) throw new HttpError(404, 'User not found')
    if (u.isSuperadmin) throw new HttpError(403, 'The superadmin account can’t be changed here')
    return u
  }

  r.get('/users', wrap(async (_req, res) => {
    res.json(await store.listUsers())
  }))

  r.post('/users', wrap(async (req, res) => {
    const b = body(req)
    const email = str(b.email, 'Email')
    if (!EMAIL.test(email)) throw new HttpError(400, 'Enter a valid email address')
    const modules = accessModules(b.modules)
    const readOnly = modulesOf(b.readOnly ?? []).filter((m) => modules.includes(m))
    const created = await store.createUser({
      id: `U-${randomBytes(6).toString('hex')}`,
      email,
      passwordHash: hashPassword(checkPassword(b.password)),
      name: str(b.name, 'Name'),
      label: typeof b.label === 'string' && b.label.trim() ? b.label.trim().slice(0, 60) : 'Team member',
      modules,
      readOnly,
      isSuperadmin: false,
      hue: Math.floor(Math.random() * 360),
    })
    res.status(201).json(created)
  }))

  r.patch('/users/:id', wrap(async (req, res) => {
    const target = await editable(req.params.id)
    const b = body(req)
    const changes: UserChanges = {}
    if (b.name !== undefined) changes.name = str(b.name, 'Name')
    if (b.label !== undefined) changes.label = str(b.label, 'Title', 60)
    if (b.email !== undefined) {
      const email = str(b.email, 'Email')
      if (!EMAIL.test(email)) throw new HttpError(400, 'Enter a valid email address')
      changes.email = email
    }
    if (b.modules !== undefined) changes.modules = accessModules(b.modules)
    if (b.readOnly !== undefined || b.modules !== undefined) {
      const modules = changes.modules ?? target.modules
      changes.readOnly = modulesOf(b.readOnly ?? target.readOnly).filter((m) => modules.includes(m))
    }
    if (b.active !== undefined) {
      if (typeof b.active !== 'boolean') throw new HttpError(400, 'active must be true or false')
      changes.active = b.active
    }
    const updated = await store.updateUser(target.id, changes)
    // Access changes apply on the user's next request; a deactivated account's sessions are removed outright.
    if (changes.active === false) await store.deleteUserSessions(target.id)
    res.json(updated)
  }))

  r.post('/users/:id/password', wrap(async (req, res) => {
    const target = await editable(req.params.id)
    await store.setPassword(target.id, hashPassword(checkPassword(body(req).password)))
    res.status(204).end()
  }))

  return r
}

/**
 * Thin client for the Worksuite API (server/). Writes go through a single queue so they reach the
 * server in the order the UI made them (e.g. a create before the update that follows it).
 */
import type { CollectionName, DatasetName, SettingName } from '../data/registry'
import type { ModuleKey } from '../data/roles'

const BASE = (import.meta.env?.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? '/api'

/** A write refused because someone else changed (current = their copy) or deleted (current = null) the record. */
export interface Conflict { collection: CollectionName; id: string; current: Record<string, unknown> | null }

export class ApiError extends Error {
  constructor(readonly status: number, message: string, readonly conflict?: Conflict) {
    super(message)
  }
}

async function request<T>(method: string, path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    signal,
    credentials: 'include',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (!res.ok) {
    const j = await res.json().catch(() => ({})) as { error?: string } & Partial<Conflict>
    // A 401 on anything but the sign-in calls means the session ended (expired or signed out elsewhere).
    if (res.status === 401 && !path.startsWith('/auth/')) unauthorizedListeners.forEach((fn) => fn())
    const conflict = res.status === 409 && j.collection && j.id && j.current !== undefined ? { collection: j.collection, id: j.id, current: j.current } : undefined
    throw new ApiError(res.status, j.error || res.statusText || `HTTP ${res.status}`, conflict)
  }
  return res.status === 204 ? (undefined as T) : res.json()
}

/** The signed-in account. Its `modules` decide what the app shows and what the API allows. */
export interface SessionUser {
  id: string
  email: string
  name: string
  role: string
  label: string
  description: string
  modules: ModuleKey[]
  /** Modules (subset of `modules`) the user can view but not change. */
  readOnly: ModuleKey[]
  isSuperadmin: boolean
  active: boolean
  photo?: string
  hue: number
}

export type DemoAccount = Pick<SessionUser, 'id' | 'email' | 'name' | 'label' | 'description' | 'photo' | 'hue' | 'role'>

export interface NewUserInput { name: string; email: string; password: string; label?: string; modules: ModuleKey[]; readOnly: ModuleKey[] }
export type UserPatch = Partial<Pick<SessionUser, 'name' | 'email' | 'label' | 'modules' | 'readOnly' | 'active'>>

export interface Bootstrap {
  user: SessionUser
  seededAt: string | null
  /** Only what the user's role may see — anything missing is off-limits. */
  collections: Partial<Record<CollectionName, unknown[]>>
  datasets: Partial<Record<DatasetName, unknown>>
  settings: Partial<Record<SettingName, unknown>>
}

const unauthorizedListeners = new Set<() => void>()
/** Subscribe to "the session has ended" (any 401 outside the sign-in calls). */
export const onUnauthorized = (fn: () => void) => {
  unauthorizedListeners.add(fn)
  return () => unauthorizedListeners.delete(fn)
}

let queue: Promise<unknown> = Promise.resolve()
const listeners = new Set<(err: ApiError | Error) => void>()

/** Subscribe to failed background writes (e.g. to show a toast). */
export const onWriteError = (fn: (err: ApiError | Error) => void) => {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

function enqueue<T>(run: () => Promise<T>): Promise<T> {
  const p = queue.then(run)
  queue = p.catch((err) => listeners.forEach((fn) => fn(err)))
  return p
}

const enc = encodeURIComponent

/*
 * Optimistic concurrency. The server hands out each record's revision as `_rev`; we keep it here (not in
 * the store) and send it back with every replace, so a write based on a stale copy is refused instead of
 * silently overwriting someone else's change. Writes are serial, so the rev is read when a write is sent,
 * after the previous write to the same record has returned its new rev.
 *
 * After a conflict the store is reset to the server's copy, and writes queued before that point are
 * dropped: they were computed from the stale copy. `generation` tells them apart.
 */
type Rec = Record<string, unknown>
const revs = new Map<string, number>()
const generation = new Map<string, number>()
const keyOf = (c: string, id: unknown) => `${c}/${String(id)}`
const recordId = (d: Rec) => d.id ?? d.name

/** Remember a record's revision and strip it, so it never enters app state. */
function absorb<T>(c: string, doc: T): T {
  if (!doc || typeof doc !== 'object') return doc
  const { _rev, ...rest } = doc as Rec
  if (typeof _rev === 'number') revs.set(keyOf(c, recordId(rest)), _rev)
  return rest as T
}

/** Take a server copy after a conflict: adopt its revision and cancel writes queued against the old one. */
export function acceptServerCopy(c: CollectionName, id: string, current: Rec | null): Rec | null {
  const key = keyOf(c, id)
  generation.set(key, (generation.get(key) ?? 0) + 1)
  if (!current) {
    revs.delete(key)
    return null
  }
  return absorb(c, current)
}

function replace<T>(c: CollectionName, id: string, doc: T) {
  const key = keyOf(c, id)
  const gen = generation.get(key) ?? 0
  return enqueue(async () => {
    if ((generation.get(key) ?? 0) !== gen) return doc // superseded by a server copy — nothing to send
    const rev = revs.get(key)
    const saved = await request<T>('PUT', `/${c}/${enc(id)}`, rev === undefined ? doc : { ...doc, _rev: rev })
    return absorb(c, saved)
  })
}

export const api = {
  login: (email: string, password: string) => request<{ user: SessionUser }>('POST', '/auth/login', { email, password }),
  logout: () => request<void>('POST', '/auth/logout'),
  me: () => request<{ user: SessionUser }>('GET', '/auth/me'),
  /** The superadmin account(s), for the sign-in screen's picker. Never includes other users. */
  accounts: () => request<DemoAccount[]>('GET', '/auth/accounts'),
  changePassword: (current: string, next: string) => request<void>('POST', '/auth/password', { current, next }),
  users: () => request<SessionUser[]>('GET', '/admin/users'),
  createUser: (u: NewUserInput) => request<SessionUser>('POST', '/admin/users', u),
  updateUser: (id: string, c: UserPatch) => request<SessionUser>('PATCH', `/admin/users/${enc(id)}`, c),
  resetPassword: (id: string, password: string) => request<void>('POST', `/admin/users/${enc(id)}/password`, { password }),
  bootstrap: async (signal?: AbortSignal) => {
    const data = await request<Bootstrap>('GET', '/bootstrap', undefined, signal)
    for (const [c, docs] of Object.entries(data.collections)) data.collections[c as CollectionName] = docs!.map((d) => absorb(c, d))
    return data
  },
  list: async <T>(c: CollectionName) => (await request<T[]>('GET', `/${c}`)).map((d) => absorb(c, d)),
  get: async <T>(c: CollectionName, id: string) => absorb(c, await request<T>('GET', `/${c}/${enc(id)}`)),
  /** Resolves with the record as saved — which may differ from `doc` (e.g. a server-assigned project code). */
  create: <T>(c: CollectionName, doc: T, at: 'start' | 'end' = 'start') => enqueue(async () => absorb(c, await request<T>('POST', `/${c}${at === 'end' ? '?at=end' : ''}`, doc))),
  replace,
  patch: <T>(c: CollectionName, id: string, changes: Partial<T>) => enqueue(async () => absorb(c, await request<T>('PATCH', `/${c}/${enc(id)}`, changes))),
  remove: (c: CollectionName, id: string) => enqueue(() => request<void>('DELETE', `/${c}/${enc(id)}`)),
  setSetting: <T>(key: SettingName, value: T) => enqueue(() => request<{ value: T }>('PUT', `/settings/${key}`, { value })),
  /** Saves a setting and surfaces the server's validation message to the caller (not just a toast). */
  saveSetting: <T>(key: SettingName, value: T) => request<{ value: T }>('PUT', `/settings/${key}`, { value }),
  dataset: <T>(key: DatasetName) => request<T>('GET', `/datasets/${key}`),
  reseed: () => enqueue(() => request<{ ok: true }>('POST', '/admin/reseed')),
}

/** True once the signed-in user's data has been loaded from the server. */
export const connection = { online: false }

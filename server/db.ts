/**
 * SQLite persistence for the Worksuite API (Node's built-in `node:sqlite`, no native build step).
 *
 * The domain objects are nested (projects carry phases, tranches, team, updates…), so each record is
 * stored as a JSON document keyed by (collection, id). `seq` keeps the list order the UI expects:
 * new records are prepended (lower seq) the same way the client store does.
 */
import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { ModuleKey } from '../src/data/roles'

const here = dirname(fileURLToPath(import.meta.url))
export const DB_PATH = process.env.WORKSUITE_DB ?? resolve(here, 'data', 'worksuite.db')

/** Record collections the API allows CRUD on. Value = field used as the record id. */
export const COLLECTIONS = {
  employees: 'id',
  jobs: 'id',
  leaves: 'id',
  expenses: 'id',
  invoices: 'id',
  candidates: 'id',
  assets: 'id',
  assetLog: 'id',
  projects: 'id',
  expenseBills: 'id',
  expenseSubCategories: 'name',
} as const
export type Collection = keyof typeof COLLECTIONS
export const isCollection = (c: string): c is Collection => Object.hasOwn(COLLECTIONS, c)

export type Doc = Record<string, unknown>

export class HttpError extends Error {
  constructor(readonly status: number, message: string) {
    super(message)
  }
}

export function openDb(path = DB_PATH) {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true })
  const db = new DatabaseSync(path)
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS records (
      collection TEXT NOT NULL,
      id         TEXT NOT NULL,
      seq        INTEGER NOT NULL,
      data       TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (collection, id)
    );
    CREATE INDEX IF NOT EXISTS records_order ON records (collection, seq);
    -- Read-only reference datasets (charts, trends, company profile…) keyed by name.
    CREATE TABLE IF NOT EXISTS datasets (key TEXT PRIMARY KEY, data TEXT NOT NULL);
    -- Small mutable app-wide values (payroll status, custom expense categories…).
    CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    -- Sign-in accounts. modules = JSON array of the modules the account can use.
    CREATE TABLE IF NOT EXISTS users (
      id            TEXT PRIMARY KEY,
      email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      name          TEXT NOT NULL,
      role          TEXT NOT NULL,
      label         TEXT NOT NULL,
      description   TEXT NOT NULL DEFAULT '',
      modules       TEXT NOT NULL,
      photo         TEXT,
      hue           INTEGER NOT NULL DEFAULT 200,
      active        INTEGER NOT NULL DEFAULT 1
    );
    -- Only a SHA-256 of each session token is stored, so a leaked database can't be used to sign in.
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL
    );
  `)
  return new Store(db)
}

export type SettingsTable = 'datasets' | 'settings'

export class Store {
  constructor(readonly db: DatabaseSync) {}

  tx<T>(fn: () => T): T {
    this.db.exec('BEGIN')
    try {
      const out = fn()
      this.db.exec('COMMIT')
      return out
    } catch (err) {
      this.db.exec('ROLLBACK')
      throw err
    }
  }

  idOf(collection: Collection, doc: Doc): string | undefined {
    const v = doc[COLLECTIONS[collection]]
    return v === undefined || v === null || v === '' ? undefined : String(v)
  }

  list(collection: Collection): Doc[] {
    const rows = this.db.prepare('SELECT data FROM records WHERE collection = ? ORDER BY seq').all(collection) as { data: string }[]
    return rows.map((r) => JSON.parse(r.data))
  }

  get(collection: Collection, id: string): Doc | undefined {
    const row = this.db.prepare('SELECT data FROM records WHERE collection = ? AND id = ?').get(collection, id) as { data: string } | undefined
    return row ? JSON.parse(row.data) : undefined
  }

  /** Insert a new record at the head (default, matching the UI's newest-first lists) or tail. */
  insert(collection: Collection, doc: Doc, at: 'start' | 'end' = 'start'): Doc {
    const id = this.idOf(collection, doc)
    if (!id) throw new HttpError(400, `Missing "${COLLECTIONS[collection]}" field`)
    if (this.get(collection, id)) throw new HttpError(409, `${collection}/${id} already exists`)
    const agg = at === 'start' ? 'MIN(seq) - 1' : 'MAX(seq) + 1'
    const { s } = this.db.prepare(`SELECT COALESCE(${agg}, 0) AS s FROM records WHERE collection = ?`).get(collection) as { s: number }
    this.db.prepare('INSERT INTO records (collection, id, seq, data) VALUES (?, ?, ?, ?)').run(collection, id, s, JSON.stringify(doc))
    return doc
  }

  /** Replace a record, creating it at the head if it doesn't exist yet. */
  put(collection: Collection, id: string, doc: Doc): Doc {
    const idField = COLLECTIONS[collection]
    const body = { ...doc, [idField]: doc[idField] ?? id }
    if (String(body[idField]) !== id) throw new HttpError(400, `Body "${idField}" does not match the URL`)
    if (!this.get(collection, id)) return this.insert(collection, body)
    this.db.prepare(`UPDATE records SET data = ?, updated_at = datetime('now') WHERE collection = ? AND id = ?`).run(JSON.stringify(body), collection, id)
    return body
  }

  /** Shallow-merge fields into a record. A `null` value removes the field. */
  patch(collection: Collection, id: string, changes: Doc): Doc {
    const current = this.get(collection, id)
    if (!current) throw new HttpError(404, `${collection}/${id} not found`)
    const next: Doc = { ...current }
    for (const [k, v] of Object.entries(changes)) {
      if (k === COLLECTIONS[collection]) continue
      if (v === null) delete next[k]
      else next[k] = v
    }
    return this.put(collection, id, next)
  }

  remove(collection: Collection, id: string): boolean {
    return Number(this.db.prepare('DELETE FROM records WHERE collection = ? AND id = ?').run(collection, id).changes) > 0
  }

  /** Replace an entire collection, keeping the given order. */
  replaceAll(collection: Collection, docs: Doc[]) {
    this.db.prepare('DELETE FROM records WHERE collection = ?').run(collection)
    const ins = this.db.prepare('INSERT INTO records (collection, id, seq, data) VALUES (?, ?, ?, ?)')
    docs.forEach((doc, i) => {
      const id = this.idOf(collection, doc)
      if (!id) throw new Error(`Seed record ${i} in ${collection} has no id`)
      ins.run(collection, id, i, JSON.stringify(doc))
    })
  }

  count(collection: Collection): number {
    return (this.db.prepare('SELECT COUNT(*) AS n FROM records WHERE collection = ?').get(collection) as { n: number }).n
  }

  getJson(table: SettingsTable, key: string): unknown {
    const row = this.db.prepare(`SELECT data FROM ${table} WHERE key = ?`).get(key) as { data: string } | undefined
    return row ? JSON.parse(row.data) : undefined
  }

  setJson(table: SettingsTable, key: string, value: unknown) {
    this.db.prepare(`INSERT INTO ${table} (key, data) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET data = excluded.data`).run(key, JSON.stringify(value))
  }

  allJson(table: SettingsTable): Record<string, unknown> {
    const rows = this.db.prepare(`SELECT key, data FROM ${table}`).all() as { key: string; data: string }[]
    return Object.fromEntries(rows.map((r) => [r.key, JSON.parse(r.data)]))
  }

  getMeta(key: string): string | undefined {
    return (this.db.prepare('SELECT value FROM meta WHERE key = ?').get(key) as { value: string } | undefined)?.value
  }

  setMeta(key: string, value: string) {
    this.db.prepare('INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, value)
  }

  /* ── Users & sessions ── */

  replaceUsers(users: (PublicUser & { passwordHash: string })[]) {
    this.db.exec('DELETE FROM sessions; DELETE FROM users;')
    const ins = this.db.prepare('INSERT INTO users (id, email, password_hash, name, role, label, description, modules, photo, hue) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    for (const u of users) ins.run(u.id, u.email, u.passwordHash, u.name, u.role, u.label, u.description, JSON.stringify(u.modules), u.photo ?? null, u.hue)
  }

  userByEmail(email: string): (PublicUser & { passwordHash: string }) | undefined {
    const row = this.db.prepare('SELECT * FROM users WHERE email = ? AND active = 1').get(email) as UserRow | undefined
    return row ? { ...toPublicUser(row), passwordHash: row.password_hash } : undefined
  }

  listUsers(): PublicUser[] {
    return (this.db.prepare('SELECT * FROM users WHERE active = 1 ORDER BY rowid').all() as unknown as UserRow[]).map(toPublicUser)
  }

  createSession(tokenHash: string, userId: string, ttlMs: number) {
    this.db.prepare("DELETE FROM sessions WHERE expires_at <= datetime('now')").run()
    const expires = new Date(Date.now() + ttlMs).toISOString().replace('T', ' ').slice(0, 19)
    this.db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)').run(tokenHash, userId, expires)
  }

  userBySession(tokenHash: string): PublicUser | undefined {
    const row = this.db.prepare(`
      SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = ? AND s.expires_at > datetime('now') AND u.active = 1`).get(tokenHash) as UserRow | undefined
    return row ? toPublicUser(row) : undefined
  }

  deleteSession(tokenHash: string) {
    this.db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash)
  }
}

/** A signed-in account as the client sees it (never includes the password hash). */
export interface PublicUser {
  id: string
  email: string
  name: string
  role: string
  label: string
  description: string
  modules: ModuleKey[]
  photo?: string
  hue: number
}

interface UserRow {
  id: string; email: string; password_hash: string; name: string; role: string; label: string
  description: string; modules: string; photo: string | null; hue: number
}

function toPublicUser(r: UserRow): PublicUser {
  return {
    id: r.id, email: r.email, name: r.name, role: r.role, label: r.label, description: r.description,
    modules: JSON.parse(r.modules), photo: r.photo ?? undefined, hue: r.hue,
  }
}

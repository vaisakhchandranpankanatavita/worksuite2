/**
 * Postgres persistence for the Worksuite API, via `pg` and a `DATABASE_URL` connection string
 * (Vercel Postgres, Neon, Supabase, or any Postgres — all work the same way over `pg`).
 *
 * Runs as a Vercel serverless function in production, so the database can't be a local file: it has
 * to be reachable over the network and shared by every invocation. The domain objects are nested
 * (projects carry phases, tranches, team, updates…), so each record is still stored as a JSON(B)
 * document keyed by (collection, id). `seq` keeps the list order the UI expects: new records are
 * prepended (lower seq) the same way the client store does.
 */
import { Pool, type Pool as PoolType, type PoolClient, type QueryResultRow } from 'pg'
import type { ModuleKey } from '../src/data/roles.js'

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
  /** `details` are merged into the JSON error body (e.g. the current record on a 409). */
  constructor(readonly status: number, message: string, readonly details?: Doc) {
    super(message)
  }
}

/** Field carrying a record's revision on the wire. Never stored inside `data`. */
export const REV = '_rev'

function withoutRev(doc: Doc): Doc {
  const { [REV]: _, ...rest } = doc
  return rest
}

/** `Pool` in production; a single reused `Pool` in dev too — connections stay pooled either way. */
export function openDb(connectionString = process.env.DATABASE_URL): Store {
  if (!connectionString) {
    throw new Error(
      'DATABASE_URL is not set. Point it at a Postgres database (Vercel Postgres, Neon, Supabase, ...) — ' +
      'see server/README.md.',
    )
  }
  const isLocal = /localhost|127\.0\.0\.1/.test(connectionString)
  const pool = new Pool({ connectionString, ssl: isLocal ? undefined : { rejectUnauthorized: false } })
  return new Store(pool)
}

async function migrate(pool: PoolType) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS records (
      collection TEXT NOT NULL,
      id         TEXT NOT NULL,
      seq        INTEGER NOT NULL,
      data       JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (collection, id)
    );
    CREATE INDEX IF NOT EXISTS records_order ON records (collection, seq);
    -- Bumped on every write; clients send the rev they last saw so a stale write is refused, not applied.
    ALTER TABLE records ADD COLUMN IF NOT EXISTS rev INTEGER NOT NULL DEFAULT 0;
    -- Read-only reference datasets (charts, trends, company profile…) keyed by name.
    CREATE TABLE IF NOT EXISTS datasets (key TEXT PRIMARY KEY, data JSONB NOT NULL);
    -- Small mutable app-wide values (payroll status, custom expense categories…).
    CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, data JSONB NOT NULL);
    CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    -- Sign-in accounts. modules = JSON array of the modules the account can use.
    CREATE TABLE IF NOT EXISTS users (
      id            TEXT PRIMARY KEY,
      email         TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      name          TEXT NOT NULL,
      role          TEXT NOT NULL,
      label         TEXT NOT NULL,
      description   TEXT NOT NULL DEFAULT '',
      modules       JSONB NOT NULL,
      photo         TEXT,
      hue           INTEGER NOT NULL DEFAULT 200,
      active        BOOLEAN NOT NULL DEFAULT true
    );
    -- is_superadmin: the one account that manages users and configuration. read_only: modules the user may view but not change.
    ALTER TABLE users ADD COLUMN IF NOT EXISTS is_superadmin BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS read_only JSONB NOT NULL DEFAULT '[]';
    -- Databases created before superadmin existed: the old "admin" account takes the role.
    UPDATE users SET is_superadmin = true
      WHERE role = 'admin' AND NOT EXISTS (SELECT 1 FROM users WHERE is_superadmin);
    -- Only a SHA-256 of each session token is stored, so a leaked database can't be used to sign in.
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      expires_at TIMESTAMPTZ NOT NULL
    );
  `)
}

/** One-time-per-process migration, shared by every Store built from the same pool. */
const migrated = new WeakSet<PoolType>()
async function ensureMigrated(pool: PoolType) {
  if (migrated.has(pool)) return
  await migrate(pool)
  migrated.add(pool)
}

export type SettingsTable = 'datasets' | 'settings'

export class Store {
  /** The pool for a fresh transaction's client while inside `tx()`, otherwise the pool itself. */
  private queryable: PoolType | PoolClient
  private readonly ready: Promise<void>
  constructor(private readonly pool: PoolType) {
    this.queryable = pool
    this.ready = ensureMigrated(pool)
  }

  private async q<T extends QueryResultRow = QueryResultRow>(text: string, params: unknown[] = []) {
    await this.ready
    return this.queryable.query<T>(text, params)
  }

  async close() {
    await this.pool.end()
  }

  async tx<T>(fn: () => Promise<T> | T): Promise<T> {
    const client = await this.pool.connect()
    const prev = this.queryable
    this.queryable = client
    try {
      await client.query('BEGIN')
      const out = await fn()
      await client.query('COMMIT')
      return out
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      this.queryable = prev
      client.release()
    }
  }

  idOf(collection: Collection, doc: Doc): string | undefined {
    const v = doc[COLLECTIONS[collection]]
    return v === undefined || v === null || v === '' ? undefined : String(v)
  }

  /** Records come back with their revision in `_rev`. */
  async list(collection: Collection): Promise<Doc[]> {
    const { rows } = await this.q<{ data: Doc; rev: number }>('SELECT data, rev FROM records WHERE collection = $1 ORDER BY seq', [collection])
    return rows.map((r) => ({ ...r.data, [REV]: r.rev }))
  }

  async get(collection: Collection, id: string): Promise<Doc | undefined> {
    const { rows } = await this.q<{ data: Doc; rev: number }>('SELECT data, rev FROM records WHERE collection = $1 AND id = $2', [collection, id])
    return rows[0] && { ...rows[0].data, [REV]: rows[0].rev }
  }

  /**
   * Next code in a `<prefix><number>` series (e.g. PRJ-109). Atomic across concurrent requests: the counter
   * lives in `meta` and is bumped by a single upsert, never below the highest code already stored.
   */
  async nextCode(collection: Collection, prefix: string): Promise<string> {
    // `prefix` is a code constant made of letters and dashes, so it needs no regex escaping.
    const pattern = `^${prefix}(\\d+)$`
    const { rows: [{ m }] } = await this.q<{ m: number }>(
      'SELECT COALESCE(MAX(substring(id from $2)::int), 100) AS m FROM records WHERE collection = $1',
      [collection, pattern],
    )
    const { rows } = await this.q<{ value: string }>(
      `INSERT INTO meta (key, value) VALUES ($1, ($2::int + 1)::text)
       ON CONFLICT (key) DO UPDATE SET value = (GREATEST(meta.value::int, $2::int) + 1)::text
       RETURNING value`,
      [`seq:${collection}`, m],
    )
    return `${prefix}${rows[0].value}`
  }

  /** Insert a new record at the head (default, matching the UI's newest-first lists) or tail. */
  async insert(collection: Collection, input: Doc, at: 'start' | 'end' = 'start'): Promise<Doc> {
    const doc = withoutRev(input)
    const id = this.idOf(collection, doc)
    if (!id) throw new HttpError(400, `Missing "${COLLECTIONS[collection]}" field`)
    if (await this.get(collection, id)) throw new HttpError(409, `${collection}/${id} already exists`)
    const agg = at === 'start' ? 'MIN(seq) - 1' : 'MAX(seq) + 1'
    const { rows } = await this.q<{ s: number }>(`SELECT COALESCE(${agg}, 0) AS s FROM records WHERE collection = $1`, [collection])
    await this.q('INSERT INTO records (collection, id, seq, data) VALUES ($1, $2, $3, $4)', [collection, id, rows[0].s, JSON.stringify(doc)])
    return { ...doc, [REV]: 0 }
  }

  /**
   * Replace a record. With `expectedRev`, the write only lands if nobody else has changed (or deleted) the
   * record since that revision — otherwise 409 with the current copy. Without it, a missing record is created.
   */
  async put(collection: Collection, id: string, doc: Doc, expectedRev?: number): Promise<Doc> {
    const idField = COLLECTIONS[collection]
    const body = withoutRev({ ...doc, [idField]: doc[idField] ?? id })
    if (String(body[idField]) !== id) throw new HttpError(400, `Body "${idField}" does not match the URL`)
    const { rows } = expectedRev === undefined
      ? await this.q<{ rev: number }>('UPDATE records SET data = $1, rev = rev + 1, updated_at = now() WHERE collection = $2 AND id = $3 RETURNING rev', [JSON.stringify(body), collection, id])
      : await this.q<{ rev: number }>('UPDATE records SET data = $1, rev = rev + 1, updated_at = now() WHERE collection = $2 AND id = $3 AND rev = $4 RETURNING rev', [JSON.stringify(body), collection, id, expectedRev])
    if (rows[0]) return { ...body, [REV]: rows[0].rev }
    if (expectedRev === undefined) return this.insert(collection, body)
    const current = (await this.get(collection, id)) ?? null
    throw new HttpError(409, current ? `${collection}/${id} was changed by someone else` : `${collection}/${id} was deleted by someone else`, { collection, id, current })
  }

  /** Shallow-merge fields into a record. A `null` value removes the field. */
  async patch(collection: Collection, id: string, changes: Doc): Promise<Doc> {
    const current = await this.get(collection, id)
    if (!current) throw new HttpError(404, `${collection}/${id} not found`)
    const next: Doc = withoutRev(current)
    for (const [k, v] of Object.entries(changes)) {
      if (k === COLLECTIONS[collection]) continue
      if (v === null) delete next[k]
      else next[k] = v
    }
    return this.put(collection, id, next)
  }

  async remove(collection: Collection, id: string): Promise<boolean> {
    const { rowCount } = await this.q('DELETE FROM records WHERE collection = $1 AND id = $2', [collection, id])
    return (rowCount ?? 0) > 0
  }

  /** Replace an entire collection, keeping the given order. */
  async replaceAll(collection: Collection, docs: Doc[]) {
    await this.q('DELETE FROM records WHERE collection = $1', [collection])
    let i = 0
    for (const doc of docs) {
      const id = this.idOf(collection, doc)
      if (!id) throw new Error(`Seed record ${i} in ${collection} has no id`)
      await this.q('INSERT INTO records (collection, id, seq, data) VALUES ($1, $2, $3, $4)', [collection, id, i, JSON.stringify(doc)])
      i++
    }
  }

  async count(collection: Collection): Promise<number> {
    const { rows } = await this.q<{ n: string }>('SELECT COUNT(*) AS n FROM records WHERE collection = $1', [collection])
    return Number(rows[0].n)
  }

  async clearTable(table: SettingsTable) {
    await this.q(`DELETE FROM ${table}`)
  }

  async getJson(table: SettingsTable, key: string): Promise<unknown> {
    const { rows } = await this.q<{ data: unknown }>(`SELECT data FROM ${table} WHERE key = $1`, [key])
    return rows[0]?.data
  }

  async setJson(table: SettingsTable, key: string, value: unknown) {
    await this.q(`INSERT INTO ${table} (key, data) VALUES ($1, $2) ON CONFLICT(key) DO UPDATE SET data = excluded.data`, [key, JSON.stringify(value)])
  }

  async allJson(table: SettingsTable): Promise<Record<string, unknown>> {
    const { rows } = await this.q<{ key: string; data: unknown }>(`SELECT key, data FROM ${table}`)
    return Object.fromEntries(rows.map((r) => [r.key, r.data]))
  }

  async getMeta(key: string): Promise<string | undefined> {
    const { rows } = await this.q<{ value: string }>('SELECT value FROM meta WHERE key = $1', [key])
    return rows[0]?.value
  }

  async setMeta(key: string, value: string) {
    await this.q('INSERT INTO meta (key, value) VALUES ($1, $2) ON CONFLICT(key) DO UPDATE SET value = excluded.value', [key, value])
  }

  /* ── Users & sessions ── */

  async userByEmail(email: string): Promise<(PublicUser & { passwordHash: string }) | undefined> {
    const { rows } = await this.q<UserRow>('SELECT * FROM users WHERE lower(email) = lower($1) AND active = true', [email])
    return rows[0] ? { ...toPublicUser(rows[0]), passwordHash: rows[0].password_hash } : undefined
  }

  async userById(id: string): Promise<(PublicUser & { passwordHash: string }) | undefined> {
    const { rows } = await this.q<UserRow>('SELECT * FROM users WHERE id = $1', [id])
    return rows[0] ? { ...toPublicUser(rows[0]), passwordHash: rows[0].password_hash } : undefined
  }

  /** Every account, including deactivated ones (admin screen). */
  async listUsers(): Promise<PublicUser[]> {
    const { rows } = await this.q<UserRow>('SELECT * FROM users ORDER BY is_superadmin DESC, name')
    return rows.map(toPublicUser)
  }

  async countUsers(): Promise<number> {
    const { rows } = await this.q<{ n: string }>('SELECT COUNT(*) AS n FROM users')
    return Number(rows[0].n)
  }

  /** Throws 409 if the email is already taken. */
  async createUser(u: NewUser): Promise<PublicUser> {
    try {
      await this.q(
        `INSERT INTO users (id, email, password_hash, name, role, label, description, modules, read_only, is_superadmin, photo, hue)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [u.id, u.email, u.passwordHash, u.name, u.isSuperadmin ? 'superadmin' : 'user', u.label, u.description ?? '', JSON.stringify(u.modules), JSON.stringify(u.readOnly), u.isSuperadmin, u.photo ?? null, u.hue],
      )
    } catch (err) {
      if ((err as { code?: string }).code === '23505') throw new HttpError(409, 'An account with that email already exists')
      throw err
    }
    return (await this.userById(u.id))!
  }

  /** Update profile/access fields. Leaves the password and superadmin flag alone. */
  async updateUser(id: string, c: UserChanges): Promise<PublicUser> {
    const sets: string[] = []
    const vals: unknown[] = []
    const add = (col: string, v: unknown) => { vals.push(v); sets.push(`${col} = $${vals.length}`) }
    if (c.name !== undefined) add('name', c.name)
    if (c.email !== undefined) add('email', c.email)
    if (c.label !== undefined) add('label', c.label)
    if (c.modules !== undefined) add('modules', JSON.stringify(c.modules))
    if (c.readOnly !== undefined) add('read_only', JSON.stringify(c.readOnly))
    if (c.active !== undefined) add('active', c.active)
    if (sets.length) {
      vals.push(id)
      try {
        await this.q(`UPDATE users SET ${sets.join(', ')} WHERE id = $${vals.length}`, vals)
      } catch (err) {
        if ((err as { code?: string }).code === '23505') throw new HttpError(409, 'An account with that email already exists')
        throw err
      }
    }
    const user = await this.userById(id)
    if (!user) throw new HttpError(404, 'User not found')
    return user
  }

  /** Sets a new password and signs the account out everywhere. */
  async setPassword(id: string, passwordHash: string) {
    await this.q('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, id])
    await this.deleteUserSessions(id)
  }

  async deleteUserSessions(userId: string) {
    await this.q('DELETE FROM sessions WHERE user_id = $1', [userId])
  }

  async createSession(tokenHash: string, userId: string, ttlMs: number) {
    await this.q('DELETE FROM sessions WHERE expires_at <= now()')
    const expires = new Date(Date.now() + ttlMs)
    await this.q('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)', [tokenHash, userId, expires])
  }

  async userBySession(tokenHash: string): Promise<PublicUser | undefined> {
    const { rows } = await this.q<UserRow>(
      `SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = $1 AND s.expires_at > now() AND u.active = true`,
      [tokenHash],
    )
    return rows[0] ? toPublicUser(rows[0]) : undefined
  }

  async deleteSession(tokenHash: string) {
    await this.q('DELETE FROM sessions WHERE token_hash = $1', [tokenHash])
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
  /** Modules (a subset of `modules`) where the account can view but not change data. */
  readOnly: ModuleKey[]
  isSuperadmin: boolean
  active: boolean
  photo?: string
  hue: number
}

export interface NewUser {
  id: string; email: string; passwordHash: string; name: string; label: string; description?: string
  modules: ModuleKey[]; readOnly: ModuleKey[]; isSuperadmin: boolean; photo?: string; hue: number
}
export type UserChanges = Partial<Pick<PublicUser, 'name' | 'email' | 'label' | 'modules' | 'readOnly' | 'active'>>

interface UserRow {
  id: string; email: string; password_hash: string; name: string; role: string; label: string
  description: string; modules: ModuleKey[]; read_only: ModuleKey[]; is_superadmin: boolean; active: boolean
  photo: string | null; hue: number
}

function toPublicUser(r: UserRow): PublicUser {
  return {
    id: r.id, email: r.email, name: r.name, role: r.role, label: r.label, description: r.description,
    modules: r.modules, readOnly: r.read_only, isSuperadmin: r.is_superadmin, active: r.active, photo: r.photo ?? undefined, hue: r.hue,
  }
}

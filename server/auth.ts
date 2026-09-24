/**
 * Email + password sign-in with server-side sessions.
 *
 * - Passwords are hashed with scrypt (per-user salt) and compared in constant time.
 * - A session is a random 256-bit token sent as an httpOnly, SameSite=Lax cookie; the database only
 *   keeps its SHA-256, so the token can't be recovered from the database.
 * - Repeated failed sign-ins from one address are throttled.
 */
import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import type { NextFunction, Request, Response } from 'express'
import { HttpError, type PublicUser, type Store } from './db'

export const SESSION_COOKIE = 'ws_session'
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000

export function hashPassword(password: string): string {
  const salt = randomBytes(16)
  const key = scryptSync(password, salt, 64)
  return `scrypt$${salt.toString('hex')}$${key.toString('hex')}`
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, saltHex, keyHex] = stored.split('$')
  if (scheme !== 'scrypt' || !saltHex || !keyHex) return false
  const expected = Buffer.from(keyHex, 'hex')
  const actual = scryptSync(password, Buffer.from(saltHex, 'hex'), expected.length)
  return timingSafeEqual(actual, expected)
}

// A fixed hash to compare against when the email is unknown, so response time doesn't reveal which emails exist.
const DUMMY_HASH = hashPassword(randomBytes(12).toString('hex'))

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex')

function readCookie(req: Request, name: string): string | undefined {
  for (const part of (req.headers.cookie ?? '').split(';')) {
    const [k, ...v] = part.trim().split('=')
    if (k === name) return decodeURIComponent(v.join('='))
  }
  return undefined
}

function sessionCookie(req: Request, value: string, maxAgeSec: number) {
  const secure = req.secure || req.headers['x-forwarded-proto'] === 'https'
  return `${SESSION_COOKIE}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSec}${secure ? '; Secure' : ''}`
}

/* ── Throttling: at most 8 failed attempts per address per 15 minutes ── */
const WINDOW_MS = 15 * 60 * 1000
const MAX_FAILURES = 8
const failures = new Map<string, { count: number; first: number }>()

function throttled(ip: string) {
  const f = failures.get(ip)
  if (!f) return false
  if (Date.now() - f.first > WINDOW_MS) {
    failures.delete(ip)
    return false
  }
  return f.count >= MAX_FAILURES
}

function recordFailure(ip: string) {
  const f = failures.get(ip)
  if (!f || Date.now() - f.first > WINDOW_MS) failures.set(ip, { count: 1, first: Date.now() })
  else f.count++
}

export function login(store: Store, req: Request, res: Response, email: string, password: string): PublicUser {
  const ip = req.ip ?? 'unknown'
  if (throttled(ip)) throw new HttpError(429, 'Too many sign-in attempts. Try again in a few minutes.')
  const user = store.userByEmail(email.trim())
  const ok = verifyPassword(password, user?.passwordHash ?? DUMMY_HASH) && !!user
  if (!ok || !user) {
    recordFailure(ip)
    throw new HttpError(401, 'Incorrect email or password')
  }
  failures.delete(ip)
  const token = randomBytes(32).toString('base64url')
  store.createSession(sha256(token), user.id, SESSION_TTL_MS)
  res.setHeader('Set-Cookie', sessionCookie(req, token, SESSION_TTL_MS / 1000))
  const { passwordHash: _omit, ...pub } = user
  return pub
}

export function logout(store: Store, req: Request, res: Response) {
  const token = readCookie(req, SESSION_COOKIE)
  if (token) store.deleteSession(sha256(token))
  res.setHeader('Set-Cookie', sessionCookie(req, '', 0))
}

export function currentUser(store: Store, req: Request): PublicUser | undefined {
  const token = readCookie(req, SESSION_COOKIE)
  return token ? store.userBySession(sha256(token)) : undefined
}

declare module 'express-serve-static-core' {
  interface Request { user?: PublicUser }
}

/** Rejects requests without a valid session; attaches `req.user` otherwise. */
export const requireAuth = (store: Store) => (req: Request, _res: Response, next: NextFunction) => {
  const user = currentUser(store, req)
  if (!user) return next(new HttpError(401, 'Sign in required'))
  req.user = user
  next()
}

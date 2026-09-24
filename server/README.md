# Worksuite API

Express + SQLite (Node's built-in `node:sqlite`, Node ≥ 22.13) backend for the Worksuite app.
The database is seeded from the app's original demo data (`src/data/mock.ts`, `src/data/projects.ts`
via `src/data/registry.ts`).

## Running

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server **with the API mounted at `/api`** (one process) |
| `npm run server` | Standalone API on `PORT` (default 4000); also serves `dist/` if built |
| `npm start` | Build the front-end, then serve app + API from one process |
| `npm run seed` | Wipe the database and re-seed it from the demo data and demo accounts |

The database lives at `server/data/worksuite.db` (git-ignored; override with `WORKSUITE_DB`).
An empty database is seeded automatically on start. Seeded dates are relative to the day of seeding,
so re-seed (`npm run seed` or `POST /api/admin/reseed`) to refresh them.

## Sign-in and roles

Accounts live in the `users` table: one per role, all with the password `demo1234`
(set `WORKSUITE_DEMO_PASSWORD` before seeding to change it).

| Role | Email | Modules |
| --- | --- | --- |
| Super Admin | meera.iyer@worksuite.io | HR, Finance, Assets, Projects |
| HR Admin | anita.krishnan@worksuite.io | HR, Assets |
| Finance Admin | vikram.nair@worksuite.io | Finance |
| Production Manager | rohan.verma@worksuite.io | Assets |
| Project Director | arjun.malhotra@worksuite.io | Projects, Assets |

- Passwords are hashed with scrypt. A session is a random token in an httpOnly `ws_session` cookie
  (7 days); only its SHA-256 is stored in the `sessions` table. Failed sign-ins are throttled per address.
- Every endpoint except `/health` and `/auth/*` needs a session. What a role may read or change is set
  per module in `server/access.ts`. For example, Projects can *read* invoices and expense claims to cost
  projects but only Finance can change them. Requests outside the role get `403`.
- `/api/bootstrap` returns only the data the role may read. The UI hides everything else, including
  search results, notifications, AI insights and assistant commands.
- `/api/auth/accounts` lists the demo accounts for the sign-in screen's quick-fill. Set
  `WORKSUITE_DEMO_ACCOUNTS=off` to hide it.

## Endpoints

| Method | Path | |
| --- | --- | --- |
| GET | `/api/health` | Status and seed time |
| POST | `/api/auth/login` | `{ email, password }` → sets the session cookie, returns the user |
| POST | `/api/auth/logout` | Ends the session |
| GET | `/api/auth/me` | The signed-in user (401 if none) |
| GET | `/api/auth/accounts` | Demo accounts (no secrets) |
| GET | `/api/bootstrap` | Everything the signed-in role may see, in one response (used after sign-in) |
| GET | `/api/:collection` | List; exact-match filters on top-level fields, e.g. `?status=Available` |
| GET | `/api/:collection/:id` | One record |
| POST | `/api/:collection` | Create (prepended; `?at=end` appends). 409 if the id exists |
| PUT | `/api/:collection/:id` | Replace (upsert) |
| PATCH | `/api/:collection/:id` | Merge fields; `null` removes a field |
| DELETE | `/api/:collection/:id` | Delete |
| GET | `/api/datasets[/:key]` | Read-only reference data (charts, trends, company profile…) |
| GET/PUT | `/api/settings/:key` | `payrollStatus`, `expenseTrackCategories` — body `{ "value": … }` |
| POST | `/api/admin/reseed` | Reset all business data to the demo data (Super Admin only; accounts are kept) |

Collections: `employees`, `jobs`, `leaves`, `expenses`, `invoices`, `candidates`, `assets`, `assetLog`,
`projects`, `expenseBills`, `expenseSubCategories` (keyed by `name`).

## How the front-end uses it

- On load, `restoreSession()` in `src/store.ts` resumes the session from the cookie. Otherwise the
  login page signs in with `signIn()`. Signing out reloads the page, so no data stays in memory.
- `src/data/hydrate.ts` loads `/api/bootstrap` after sign-in and writes the results into the existing
  exports of `data/mock` in place, so pages keep their imports. Data outside the role is emptied.
- `startSync()` in `src/store.ts` diffs each persisted store slice after every action and sends the
  minimal POST/PUT/DELETE calls. `src/lib/api.ts` queues writes so they arrive in order.
- `npx tsx server/smoke-client.ts` (with `API_ORIGIN` pointing at a running server; `SMOKE_EMAIL` picks
  the account) signs in and checks role scoping and that store actions persist. It changes data, so
  run `npm run seed` afterwards.

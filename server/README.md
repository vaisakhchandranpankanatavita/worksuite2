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
| `npm run seed` | Wipe the database and re-seed it from the demo data |

The database lives at `server/data/worksuite.db` (git-ignored; override with `WORKSUITE_DB`).
An empty database is seeded automatically on start. Seeded dates are relative to the day of seeding,
so re-seed (`npm run seed` or `POST /api/admin/reseed`) to refresh them.

## Endpoints

| Method | Path | |
| --- | --- | --- |
| GET | `/api/health` | Status and seed time |
| GET | `/api/bootstrap` | All collections, datasets and settings in one response (used on app start) |
| GET | `/api/:collection` | List; exact-match filters on top-level fields, e.g. `?status=Available` |
| GET | `/api/:collection/:id` | One record |
| POST | `/api/:collection` | Create (prepended; `?at=end` appends). 409 if the id exists |
| PUT | `/api/:collection/:id` | Replace (upsert) |
| PATCH | `/api/:collection/:id` | Merge fields; `null` removes a field |
| DELETE | `/api/:collection/:id` | Delete |
| GET | `/api/datasets[/:key]` | Read-only reference data (charts, trends, company profile…) |
| GET/PUT | `/api/settings/:key` | `payrollStatus`, `expenseTrackCategories` — body `{ "value": … }` |
| POST | `/api/admin/reseed` | Reset everything to the demo data |

Collections: `employees`, `jobs`, `leaves`, `expenses`, `invoices`, `candidates`, `assets`, `assetLog`,
`projects`, `expenseBills`, `expenseSubCategories` (keyed by `name`).

## How the front-end uses it

- `src/data/hydrate.ts` loads `/api/bootstrap` before first render and writes the results into the
  existing exports of `data/mock` in place, so pages keep their imports. If the API is unreachable,
  the app runs on the built-in demo data and doesn't save anything.
- `startSync()` in `src/store.ts` diffs each persisted store slice after every action and sends the
  minimal POST/PUT/DELETE calls. `src/lib/api.ts` queues writes so they arrive in order.
- `npx tsx server/smoke-client.ts` (with `API_ORIGIN` pointing at a running server) checks that store
  actions persist end-to-end.

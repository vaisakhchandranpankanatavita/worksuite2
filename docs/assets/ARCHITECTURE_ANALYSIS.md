# Assets Module — Architecture Analysis

Analysis-only document. No application code has been changed as part of producing this file.

Note: an earlier draft of the request for this analysis referenced paths (`src/features/`, `src/mock-data/`, shadcn/ui primitives) that do not exist in this repository. This document reflects the **actual** structure of Worksuite, confirmed by direct inspection.

## 1. Existing architecture summary

Worksuite is a frontend-only React 18 + TypeScript app (Vite 6 build, no backend, no API layer, no database):

- **Routing**: `react-router-dom` v6 with `HashRouter` (`src/main.tsx`). `src/App.tsx` holds a flat `<Routes>` tree; all authenticated pages nest under a single `<Route element={<Layout />}>` wrapper. Route paths are relative and module-prefixed (`hr/...`, `finance/...`).
- **Layout/nav**: `src/components/Layout.tsx` renders a top header nav (not a sidebar) plus a module-switcher pill, driven by a `NAV: Record<ModuleKey, NavItem[]>` map, `MODULE_LABEL`, and `MODULE_ICON` records. It also hosts global Ctrl+K search (`GlobalSearch`).
- **Auth/permissions**: `src/store.ts`'s `useAuth` Zustand store (persisted to `localStorage` via `zustand/middleware persist`) holds the current role/session. `src/data/roles.ts` defines `RoleId`, `ModuleKey` (`'hr' | 'finance'`), and a `ROLES` array where each role has a `modules: ModuleKey[]` field controlling which top-level modules that role can see/switch into.
- **State management**: `zustand` (`^5.0.15`) is the only state library in use — no Redux, no React Query, no Context-based global store. `src/store.ts` exports two stores: `useAuth` (session) and `useApp` (cross-cutting domain state: leaves, expenses, invoices, candidates, payrollStatus, toasts, plus action methods).
- **Data layer**: `src/data/mock.ts` (662 lines) is simultaneously the types file and the fake data source. All domain types (`Employee`, `EmployeeDetail`, `Invoice`, `Expense`, etc.) and all mock data are defined here, generated deterministically at module load using a seeded PRNG (`mulberry32` in `src/lib/format.ts`) so "random" data is stable across reloads. Selector-style helper functions (`employeeById`, `getEmployeeDetail`, `computePayslip`) live in the same file and act as a pseudo-service layer — everything is synchronous, in-memory, no async/fetch anywhere.
- **UI kit**: `src/components/ui.tsx` is a bespoke Tailwind CSS v4 component kit (`Card`, `Button`, `Modal`, `Table`, `Field`, `Input`, `Select`, `Badge`, `Avatar`, `PageHeader`, `Progress`, `Toasts`, etc.) built directly on Tailwind classes + `clsx`. **There is no shadcn/ui, no MUI, no generated UI primitives** — `ui.tsx` is fully hand-written and is the correct (and only) reuse target for shared components.
- **Charts**: `recharts` via `src/components/charts.tsx`.
- **Icons**: `lucide-react`.
- **No form library** (no react-hook-form/formik) — forms are plain controlled `useState` objects with manual `onChange`/`onSubmit`.
- **No table library** — `Table` in `ui.tsx` is a thin styled `<table>` wrapper taking a `head` array + row children.

## 2. HR patterns worth reusing

Reference module: `src/pages/hr/Employees.tsx` (list) + `src/pages/hr/EmployeeProfile.tsx` (detail).

- **List page shape**: local `useState` for filters (search text, category/department, status, grid/list view toggle); `useMemo` to derive the filtered/sorted rows from the exported mock array. No pagination library — simple client-side filtering over an in-memory array.
- **Add flow via URL param**: the "Add" modal's visibility is controlled by a URL search param (`?new=1`, via `useSearchParams`) rather than local boolean state, making the Add action linkable/bookmarkable. Worth reusing verbatim for Assets.
- **CSV export helper**: `exportCsv` is defined in `Employees.tsx` and already imported/reused by other pages (e.g. `Invoices.tsx`) for Blob/anchor-based CSV download. Reuse this directly rather than writing a new export helper.
- **Two-tier type pattern**: `Employee` (lean list-row shape) vs. `EmployeeDetail` (richer, lazily-generated, cached in a `Map` keyed by id, deterministic via `mulberry32`) — used because employee detail data is comparatively expensive/rich. **Not needed for Assets** — assets are simple flat rows, so a single `Asset` type is sufficient (see §9).
- **Detail page routing**: `hr/employees/:id`, `useParams()` + a synchronous `employeeById(id)` lookup from mock.ts.
- **⚠️ Anti-pattern to avoid**: `Employees.tsx`'s Add-modal submit handler **directly mutates the exported mock array** (`employees.unshift(e)`) and forces a re-render via a local counter (`force(n => n+1)`), bypassing Zustand entirely. This is inconsistent with how Invoices/Expenses are handled (see §3) and should **not** be copied for Assets — it's legacy inconsistency in this codebase, not a convention to propagate.
- **Existing asset-like data**: `getEmployeeDetail()` in `mock.ts` currently generates a per-employee `devices: { name, model, serial, assignedOn, kind }[]` array inline. This is the closest existing analog to a first-class Asset and should become derived from the new top-level `assets` array (see §9) rather than continuing to be generated independently — otherwise the app would have two disconnected sources of "what equipment does this employee have."

## 3. Finance patterns worth reusing

Reference: Invoices/Expenses, defined in `src/store.ts`'s `useApp` slice (backing `src/pages/finance/Invoices.tsx`, `Expenses.tsx`).

- **Store-slice CRUD pattern** (the one to follow for Assets): domain array lives directly in `useApp`'s Zustand state (not the raw-mutable-export pattern from Employees), with typed action methods (e.g. `setInvoiceStatus`, `addExpense`) that update state immutably (`.map`/spread) and call `get().toast(...)` for user feedback. This is the correct, consistent precedent for adding a mutable, addressable domain entity.
- **Dashboard stat-tile + chart layout**: `FinanceDashboard.tsx` (and `HrDashboard.tsx`) use a row of stat tiles (animated via `CountUp`) plus one or two `recharts`-based charts from `components/charts.tsx`. Assets' dashboard should follow this same layout, just lighter (no trend lines needed for a first version).

## 4. Shared components Assets should reuse

All from `src/components/ui.tsx` — do not create new low-level UI primitives:

- `PageHeader` — page title/breadcrumb header, used on every list/detail page.
- `Card` — container for stat tiles, detail sections.
- `Table` — list-view rendering (head array + row children).
- `Modal` — Add/Edit/Assign dialogs (controlled `open`/`onClose`/`title`/`width` props, not routed).
- `Field`, `Input`, `Select` — form fields inside modals.
- `Badge` — status pills (Available/Assigned/Maintenance/Retired), same pattern as Employee status / Invoice status badges.
- `Avatar` — if showing assigned-employee avatar on asset rows/detail.
- `Button` — actions throughout.
- `Progress`, `Toasts` — reused as needed (toast on every mutating action, matching Invoices/Expenses/Employees conventions).
- `components/charts.tsx` (recharts wrappers) for the dashboard category breakdown.
- `lucide-react` icons — e.g. `Laptop`, already imported elsewhere (`EmployeeProfile.tsx`), safe to reuse for the Assets nav icon.

**Do not modify any of these shared files' existing exports** — only add new usages/imports.

## 5. Routing integration points

- `src/App.tsx`: add new `<Route>` entries inside the existing shared `<Route element={<Layout />}>` block. Paths mirror the `hr/employees` + `hr/employees/:id` nesting convention: `assets` (dashboard), `assets/inventory` (list), `assets/inventory/:id` (detail).
- No index-route or catch-all changes needed — the existing `*` → `/hr` redirect and root `index` → `/hr` redirect are unaffected by adding a third module.

## 6. Navigation integration points

- `src/components/Layout.tsx`:
  - `NAV: Record<ModuleKey, NavItem[]>` needs a new `assets` key with its own link list (Dashboard, Inventory).
  - `MODULE_LABEL` and `MODULE_ICON` records need `assets` entries for the module-switcher pill.
  - **Required, easy-to-miss fix**: the module-detection logic currently hardcodes `pathname.startsWith('/finance') ? 'finance' : 'hr'` — a binary check with no `assets` branch. This must be extended (e.g. add an `/assets` branch) or every Assets page will incorrectly render the HR nav pills instead of its own.
  - `GlobalSearch` (Ctrl+K) currently searches only `employees` and `invoices` arrays pulled from `mock.ts`. Extending it to also search `assets` is optional but consistent with existing UX (same result-row shape: `{ key, title, sub, to }`).

## 7. Permission integration points

- `src/data/roles.ts`: `ModuleKey` union type must add `'assets'`. Each entry in the `ROLES` array has a `modules: ModuleKey[]` field — add `'assets'` to whichever roles should see it (this repo currently only distinguishes at the module-visibility level, there's no finer-grained per-action permission system to worry about).
- No other permission layer exists (no route guards beyond what's driven by `modules[]`/nav visibility, no per-field permission checks) — this is the full extent of "permissions" in this app.

## 8. Mock-data conventions

- All types + data collocated in one file: `src/data/mock.ts`.
- Data is generated at module load time via array-builder patterns (`Array.from({ length: N }, (_, i) => ...)`) using the shared seeded RNG `mulberry32` from `src/lib/format.ts`, so mock data is deterministic across reloads (not truly random, not persisted).
- Cross-entity relationships are represented by **plain foreign-key-style string ids** stored on the "owning" side, resolved via small lookup/selector functions (e.g. `employeeById(id)`) rather than any ORM/relation abstraction. The existing `devices` field on `EmployeeDetail` is the closest current example of this pattern (informally) — Assets should invert it: `Asset.assignedTo?: Employee['id']` is the source of truth, and `EmployeeDetail.devices` becomes a filtered view over `assets`.
- Lazily-computed/derived per-entity detail (like `EmployeeDetail`) is cached in a `Map` keyed by id to avoid recomputation — only needed when detail generation is non-trivial; not needed for the simpler `Asset` shape.

## 9. State management conventions

Two competing patterns currently coexist for "list of mutable domain rows":

1. **Zustand store slice** (Invoices, Expenses, Leave — in `useApp`): array lives in store state, action methods mutate immutably, toast on change. **Recommended pattern for Assets.**
2. **Raw exported-array mutation** (Employees): array lives in `mock.ts`, pages mutate it directly and force re-renders with a local counter. **Legacy inconsistency, not to be extended.**

Recommendation for Assets: add an `assets: Asset[]` field plus `addAsset`, `assignAsset`, `unassignAsset`, `setAssetStatus`, `retireAsset` actions to `useApp` in `src/store.ts`, following pattern (1) exactly. This satisfies the "React state/in-memory state only, no persistence, no Redux/React Query" constraint while staying consistent with the codebase's own established (better) precedent, rather than introducing a new state mechanism.

## 10. Status badges

Status badges (Employee status, Invoice status, etc.) are rendered via the shared `Badge` component from `ui.tsx`, typically with a small local mapping from status string → color/variant. Assets should follow the same approach: a `STATUS_COLOR: Record<AssetStatus, ...>`-style map local to the Assets pages (or colocated near `ASSET_CATEGORIES` in `mock.ts` if reused across multiple Assets pages), feeding `<Badge>`.

## 11. Dashboard/stat cards

Both `HrDashboard.tsx` and `FinanceDashboard.tsx` follow: a row of `Card`-wrapped stat tiles with `CountUp`-animated numbers, followed by one or two `recharts` charts (via `components/charts.tsx`) for breakdowns/trends. The Assets dashboard should reuse this exact layout: total/assigned/available/maintenance counts as stat tiles, plus a category breakdown chart (donut or grouped bar).

## 12. In-memory CRUD/editing

- "Create": modal form with local `useState` for form fields, manual `onSubmit`, no validation library (light manual checks only where present).
- "Update"/status transitions: either direct object mutation (Employees, legacy) or Zustand action methods that `.map` over the array producing a new array with one row replaced (Invoices/Expenses, recommended).
- "Delete": not really used elsewhere (no hard-delete patterns found) — for Assets, "Retired" status effectively serves as a soft-delete, consistent with not introducing new state-removal patterns.
- All of this is pure client-side/in-memory; there is no persistence step, so a page refresh always resets to the deterministic seeded mock state — expected and consistent with the rest of the app.

## 13. README/screenshots

No `README.md` exists at the repository root currently, and no screenshot-maintenance process was found. Nothing to integrate with for this module — can be skipped.

## 14. Recommended Assets folder structure

```
src/pages/assets/
  AssetsDashboard.tsx   # route: assets
  Assets.tsx            # route: assets/inventory (list, filters, add modal, CSV export)
  AssetDetail.tsx        # route: assets/inventory/:id (detail + assign/unassign/status actions)
```

Plus edits (no new top-level folders) to: `src/data/mock.ts`, `src/store.ts`, `src/data/roles.ts`, `src/components/Layout.tsx`, `src/App.tsx`.

## 15. Recommended implementation order

1. `src/data/mock.ts` — add `AssetCategory`, `AssetStatus`, `Asset` types, `ASSET_CATEGORIES` const, generated `assets` array, `assetById` selector. Rewire `getEmployeeDetail()`'s `devices` field to derive from `assets` (verify `EmployeeProfile.tsx` still renders correctly, since this is a shared-file change with a downstream consumer).
2. `src/store.ts` — add the `assets` slice + actions to `useApp`, importing from the updated `mock.ts`.
3. `src/data/roles.ts` — extend `ModuleKey`, update role `modules[]` arrays.
4. `src/pages/assets/AssetsDashboard.tsx`, `Assets.tsx`, `AssetDetail.tsx` — build pages against the now-available store/types, copying structure from `Employees.tsx`/`EmployeeProfile.tsx`/`HrDashboard.tsx` but using the store (not direct mutation).
5. `src/App.tsx` — wire up the three routes + imports.
6. `src/components/Layout.tsx` — add `NAV.assets`, `MODULE_LABEL`/`MODULE_ICON`, fix the module-detection ternary, optionally extend `GlobalSearch`.
7. Manual verification pass (role-based visibility, route navigation, CRUD actions, employee-profile device rendering still correct, `tsc`/build clean).

Doing the data/store layer first (steps 1–3) before any pages means the pages can be built and visually verified against real (mock) data immediately, rather than needing throwaway stub data.

## 16. Risks / pitfalls

- **Shared-file blast radius**: `mock.ts` and `Layout.tsx` are both used by every existing module. Changes there (especially the `getEmployeeDetail().devices` rewire and the module-detection ternary) must be verified not to regress HR/Finance pages — these are the two edits with the highest chance of an unintended side effect.
- **Don't propagate the Employees direct-mutation anti-pattern** — easy to copy-paste from `Employees.tsx` without noticing it bypasses the store; must deliberately switch to store actions.
- **Module-detection ternary is a silent failure mode** — if missed, `/assets/*` pages will render but show the wrong (HR) nav pills, which is easy to overlook visually since the page content itself would still work.
- **Role/module gating** — must add `'assets'` to the correct roles' `modules[]` arrays or the module will be unreachable via nav (routes would still work if navigated to directly, which could mask the oversight during testing).
- **No persistence is expected/desired** — must resist the urge to add `localStorage` persistence to the new store slice "for consistency with `useAuth`"; `useApp`'s other slices (invoices/expenses) are *not* persisted, and Assets should match that, not `useAuth`.
- **Type churn in `mock.ts`** — adding `Asset` types and reassigning `EmployeeDetail.devices`'s source could produce TypeScript errors in `EmployeeProfile.tsx` if the shape isn't kept compatible; a full `tsc`/build check after step 1 is important before proceeding.

## Summary — closest existing files to copy/adapt

| New Assets file | Closest existing file to copy/adapt from |
|---|---|
| `src/pages/assets/Assets.tsx` (list) | `src/pages/hr/Employees.tsx` (filters, view toggle, `?new=1` add modal, CSV export) — but switch mutation to Zustand store actions instead of direct array mutation |
| `src/pages/assets/AssetDetail.tsx` | `src/pages/hr/EmployeeProfile.tsx` (route/param pattern, detail card layout, quick-action buttons) — simplified, no lazy-detail caching needed |
| `src/pages/assets/AssetsDashboard.tsx` | `src/pages/finance/FinanceDashboard.tsx` / `src/pages/hr/HrDashboard.tsx` (stat-tile row + chart layout) |
| Asset type + mock data | `Invoice`/`Expense` types and generators in `src/data/mock.ts` (single-tier, not `Employee`/`EmployeeDetail`'s two-tier pattern) |
| Assets store slice | `useApp`'s existing `invoices`/`expenses` slice + actions in `src/store.ts` (not Employees' direct-mutation pattern) |

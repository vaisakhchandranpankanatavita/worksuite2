# Industry-configurable Worksuite — design

Goal: one app for any kind of company (IT, construction, manufacturing, services…). Everything that varies by industry is configuration, owned by a single **superadmin**, not code.

Decisions (approved by the owner: "auto approve everything"):
- One company per deployment/database (no tenant layer).
- Approach 1: **industry profile + custom fields**. A profile seeds defaults; everything it seeds stays editable.

## Users & access
- A fresh database has exactly one user, the superadmin. Credentials come from `SUPERADMIN_EMAIL` / `SUPERADMIN_PASSWORD`; with no password set a random one is generated and printed once. No demo accounts are created.
- `users.is_superadmin` marks the superadmin (set only by bootstrap; never grantable). `users.read_only` lists modules where a user can look but not change. Write access = `modules − read_only`.
- Superadmin-only (enforced in `server/app.ts`/`server/admin.ts`): user create/edit/deactivate/reset-password, `orgConfig`, `customFields`, data reseed. A superadmin account can't be deactivated or have its access cut.
- Existing databases: the old `admin` demo user is promoted to superadmin on migration.

## Configuration (stored in the existing `settings` table; readable by every signed-in user)
- `orgConfig`: industry, company name, currency + locale, departments, terminology (client / project, singular + plural), project code prefix, `configured` flag.
- `customFields`: per entity (`employees`, `projects`, `assets`, `invoices`) a list of `{ key, label, type: text|number|date|select|yesno, options?, required? }`.
- Values live on the record as `custom: { [key]: value }` (records are already JSONB, so no schema change).
- `src/data/industries.ts` holds the profiles (generic, IT, construction, manufacturing, professional services) and is shared by server and client.

## Client
- Hydrate writes config into module state; currency/locale drive `fmtMoney`/`fmtCompact`; `DEPARTMENTS` is replaced in place; terminology is read via `term()`. Saving config reloads the app so every module-level read is fresh.
- `CustomFieldInputs` (forms, with required validation) and `CustomFieldRows` (detail pages) render from the definitions.
- `/settings` (superadmin only): Organization (industry preset, company, currency, departments, terms, code prefix), Custom fields, Users.
- First superadmin sign-in with `configured = false` lands on Settings to pick an industry.

## Not in scope (stated up-front)
- Multi-company per database, invites / password-reset emails, forced password change.
- Hiding edit buttons for read-only users (server refuses the write; UI shows the failure toast).
- India-specific payroll statutory deductions (PF/ESI/TDS) and the seeded demo data content stay as they are.

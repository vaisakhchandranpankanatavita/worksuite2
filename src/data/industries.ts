/**
 * Everything that varies by industry, as plain data shared by the server (validation, defaults) and the
 * client (forms, labels, formatting). A profile only seeds defaults — the superadmin can edit all of it.
 */

export type FieldType = 'text' | 'number' | 'date' | 'select' | 'yesno'
export type FieldEntity = 'employees' | 'projects' | 'assets' | 'invoices'
export const FIELD_ENTITIES: { key: FieldEntity; label: string }[] = [
  { key: 'employees', label: 'Employees' },
  { key: 'projects', label: 'Projects' },
  { key: 'assets', label: 'Assets' },
  { key: 'invoices', label: 'Invoices' },
]
export const FIELD_TYPES: { key: FieldType; label: string }[] = [
  { key: 'text', label: 'Text' },
  { key: 'number', label: 'Number' },
  { key: 'date', label: 'Date' },
  { key: 'select', label: 'Dropdown' },
  { key: 'yesno', label: 'Yes / No' },
]

export interface FieldDef {
  /** Stable storage key (letters, digits, underscore). Never changes once records use it. */
  key: string
  label: string
  type: FieldType
  /** For `select` fields. */
  options?: string[]
  required?: boolean
}
export type CustomFieldDefs = Record<FieldEntity, FieldDef[]>
export type CustomValues = Record<string, string | number | boolean>

export interface Term { one: string; many: string }
export interface Terms { client: Term; project: Term }

export type IndustryId = 'generic' | 'it' | 'construction' | 'manufacturing' | 'services'

export interface OrgConfig {
  industry: IndustryId
  /** False until the superadmin has made a first choice (drives the first-run redirect). */
  configured: boolean
  companyName: string
  currency: string
  locale: string
  departments: string[]
  terms: Terms
  /** Letters and a trailing dash, e.g. "PRJ-". New project codes are `<prefix><number>`. */
  projectCodePrefix: string
}

export const CURRENCIES = [
  { code: 'INR', locale: 'en-IN', label: 'Indian Rupee (₹)' },
  { code: 'USD', locale: 'en-US', label: 'US Dollar ($)' },
  { code: 'EUR', locale: 'de-DE', label: 'Euro (€)' },
  { code: 'GBP', locale: 'en-GB', label: 'Pound Sterling (£)' },
  { code: 'AED', locale: 'en-AE', label: 'UAE Dirham (AED)' },
  { code: 'AUD', locale: 'en-AU', label: 'Australian Dollar (A$)' },
  { code: 'CAD', locale: 'en-CA', label: 'Canadian Dollar (C$)' },
  { code: 'SGD', locale: 'en-SG', label: 'Singapore Dollar (S$)' },
] as const

export interface IndustryProfile {
  id: IndustryId
  label: string
  blurb: string
  departments: string[]
  terms: Terms
  projectCodePrefix: string
  fields: CustomFieldDefs
}

const t = (one: string, many = `${one}s`): Term => ({ one, many })
const yes = (key: string, label: string): FieldDef => ({ key, label, type: 'yesno' })
const text = (key: string, label: string, required?: boolean): FieldDef => ({ key, label, type: 'text', required })
const num = (key: string, label: string): FieldDef => ({ key, label, type: 'number' })
const date = (key: string, label: string): FieldDef => ({ key, label, type: 'date' })
const pick = (key: string, label: string, options: string[]): FieldDef => ({ key, label, type: 'select', options })

export const NO_FIELDS: CustomFieldDefs = { employees: [], projects: [], assets: [], invoices: [] }

export const INDUSTRIES: IndustryProfile[] = [
  {
    id: 'generic',
    label: 'General business',
    blurb: 'A neutral starting point — add your own fields.',
    departments: ['Operations', 'Sales', 'Finance', 'Human Resources', 'Administration'],
    terms: { client: t('Client'), project: t('Project') },
    projectCodePrefix: 'PRJ-',
    fields: NO_FIELDS,
  },
  {
    id: 'it',
    label: 'IT & software',
    blurb: 'Clients, delivery phases, licences and laptops.',
    departments: ['Engineering', 'Sales', 'Marketing', 'Finance', 'Human Resources', 'Operations', 'Customer Success', 'Design'],
    terms: { client: t('Client'), project: t('Project') },
    projectCodePrefix: 'PRJ-',
    fields: {
      employees: [text('skills', 'Primary skills')],
      projects: [text('tech_stack', 'Tech stack'), pick('billing_model', 'Billing model', ['Time & material', 'Fixed price', 'Retainer'])],
      assets: [text('license_key', 'Licence key'), text('os', 'Operating system')],
      invoices: [text('po_number', 'PO number')],
    },
  },
  {
    id: 'construction',
    label: 'Construction & engineering',
    blurb: 'Sites, permits, trades, plant and equipment, RA bills.',
    departments: ['Site Operations', 'Civil & Structural', 'MEP', 'Planning', 'Procurement', 'Quantity Surveying', 'Safety (HSE)', 'Finance', 'Human Resources'],
    terms: { client: t('Client'), project: t('Project') },
    projectCodePrefix: 'SITE-',
    fields: {
      employees: [pick('trade', 'Trade', ['Site engineer', 'Supervisor', 'Mason', 'Electrician', 'Plumber', 'Operator', 'Labour', 'Other']), date('safety_cert_expiry', 'Safety certificate expiry'), text('assigned_site', 'Assigned site')],
      projects: [text('site_address', 'Site address', true), text('permit_no', 'Permit number'), pick('contract_type', 'Contract type', ['Lump sum', 'Unit rate', 'Cost plus']), num('retention_pct', 'Retention (%)')],
      assets: [num('engine_hours', 'Engine / usage hours'), text('registration_no', 'Registration number'), date('insurance_expiry', 'Insurance expiry'), yes('operator_certified', 'Certified operator assigned')],
      invoices: [text('boq_ref', 'BOQ reference'), text('ra_bill_no', 'RA bill number')],
    },
  },
  {
    id: 'manufacturing',
    label: 'Manufacturing',
    blurb: 'Customers, work orders, shifts, machines and calibration.',
    departments: ['Production', 'Quality', 'Maintenance', 'Supply Chain', 'R&D', 'Sales', 'Finance', 'Human Resources'],
    terms: { client: t('Customer'), project: t('Work order') },
    projectCodePrefix: 'WO-',
    fields: {
      employees: [pick('shift', 'Shift', ['Morning', 'General', 'Evening', 'Night']), text('skill_grade', 'Skill grade')],
      projects: [text('product_sku', 'Product SKU'), num('batch_size', 'Batch size')],
      assets: [text('machine_id', 'Machine ID'), date('calibration_due', 'Calibration due')],
      invoices: [text('po_number', 'PO number')],
    },
  },
  {
    id: 'services',
    label: 'Professional services',
    blurb: 'Clients, engagements, billable staff.',
    departments: ['Delivery', 'Consulting', 'Business Development', 'Finance', 'Human Resources', 'Operations'],
    terms: { client: t('Client'), project: t('Engagement') },
    projectCodePrefix: 'ENG-',
    fields: {
      employees: [num('billable_rate', 'Billable rate (per hour)'), text('certifications', 'Certifications')],
      projects: [text('partner', 'Engagement partner'), pick('billing_model', 'Billing model', ['Hourly', 'Fixed fee', 'Retainer', 'Success fee'])],
      assets: [],
      invoices: [text('po_number', 'PO number'), text('tax_id', 'Client tax ID')],
    },
  },
]

export const industryById = (id: string) => INDUSTRIES.find((i) => i.id === id) ?? INDUSTRIES[0]

export const FIELD_KEY = /^[a-z][a-z0-9_]{0,31}$/
export const CODE_PREFIX = /^[A-Z]{2,6}-$/

/** Apply an industry profile to an org config, keeping the company's own name and currency. */
export function configFromProfile(base: OrgConfig, p: IndustryProfile): OrgConfig {
  return { ...base, industry: p.id, configured: true, departments: [...p.departments], terms: structuredClone(p.terms), projectCodePrefix: p.projectCodePrefix }
}

export const DEFAULT_ORG_CONFIG: OrgConfig = {
  ...configFromProfile(
    { industry: 'it', configured: false, companyName: 'Worksuite Technologies Pvt. Ltd.', currency: 'INR', locale: 'en-IN', departments: [], terms: INDUSTRIES[1].terms, projectCodePrefix: 'PRJ-' },
    INDUSTRIES[1],
  ),
  configured: false,
}
export const DEFAULT_CUSTOM_FIELDS: CustomFieldDefs = structuredClone(INDUSTRIES[1].fields)

/* ── Validation (used by the server on write; cheap enough to share) ── */

const isStr = (v: unknown): v is string => typeof v === 'string'
const bad = (m: string): never => { throw new Error(m) }

function checkTerm(v: unknown, what: string): Term {
  const o = v as Term
  if (!o || !isStr(o.one) || !isStr(o.many) || !o.one.trim() || !o.many.trim() || o.one.length > 40 || o.many.length > 40) bad(`${what} needs a singular and plural name`)
  return { one: o.one.trim(), many: o.many.trim() }
}

/** Returns a cleaned copy or throws an Error with a user-facing message. */
export function parseOrgConfig(v: unknown): OrgConfig {
  const o = v as OrgConfig
  if (!o || typeof o !== 'object') bad('Expected an organization config object')
  if (!INDUSTRIES.some((i) => i.id === o.industry)) bad('Unknown industry')
  if (!isStr(o.companyName) || !o.companyName.trim() || o.companyName.length > 120) bad('Company name is required')
  const cur = CURRENCIES.find((c) => c.code === o.currency)
  if (!cur) bad('Unsupported currency')
  if (!Array.isArray(o.departments) || o.departments.length === 0 || o.departments.length > 40) bad('Add at least one department')
  const departments = o.departments.map((d) => (isStr(d) ? d.trim() : '')).filter(Boolean)
  if (departments.length !== o.departments.length || new Set(departments.map((d) => d.toLowerCase())).size !== departments.length) bad('Department names must be non-empty and unique')
  if (!isStr(o.projectCodePrefix) || !CODE_PREFIX.test(o.projectCodePrefix)) bad('Code prefix must be 2–6 capital letters followed by a dash, e.g. "SITE-"')
  return {
    industry: o.industry,
    configured: true,
    companyName: o.companyName.trim(),
    currency: cur!.code,
    locale: cur!.locale,
    departments,
    terms: { client: checkTerm(o.terms?.client, 'Client term'), project: checkTerm(o.terms?.project, 'Project term') },
    projectCodePrefix: o.projectCodePrefix,
  }
}

export function parseCustomFields(v: unknown): CustomFieldDefs {
  const o = v as CustomFieldDefs
  if (!o || typeof o !== 'object') bad('Expected field definitions')
  const out = {} as CustomFieldDefs
  for (const { key: entity, label: entityLabel } of FIELD_ENTITIES) {
    const list = o[entity] ?? []
    if (!Array.isArray(list) || list.length > 30) bad(`${entityLabel}: too many fields (max 30)`)
    const seen = new Set<string>()
    out[entity] = list.map((f): FieldDef => {
      if (!f || !isStr(f.key) || !FIELD_KEY.test(f.key)) bad(`${entityLabel}: field keys use lowercase letters, digits and underscores`)
      if (seen.has(f.key)) bad(`${entityLabel}: duplicate field "${f.key}"`)
      seen.add(f.key)
      if (!isStr(f.label) || !f.label.trim() || f.label.length > 60) bad(`${entityLabel}: every field needs a label`)
      if (!FIELD_TYPES.some((x) => x.key === f.type)) bad(`${entityLabel}: unknown field type`)
      const def: FieldDef = { key: f.key, label: f.label.trim(), type: f.type }
      if (f.required) def.required = true
      if (f.type === 'select') {
        const options = (Array.isArray(f.options) ? f.options : []).map((x) => (isStr(x) ? x.trim() : '')).filter(Boolean)
        if (options.length === 0 || new Set(options).size !== options.length) bad(`${entityLabel}: "${f.label}" needs unique dropdown options`)
        def.options = options
      }
      return def
    })
  }
  return out
}

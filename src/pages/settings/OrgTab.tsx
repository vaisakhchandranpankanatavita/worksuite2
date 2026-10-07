import { Plus, X } from 'lucide-react'
import { Button, Card, CardHeader, Field, Input, Select } from '../../components/ui'
import { CURRENCIES, INDUSTRIES, type IndustryProfile, type OrgConfig, type Term } from '../../data/industries'

function TermInputs({ label, value, onChange }: { label: string; value: Term; onChange: (t: Term) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Field label={`${label} (singular)`}><Input value={value.one} maxLength={40} onChange={(e) => onChange({ ...value, one: e.target.value })} /></Field>
      <Field label={`${label} (plural)`}><Input value={value.many} maxLength={40} onChange={(e) => onChange({ ...value, many: e.target.value })} /></Field>
    </div>
  )
}

export default function OrgTab({ org, setOrg, applyProfile }: { org: OrgConfig; setOrg: (o: OrgConfig) => void; applyProfile: (p: IndustryProfile) => void }) {
  const set = <K extends keyof OrgConfig>(k: K, v: OrgConfig[K]) => setOrg({ ...org, [k]: v })
  const setDept = (i: number, v: string) => set('departments', org.departments.map((d, k) => (k === i ? v : d)))

  return (
    <div className="grid gap-4 lg:grid-cols-12">
      <Card className="lg:col-span-12">
        <CardHeader title="Industry" subtitle="Pick the closest match. This fills in departments, wording and custom fields below — everything stays editable." />
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {INDUSTRIES.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => applyProfile(p)}
              className={`rounded-2xl border p-4 text-left transition-all hover:border-ink/40 ${org.industry === p.id ? 'border-ink bg-lime/40' : 'border-line bg-white/70'}`}
            >
              <p className="text-sm font-semibold">{p.label}</p>
              <p className="mt-1 text-xs text-ash">{p.blurb}</p>
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs text-ash">Choosing an industry replaces your departments, wording, code prefix and custom fields with its defaults (nothing is saved until you press Save).</p>
      </Card>

      <Card className="lg:col-span-6">
        <CardHeader title="Company" />
        <div className="mt-4 grid gap-4">
          <Field label="Company name"><Input value={org.companyName} maxLength={120} onChange={(e) => set('companyName', e.target.value)} /></Field>
          <Field label="Currency">
            <Select className="w-full !rounded-xl" value={org.currency} onChange={(e) => set('currency', e.target.value)}>
              {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
            </Select>
          </Field>
          <Field label="Code prefix for new records">
            <Input value={org.projectCodePrefix} maxLength={7} onChange={(e) => set('projectCodePrefix', e.target.value.toUpperCase())} placeholder="e.g. SITE-" />
          </Field>
        </div>
      </Card>

      <Card className="lg:col-span-6">
        <CardHeader title="Wording" subtitle="What your company calls things. Shown across menus, forms and headings." />
        <div className="mt-4 grid gap-4">
          <TermInputs label="Client" value={org.terms.client} onChange={(t) => set('terms', { ...org.terms, client: t })} />
          <TermInputs label="Project" value={org.terms.project} onChange={(t) => set('terms', { ...org.terms, project: t })} />
        </div>
      </Card>

      <Card className="lg:col-span-12">
        <CardHeader title="Departments" subtitle="Used for employees, budgets and filters." />
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {org.departments.map((d, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input value={d} maxLength={60} onChange={(e) => setDept(i, e.target.value)} aria-label={`Department ${i + 1}`} />
              <button type="button" disabled={org.departments.length === 1} onClick={() => set('departments', org.departments.filter((_, k) => k !== i))} className="grid size-9 shrink-0 place-items-center rounded-xl text-ash hover:bg-rose/40 disabled:opacity-30" aria-label={`Remove ${d || 'department'}`}>
                <X size={15} />
              </button>
            </div>
          ))}
        </div>
        <Button type="button" size="sm" variant="ghost" className="mt-3" onClick={() => set('departments', [...org.departments, ''])}><Plus size={14} /> Add department</Button>
      </Card>
    </div>
  )
}

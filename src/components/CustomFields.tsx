import { useState, type ReactNode } from 'react'
import { appSettings } from '../data/registry'
import type { CustomValues, FieldDef, FieldEntity } from '../data/industries'
import { fmtDate } from '../lib/format'
import { Button, Field, Input, Select } from './ui'

/** The company's custom fields for a record type, as configured in Settings. */
export const fieldDefs = (entity: FieldEntity): FieldDef[] => appSettings.customFields[entity] ?? []

/** Drops empty values so records only carry what was filled in. */
export function cleanValues(entity: FieldEntity, values: CustomValues): CustomValues | undefined {
  const out: CustomValues = {}
  for (const f of fieldDefs(entity)) {
    const v = values[f.key]
    if (v !== undefined && v !== '') out[f.key] = v
  }
  return Object.keys(out).length ? out : undefined
}

/** The label of the first required field left empty, or null when the form is complete. */
export function missingRequired(entity: FieldEntity, values: CustomValues): string | null {
  return fieldDefs(entity).find((f) => f.required && (values[f.key] === undefined || values[f.key] === ''))?.label ?? null
}

/** Form inputs for every custom field of `entity`. Renders nothing when none are configured. */
export function CustomFieldInputs({ entity, values, onChange }: { entity: FieldEntity; values: CustomValues; onChange: (next: CustomValues) => void }) {
  const defs = fieldDefs(entity)
  if (defs.length === 0) return null
  const set = (key: string, v: string | number | boolean | undefined) => {
    const next = { ...values }
    if (v === undefined || v === '') delete next[key]
    else next[key] = v
    onChange(next)
  }
  return (
    <>
      {defs.map((f) => {
        const v = values[f.key]
        const label = f.required ? `${f.label} *` : f.label
        return (
          <Field key={f.key} label={label}>
            {f.type === 'select' ? (
              <Select className="w-full" value={String(v ?? '')} onChange={(e) => set(f.key, e.target.value)}>
                <option value="">—</option>
                {f.options?.map((o) => <option key={o}>{o}</option>)}
              </Select>
            ) : f.type === 'yesno' ? (
              <Select className="w-full" value={v === undefined ? '' : v ? 'yes' : 'no'} onChange={(e) => set(f.key, e.target.value === '' ? undefined : e.target.value === 'yes')}>
                <option value="">—</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </Select>
            ) : f.type === 'number' ? (
              <Input type="number" value={v === undefined ? '' : String(v)} onChange={(e) => set(f.key, e.target.value === '' ? undefined : Number(e.target.value))} />
            ) : (
              <Input type={f.type === 'date' ? 'date' : 'text'} value={String(v ?? '')} onChange={(e) => set(f.key, e.target.value)} />
            )}
          </Field>
        )
      })}
    </>
  )
}

function display(f: FieldDef, v: string | number | boolean): ReactNode {
  if (f.type === 'yesno') return v ? 'Yes' : 'No'
  if (f.type === 'date') return fmtDate(String(v))
  if (f.type === 'number') return Number(v).toLocaleString()
  return String(v)
}

/**
 * The custom fields a record has values for. With `onSave`, the viewer can also edit them in place
 * (and the block shows even when empty, so values can be added to records created before the field existed).
 */
export function CustomFieldRows({ entity, values, onSave }: { entity: FieldEntity; values?: CustomValues; onSave?: (next: CustomValues | undefined) => void }) {
  const [draft, setDraft] = useState<CustomValues | null>(null)
  const defs = fieldDefs(entity)
  const rows = defs.filter((f) => values?.[f.key] !== undefined)
  if (defs.length === 0 || (rows.length === 0 && !onSave)) return null

  if (draft && onSave) {
    const missing = missingRequired(entity, draft)
    return (
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2"><CustomFieldInputs entity={entity} values={draft} onChange={setDraft} /></div>
        {missing && <p className="text-xs text-rose-deep">{missing} is required</p>}
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={() => setDraft(null)}>Cancel</Button>
          <Button size="sm" disabled={!!missing} onClick={() => { onSave(cleanValues(entity, draft)); setDraft(null) }}>Save</Button>
        </div>
      </div>
    )
  }
  return (
    <div>
      {rows.length > 0 && (
        <dl className="grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
          {rows.map((f) => (
            <div key={f.key} className="flex items-baseline justify-between gap-3 border-b border-line/60 pb-1.5 text-sm">
              <dt className="text-ash">{f.label}</dt>
              <dd className="text-right font-semibold">{display(f, values![f.key])}</dd>
            </div>
          ))}
        </dl>
      )}
      {onSave && (
        <button type="button" onClick={() => setDraft({ ...values })} className="mt-2 text-xs font-bold text-ink underline-offset-2 hover:underline">
          {rows.length > 0 ? 'Edit details' : 'Add details'}
        </button>
      )}
    </div>
  )
}

import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Button, Card, CardHeader, Field, Input, Segmented, Select } from '../../components/ui'
import { FIELD_ENTITIES, FIELD_TYPES, type CustomFieldDefs, type FieldDef, type FieldEntity, type FieldType } from '../../data/industries'

/** "Permit number" → "permit_number", made unique among `taken`. */
function keyFrom(label: string, taken: string[]) {
  const base = label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').replace(/^[0-9]+/, '').slice(0, 28) || 'field'
  let key = base
  for (let n = 2; taken.includes(key); n++) key = `${base}_${n}`
  return key
}

export default function FieldsTab({ fields, setFields }: { fields: CustomFieldDefs; setFields: (f: CustomFieldDefs) => void }) {
  const [entity, setEntity] = useState<FieldEntity>('projects')
  const [label, setLabel] = useState('')
  const [type, setType] = useState<FieldType>('text')
  const list = fields[entity]
  const setList = (next: FieldDef[]) => setFields({ ...fields, [entity]: next })
  const patch = (i: number, p: Partial<FieldDef>) => setList(list.map((f, k) => (k === i ? { ...f, ...p } : f)))
  const move = (i: number, d: -1 | 1) => {
    const next = [...list]
    ;[next[i], next[i + d]] = [next[i + d], next[i]]
    setList(next)
  }
  const add = () => {
    if (!label.trim()) return
    setList([...list, { key: keyFrom(label, list.map((f) => f.key)), label: label.trim(), type, ...(type === 'select' ? { options: ['Option 1', 'Option 2'] } : {}) }])
    setLabel('')
  }
  const tabs = FIELD_ENTITIES.map((e) => e.label)

  return (
    <Card>
      <CardHeader title="Custom fields" subtitle="Extra details your industry needs on each kind of record. They appear on the create form and the record's page." />
      <div className="mt-4">
        <Segmented value={FIELD_ENTITIES.find((e) => e.key === entity)!.label} options={tabs} onChange={(l) => setEntity(FIELD_ENTITIES.find((e) => e.label === l)!.key)} />
      </div>

      <div className="mt-4 space-y-2">
        {list.length === 0 && <p className="rounded-2xl border border-dashed border-line/70 py-8 text-center text-sm text-ash/70">No custom fields yet.</p>}
        {list.map((f, i) => (
          <div key={f.key} className="grid items-center gap-2 rounded-2xl border border-line/70 bg-white/60 p-3 md:grid-cols-[1.4fr_130px_1.6fr_auto_auto]">
            <div>
              <Input value={f.label} maxLength={60} onChange={(e) => patch(i, { label: e.target.value })} aria-label="Field label" />
              <p className="mt-1 pl-1 text-[10px] text-ash">key: {f.key}</p>
            </div>
            <Select className="!rounded-xl" value={f.type} aria-label="Field type" onChange={(e) => {
              const t = e.target.value as FieldType
              patch(i, { type: t, options: t === 'select' ? f.options ?? ['Option 1', 'Option 2'] : undefined })
            }}>
              {FIELD_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
            </Select>
            {f.type === 'select'
              ? <Input defaultValue={(f.options ?? []).join(', ')} onBlur={(e) => patch(i, { options: e.target.value.split(',').map((o) => o.trim()).filter(Boolean) })} placeholder="Options, separated by commas" aria-label="Dropdown options" />
              : <span className="hidden md:block" />}
            <label className="flex items-center gap-1.5 text-xs text-ash"><input type="checkbox" className="accent-ink" checked={!!f.required} onChange={(e) => patch(i, { required: e.target.checked || undefined })} /> Required</label>
            <div className="flex items-center justify-end gap-0.5">
              <button type="button" disabled={i === 0} onClick={() => move(i, -1)} className="grid size-8 place-items-center rounded-lg text-ash hover:bg-soft disabled:opacity-30" aria-label="Move up"><ChevronUp size={15} /></button>
              <button type="button" disabled={i === list.length - 1} onClick={() => move(i, 1)} className="grid size-8 place-items-center rounded-lg text-ash hover:bg-soft disabled:opacity-30" aria-label="Move down"><ChevronDown size={15} /></button>
              <button type="button" onClick={() => setList(list.filter((_, k) => k !== i))} className="grid size-8 place-items-center rounded-lg text-ash hover:bg-rose/40" aria-label={`Remove ${f.label}`}><Trash2 size={15} /></button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 grid items-end gap-2 sm:grid-cols-[1fr_160px_auto]">
        <Field label="New field label"><Input value={label} maxLength={60} onChange={(e) => setLabel(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } }} placeholder="e.g. Permit number" /></Field>
        <Field label="Type">
          <Select className="w-full !rounded-xl" value={type} onChange={(e) => setType(e.target.value as FieldType)}>
            {FIELD_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
          </Select>
        </Field>
        <Button type="button" onClick={add} disabled={!label.trim()}><Plus size={15} /> Add field</Button>
      </div>
      <p className="mt-3 text-xs text-ash">Removing a field hides it; values already saved on records are kept in case you add it back with the same key.</p>
    </Card>
  )
}

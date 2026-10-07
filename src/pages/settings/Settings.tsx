import { useEffect, useState } from 'react'
import { Button, PageHeader, Segmented } from '../../components/ui'
import { appSettings } from '../../data/registry'
import { configFromProfile, type CustomFieldDefs, type IndustryProfile, type OrgConfig } from '../../data/industries'
import { api } from '../../lib/api'
import { useApp, useAuth } from '../../store'
import AccountTab from './AccountTab'
import FieldsTab from './FieldsTab'
import OrgTab from './OrgTab'
import ThemeTab from './ThemeTab'
import UsersTab from './UsersTab'
import { applyTheme } from '../../lib/theme'

const ADMIN_TABS = ['Organization', 'Custom fields', 'Appearance', 'Users', 'Account'] as const
type Tab = (typeof ADMIN_TABS)[number]

/** Company configuration (superadmin) and password change (everyone). */
export default function Settings() {
  const isSuperadmin = useAuth((s) => s.user?.isSuperadmin ?? false)
  const toast = useApp((s) => s.toast)
  const configured = appSettings.orgConfig.configured
  const [tab, setTab] = useState<Tab>(isSuperadmin ? 'Organization' : 'Account')
  const [org, setOrg] = useState<OrgConfig>(() => structuredClone(appSettings.orgConfig))
  const [fields, setFields] = useState<CustomFieldDefs>(() => structuredClone(appSettings.customFields))
  const [theme, setTheme] = useState(appSettings.theme)
  const [saving, setSaving] = useState(false)

  const dirty = JSON.stringify(org) !== JSON.stringify(appSettings.orgConfig) || JSON.stringify(fields) !== JSON.stringify(appSettings.customFields) || theme !== appSettings.theme
  const editsConfig = isSuperadmin && (tab === 'Organization' || tab === 'Custom fields' || tab === 'Appearance')

  function applyProfile(p: IndustryProfile) {
    setOrg(configFromProfile(org, p))
    setFields(structuredClone(p.fields))
    toast(`${p.label} defaults loaded — review, then press Save`, 'info')
  }

  function pickTheme(t: typeof theme) { setTheme(t); applyTheme(t) }

  // Leaving without saving reverts the live preview.
  useEffect(() => () => applyTheme(appSettings.theme), [])

  async function save() {
    setSaving(true)
    try {
      // Terms, formatting and department lists are read at render time, so reload to pick up the saved values everywhere.
      await api.saveSetting('orgConfig', org)
      await api.saveSetting('customFields', fields)
      await api.saveSetting('theme', theme)
      window.location.reload()
    } catch (err) {
      toast((err as Error).message, 'error')
      setSaving(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle={isSuperadmin ? 'Company configuration, custom fields and user access' : 'Your account'}
        actions={editsConfig && <Button onClick={() => void save()} disabled={saving || (configured && !dirty)}>{saving ? 'Saving…' : configured ? 'Save changes' : 'Save and start'}</Button>}
      />
      {isSuperadmin && !configured && (
        <p className="mb-4 rounded-2xl bg-lime/50 px-4 py-3 text-sm">Welcome. Choose your industry below to set up departments, wording and custom fields, then press <b>Save and start</b>. You can change everything later.</p>
      )}
      {isSuperadmin && (
        <div className="mb-4 overflow-x-auto"><Segmented value={tab} options={ADMIN_TABS} onChange={setTab} /></div>
      )}
      {isSuperadmin && tab === 'Organization' && <OrgTab org={org} setOrg={setOrg} applyProfile={applyProfile} />}
      {isSuperadmin && tab === 'Custom fields' && <FieldsTab fields={fields} setFields={setFields} />}
      {isSuperadmin && tab === 'Appearance' && <ThemeTab value={theme} onChange={pickTheme} />}
      {isSuperadmin && tab === 'Users' && <UsersTab />}
      {tab === 'Account' && <AccountTab />}
    </div>
  )
}

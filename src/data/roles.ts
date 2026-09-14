export type ModuleKey = 'hr' | 'finance'
export type RoleId = 'hr' | 'finance' | 'admin'

export interface Role {
  id: RoleId
  label: string
  description: string
  modules: ModuleKey[]
  name: string
  email: string
  photo: string
  hue: number
}

export const ROLES: Role[] = [
  {
    id: 'admin',
    label: 'Super Admin',
    description: 'Full access to People & Finance',
    modules: ['hr', 'finance'],
    name: 'Meera Iyer',
    email: 'meera.iyer@worksuite.io',
    photo: 'https://randomuser.me/api/portraits/women/33.jpg',
    hue: 200,
  },
  {
    id: 'hr',
    label: 'HR Admin',
    description: 'People, attendance & payroll',
    modules: ['hr'],
    name: 'Anita Krishnan',
    email: 'anita.krishnan@worksuite.io',
    photo: 'https://randomuser.me/api/portraits/women/68.jpg',
    hue: 28,
  },
  {
    id: 'finance',
    label: 'Finance Admin',
    description: 'Invoices, expenses & budgets',
    modules: ['finance'],
    name: 'Vikram Nair',
    email: 'vikram.nair@worksuite.io',
    photo: 'https://randomuser.me/api/portraits/men/45.jpg',
    hue: 210,
  },
]

export const roleById = (id: RoleId | null) => ROLES.find((r) => r.id === id) ?? null

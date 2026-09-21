export type ModuleKey = 'hr' | 'finance' | 'assets' | 'projects'
export type RoleId = 'hr' | 'finance' | 'admin' | 'production' | 'pm'

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
    description: 'Full access to People, Finance, Assets & Projects',
    modules: ['hr', 'finance', 'assets', 'projects'],
    name: 'Meera Iyer',
    email: 'meera.iyer@worksuite.io',
    photo: 'https://randomuser.me/api/portraits/women/33.jpg',
    hue: 200,
  },
  {
    id: 'hr',
    label: 'HR Admin',
    description: 'People, attendance & payroll',
    modules: ['hr', 'assets'],
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
  {
    id: 'production',
    label: 'Production Manager',
    description: 'Stock & asset inventory management',
    modules: ['assets'],
    name: 'Rohan Verma',
    email: 'rohan.verma@worksuite.io',
    photo: 'https://randomuser.me/api/portraits/men/22.jpg',
    hue: 95,
  },
  {
    id: 'pm',
    label: 'Project Director',
    description: 'Delivery, timelines & project budgets',
    modules: ['projects', 'assets'],
    name: 'Arjun Malhotra',
    email: 'arjun.malhotra@worksuite.io',
    photo: 'https://randomuser.me/api/portraits/men/52.jpg',
    hue: 160,
  },
]

export const roleById = (id: RoleId | null) => ROLES.find((r) => r.id === id) ?? null

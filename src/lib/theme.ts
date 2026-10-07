import {
  Banknote, BarChart3, Boxes, Briefcase, CalendarCheck, CalendarDays, ClipboardList, Clock, Coins, Contact, FileText, FolderKanban, GanttChart,
  Home, IndianRupee, Laptop, LayoutDashboard, LayoutGrid, LineChart, ListChecks, MonitorSmartphone, Package, PiggyBank, Receipt, ReceiptText,
  ScrollText, Umbrella, UserPlus, UserRoundPlus, Users, Wallet, type LucideIcon,
} from 'lucide-react'
import { create } from 'zustand'
import { DEFAULT_THEME, isThemeId, THEMES, type IconFamily, type ThemeId } from '../data/themes'

const CACHE_KEY = 'ws-theme'

/** Named icon slots used by navigation; each theme picks a family of glyphs for them. */
export type IconKey =
  | 'home' | 'people' | 'attendance' | 'leave' | 'recruit' | 'payroll'
  | 'invoices' | 'expenses' | 'track' | 'budgets' | 'reports'
  | 'inventory' | 'stock' | 'portfolio' | 'timeline'
  | 'hr' | 'finance' | 'assets' | 'projects'

const FAMILIES: Record<IconFamily, Record<IconKey, LucideIcon>> = {
  classic: {
    home: Home, people: Users, attendance: CalendarCheck, leave: PiggyBank, recruit: UserPlus, payroll: Wallet,
    invoices: FileText, expenses: Receipt, track: ListChecks, budgets: IndianRupee, reports: LineChart,
    inventory: ListChecks, stock: Boxes, portfolio: LayoutGrid, timeline: CalendarDays,
    hr: Users, finance: Wallet, assets: Laptop, projects: FolderKanban,
  },
  modern: {
    home: LayoutDashboard, people: Contact, attendance: Clock, leave: Umbrella, recruit: UserRoundPlus, payroll: Banknote,
    invoices: ScrollText, expenses: ReceiptText, track: ClipboardList, budgets: Coins, reports: BarChart3,
    inventory: ClipboardList, stock: Package, portfolio: Briefcase, timeline: GanttChart,
    hr: Contact, finance: Banknote, assets: MonitorSmartphone, projects: Briefcase,
  },
}

export const iconsFor = (theme: ThemeId): Record<IconKey, LucideIcon> => FAMILIES[THEMES.find((t) => t.id === theme)!.icons]

interface ThemeState { theme: ThemeId }
export const useTheme = create<ThemeState>(() => ({ theme: DEFAULT_THEME }))

/** Paint a theme: swaps the CSS variable set (via `data-theme`) and the icon family. Cached locally so the next load has no flash. */
export function applyTheme(id: unknown) {
  const theme = isThemeId(id) ? id : DEFAULT_THEME
  document.documentElement.dataset.theme = theme
  useTheme.setState({ theme })
  try { localStorage.setItem(CACHE_KEY, theme) } catch { /* private mode */ }
}

export const useIcons = () => iconsFor(useTheme((s) => s.theme))

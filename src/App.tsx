import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import SplashScreen from './components/SplashScreen'
import Login from './pages/Login'
import Help from './pages/Help'
import HrDashboard from './pages/hr/HrDashboard'
import Employees from './pages/hr/Employees'
import EmployeeProfile from './pages/hr/EmployeeProfile'
import Attendance from './pages/hr/Attendance'
import Leave from './pages/hr/Leave'
import Recruitment from './pages/hr/Recruitment'
import Payroll from './pages/hr/Payroll'
import FinanceDashboard from './pages/finance/FinanceDashboard'
import Invoices from './pages/finance/Invoices'
import Expenses from './pages/finance/Expenses'
import TrackExpenses from './pages/finance/TrackExpenses'
import Budgets from './pages/finance/Budgets'
import Reports from './pages/finance/Reports'
import AssetsDashboard from './pages/assets/AssetsDashboard'
import Assets from './pages/assets/Assets'
import AssetDetail from './pages/assets/AssetDetail'
import StockList from './pages/assets/StockList'
import ProjectsDashboard from './pages/projects/ProjectsDashboard'
import ProjectList from './pages/projects/ProjectList'
import ProjectTimeline from './pages/projects/ProjectTimeline'
import ProjectDetail from './pages/projects/ProjectDetail'
import { useAuth } from './store'
import { roleById } from './data/roles'

export default function App() {
  const showSplash  = useAuth((s) => s.showSplash)
  const clearSplash = useAuth((s) => s.clearSplash)
  const roleId      = useAuth((s) => s.role)
  const role        = roleById(roleId)

  return (
    <>
      {showSplash && role && (
        <SplashScreen name={role.name} onDone={clearSplash} />
      )}

      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<Layout />}>
          <Route index element={<Navigate to="/hr" replace />} />
          <Route path="help" element={<Help />} />
          <Route path="hr" element={<HrDashboard />} />
          <Route path="hr/employees" element={<Employees />} />
          <Route path="hr/employees/:id" element={<EmployeeProfile />} />
          <Route path="hr/attendance" element={<Attendance />} />
          <Route path="hr/leave" element={<Leave />} />
          <Route path="hr/recruitment" element={<Recruitment />} />
          <Route path="hr/payroll" element={<Payroll />} />
          <Route path="finance" element={<FinanceDashboard />} />
          <Route path="finance/invoices" element={<Invoices />} />
          <Route path="finance/expenses" element={<Expenses />} />
          <Route path="finance/track-expenses" element={<TrackExpenses />} />
          <Route path="finance/budgets" element={<Budgets />} />
          <Route path="finance/reports" element={<Reports />} />
          <Route path="assets" element={<AssetsDashboard />} />
          <Route path="assets/inventory" element={<Assets />} />
          <Route path="assets/inventory/:id" element={<AssetDetail />} />
          <Route path="assets/stock" element={<StockList />} />
          <Route path="projects" element={<ProjectsDashboard />} />
          <Route path="projects/portfolio" element={<ProjectList />} />
          <Route path="projects/timeline" element={<ProjectTimeline />} />
          <Route path="projects/:id" element={<ProjectDetail />} />
          <Route path="*" element={<Navigate to="/hr" replace />} />
        </Route>
      </Routes>
    </>
  )
}

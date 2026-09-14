import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Login from './pages/Login'
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
import Budgets from './pages/finance/Budgets'
import Reports from './pages/finance/Reports'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/hr" replace />} />
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
        <Route path="finance/budgets" element={<Budgets />} />
        <Route path="finance/reports" element={<Reports />} />
        <Route path="*" element={<Navigate to="/hr" replace />} />
      </Route>
    </Routes>
  )
}

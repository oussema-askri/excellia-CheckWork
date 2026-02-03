import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'

// Layouts
import AdminLayout from './components/layout/AdminLayout'
import EmployeeLayout from './components/layout/EmployeeLayout'

// Auth
import LoginPage from './pages/auth/LoginPage'
import ProtectedRoute from './components/auth/ProtectedRoute'

// Admin Pages
import DashboardPage from './pages/admin/DashboardPage'
import EmployeesPage from './pages/admin/EmployeesPage'
import AttendancePage from './pages/admin/AttendancePage'
import PlanningPage from './pages/admin/PlanningPage'
import AdminPresencePage from './pages/admin/AdminPresencePage'
import DevicesPage from './pages/admin/DevicesPage' // ✅ NEW

// Employee Pages
import EmployeeDashboard from './pages/employee/EmployeeDashboard'
import MyAttendancePage from './pages/employee/MyAttendancePage'
import MyPlanningPage from './pages/employee/MyPlanningPage'
import PresenceSheetPage from './pages/employee/PresenceSheetPage'

// Other
import NotFoundPage from './pages/NotFoundPage'
import Loading from './components/common/Loading'

function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loading size="lg" />
      </div>
    )
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/" replace /> : <LoginPage />}
      />

      {/* Admin Routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="employees" element={<EmployeesPage />} />
        <Route path="attendance" element={<AttendancePage />} />
        <Route path="planning" element={<PlanningPage />} />
        <Route path="presence" element={<AdminPresencePage />} />
        <Route path="devices" element={<DevicesPage />} /> {/* ✅ NEW */}
      </Route>

      {/* Employee Routes */}
      <Route
        path="/employee"
        element={
          <ProtectedRoute allowedRoles={['employee']}>
            <EmployeeLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<EmployeeDashboard />} />
        <Route path="attendance" element={<MyAttendancePage />} />
        <Route path="planning" element={<MyPlanningPage />} />
        <Route path="presence" element={<PresenceSheetPage />} />
      </Route>

      <Route
        path="/"
        element={
          user ? (
            <Navigate to={user.role === 'admin' ? '/admin' : '/employee'} replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default App
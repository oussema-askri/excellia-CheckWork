import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'

import AdminLayout from './components/layout/AdminLayout'
import EmployeeLayout from './components/layout/EmployeeLayout'

import LoginPage from './pages/auth/LoginPage'
import ProtectedRoute from './components/auth/ProtectedRoute'

import DashboardPage from './pages/admin/DashboardPage'
import EmployeesPage from './pages/admin/EmployeesPage'
import AttendancePage from './pages/admin/AttendancePage'
import PlanningPage from './pages/admin/PlanningPage'
import AdminPresencePage from './pages/admin/AdminPresencePage'
import DevicesPage from './pages/admin/DevicesPage'
import RequestsPage from './pages/admin/RequestsPage' // ✅ NEW

import EmployeeDashboard from './pages/employee/EmployeeDashboard'
import MyAttendancePage from './pages/employee/MyAttendancePage'
import MyPlanningPage from './pages/employee/MyPlanningPage'
import PresenceSheetPage from './pages/employee/PresenceSheetPage'

import NotFoundPage from './pages/NotFoundPage'
import Loading from './components/common/Loading'

function App() {
  const { user, loading } = useAuth()

  useEffect(() => {
    const handleContextMenu = (e) => {
      e.preventDefault();
    };
    window.addEventListener('contextmenu', handleContextMenu);
    return () => {
      window.removeEventListener('contextmenu', handleContextMenu);
    };
  }, []);

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

      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['admin', 'zitouna']}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="employees" element={<EmployeesPage />} />
        <Route path="requests" element={<RequestsPage />} /> {/* ✅ NEW */}
        <Route path="attendance" element={<AttendancePage />} />
        <Route path="planning" element={<PlanningPage />} />
        <Route path="presence" element={<AdminPresencePage />} />
        <Route path="devices" element={
           user?.role === 'admin' ? <DevicesPage /> : <Navigate to="/admin/dashboard" />
        } />
      </Route>

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
            <Navigate to={['admin', 'zitouna'].includes(user.role) ? '/admin' : '/employee'} replace />
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
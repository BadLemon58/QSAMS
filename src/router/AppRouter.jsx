import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Spinner from '../components/common/Spinner'

// Auth Pages
import LoginPage from '../pages/auth/LoginPage'
import RegisterPage from '../pages/auth/RegisterPage'

// Teacher Pages
import TeacherDashboard from '../pages/teacher/TeacherDashboard'
import ClassDetailPage from '../pages/teacher/ClassDetailPage'
import AttendancePage from '../pages/teacher/AttendancePage'

// Student Pages
import StudentDashboard from '../pages/student/StudentDashboard'
import MyQRPage from '../pages/student/MyQRPage'
import ScanPage from '../pages/student/ScanPage'
import StudentClassPage from '../pages/student/StudentClassPage'

// ── Protected Route Wrapper ─────────────────────────────────
function ProtectedRoute({ children, allowedRole }) {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0f1e]">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  if (allowedRole && profile?.role !== allowedRole) {
    return <Navigate to={profile?.role === 'teacher' ? '/teacher' : '/student'} replace />
  }

  return children
}

// ── Root Redirect ────────────────────────────────────────────
function RootRedirect() {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0f1e]">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  if (profile?.role === 'teacher') return <Navigate to="/teacher" replace />
  return <Navigate to="/student" replace />
}

export default function AppRouter() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login"    element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Root → auto-redirect by role */}
      <Route path="/" element={<RootRedirect />} />

      {/* ── Teacher Routes ── */}
      <Route path="/teacher" element={
        <ProtectedRoute allowedRole="teacher"><TeacherDashboard /></ProtectedRoute>
      } />
      <Route path="/teacher/class/:classId" element={
        <ProtectedRoute allowedRole="teacher"><ClassDetailPage /></ProtectedRoute>
      } />
      <Route path="/teacher/class/:classId/attendance" element={
        <ProtectedRoute allowedRole="teacher"><AttendancePage /></ProtectedRoute>
      } />

      {/* ── Student Routes ── */}
      <Route path="/student" element={
        <ProtectedRoute allowedRole="student"><StudentDashboard /></ProtectedRoute>
      } />
      <Route path="/student/my-qr" element={
        <ProtectedRoute allowedRole="student"><MyQRPage /></ProtectedRoute>
      } />
      <Route path="/student/scan" element={
        <ProtectedRoute allowedRole="student"><ScanPage /></ProtectedRoute>
      } />
      <Route path="/student/class/:classId" element={
        <ProtectedRoute allowedRole="student"><StudentClassPage /></ProtectedRoute>
      } />

      {/* 404 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

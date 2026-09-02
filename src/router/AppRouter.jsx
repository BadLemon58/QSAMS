import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Skeleton } from '../components/common/Skeleton'

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

// Common / Shared Pages
import ProfilePage from '../pages/common/ProfilePage'
import DebugPanel from '../components/common/DebugPanel'

function AppLoadingSkeleton() {
  return (
    <div className="min-h-screen bg-[#f4f6f8] flex flex-col">
      <div className="h-16 bg-white border-b border-[#e2e8f0] px-6 flex items-center justify-between">
        <Skeleton className="h-8 w-32 rounded-xl" />
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-24 rounded-xl" />
          <Skeleton className="h-9 w-9 rounded-full" />
        </div>
      </div>
      <div className="max-w-7xl w-full mx-auto p-6 sm:p-8 space-y-6">
        <Skeleton className="h-44 w-full rounded-[24px]" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Skeleton className="h-24 rounded-[20px]" />
          <Skeleton className="h-24 rounded-[20px]" />
          <Skeleton className="h-24 rounded-[20px]" />
          <Skeleton className="h-24 rounded-[20px]" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-64 rounded-[22px] md:col-span-2" />
          <Skeleton className="h-64 rounded-[22px]" />
        </div>
      </div>
    </div>
  )
}

// ── Protected Route Wrapper ─────────────────────────────────
function ProtectedRoute({ children, allowedRole }) {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return <AppLoadingSkeleton />
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
    return <AppLoadingSkeleton />
  }

  if (!user) return <Navigate to="/login" replace />
  if (profile?.role === 'teacher') return <Navigate to="/teacher" replace />
  return <Navigate to="/student" replace />
}

export default function AppRouter() {
  return (
    <>
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
      <Route path="/teacher/attendance/:classId" element={
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

      {/* ── Shared Routes ── */}
      <Route path="/profile" element={
        <ProtectedRoute><ProfilePage /></ProtectedRoute>
      } />

      {/* 404 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    <DebugPanel />
    </>
  )
}

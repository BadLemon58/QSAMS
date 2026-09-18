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
    <div className="min-h-screen bg-[#f4f6f8] flex flex-col font-['Gambarino',system-ui,sans-serif]">
      {/* Navbar Skeleton */}
      <div className="sticky top-0 z-50 h-16 bg-white backdrop-blur-md border-b border-[#e2e8f0] px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-xl" />
          <div className="flex flex-col gap-1.5 hidden sm:flex">
            <Skeleton className="h-4 w-20 rounded" />
            <Skeleton className="h-2 w-16 rounded" />
          </div>
        </div>
        <div className="hidden md:flex">
          <Skeleton className="h-9 w-28 rounded-xl bg-[#e6f2ec]/60" />
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-[#e2e8f0]">
            <Skeleton className="w-7 h-7 rounded-full" />
            <div className="flex flex-col gap-1 hidden sm:flex">
              <Skeleton className="h-3 w-20 rounded" />
              <Skeleton className="h-2 w-12 rounded" />
            </div>
          </div>
          <Skeleton className="h-8 w-20 rounded-lg hidden sm:block" />
        </div>
      </div>

      {/* Main Content Skeleton */}
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Banner Skeleton */}
        <div className="ndmc-banner rounded-[20px] p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm mb-8">
          <div className="space-y-3">
            <Skeleton className="h-3 w-32 bg-white/20 rounded" />
            <Skeleton className="h-8 w-64 sm:w-80 bg-white/30 rounded-lg" />
            <Skeleton className="h-3 w-48 bg-white/20 rounded" />
          </div>
          <Skeleton className="h-11 w-40 bg-white/30 rounded-[14px]" />
        </div>

        {/* Stats Skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-[#ffffff] border border-[#e2e8f0] rounded-[20px] p-5 shadow-sm space-y-3">
              <Skeleton className="h-3 w-24 rounded" />
              <Skeleton className="h-8 w-16 rounded-md" />
            </div>
          ))}
        </div>

        {/* Classes Header Skeleton */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Skeleton className="w-5 h-5 rounded-md" />
            <Skeleton className="h-6 w-48 rounded-lg" />
          </div>
          <Skeleton className="h-4 w-24 rounded" />
        </div>

        {/* Classes Cards Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="bg-[#ffffff] border border-[#e2e8f0] rounded-[22px] p-5 shadow-sm flex flex-col gap-3">
              <div className="flex items-start justify-between mb-1">
                <Skeleton className="w-10 h-10 rounded-xl bg-[#e6f2ec]" />
                <Skeleton className="h-5 w-16 rounded-md" />
              </div>
              <Skeleton className="h-5 w-3/4 rounded-md" />
              <Skeleton className="h-3 w-1/2 rounded" />
              <div className="flex gap-2 pt-3 border-t border-[#e2e8f0] mt-auto">
                <Skeleton className="h-9 flex-1 rounded-[14px]" />
                <Skeleton className="h-9 flex-1 rounded-[14px]" />
                <Skeleton className="h-9 w-9 rounded-[12px]" />
              </div>
            </div>
          ))}
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

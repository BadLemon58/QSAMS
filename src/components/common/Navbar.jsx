import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import {
  QrCode, LayoutDashboard, ScanLine, BookOpen,
  LogOut, Menu, X, User
} from 'lucide-react'
import { useState } from 'react'

export default function Navbar() {
  const { profile, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  const isTeacher = profile?.role === 'teacher'

  const teacherLinks = [
    { to: '/teacher',    icon: LayoutDashboard, label: 'Dashboard' },
  ]

  const studentLinks = [
    { to: '/student',       icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/student/my-qr', icon: QrCode,          label: 'My QR Code' },
    { to: '/student/scan',  icon: ScanLine,         label: 'Scan QR' },
  ]

  const links = isTeacher ? teacherLinks : studentLinks

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/')

  return (
    <nav className="sticky top-0 z-50 border-b border-white/5 bg-[#0a0f1e]/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link to={isTeacher ? '/teacher' : '/student'} className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <QrCode size={16} className="text-white" />
            </div>
            <span className="font-bold text-white text-lg tracking-tight">QSAMS</span>
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-1">
            {links.map(({ to, icon: Icon, label }) => (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive(to)
                    ? 'bg-indigo-500/20 text-indigo-300'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon size={15} />
                {label}
              </Link>
            ))}
          </div>

          {/* User info + logout */}
          <div className="hidden md:flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/8">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                <User size={12} className="text-white" />
              </div>
              <div className="text-xs">
                <p className="text-white font-medium leading-none">{profile?.full_name || 'User'}</p>
                <p className="text-slate-500 leading-none mt-0.5 capitalize">{profile?.role}</p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
            >
              <LogOut size={15} />
              Sign out
            </button>
          </div>

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-white/5 bg-[#0a0f1e] px-4 py-3 space-y-1 animate-fade-in">
          {links.map(({ to, icon: Icon, label }) => (
            <Link
              key={to}
              to={to}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive(to)
                  ? 'bg-indigo-500/20 text-indigo-300'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon size={15} />
              {label}
            </Link>
          ))}
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all mt-2"
          >
            <LogOut size={15} />
            Sign out
          </button>
        </div>
      )}
    </nav>
  )
}

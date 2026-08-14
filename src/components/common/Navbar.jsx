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
    { to: '/teacher', icon: LayoutDashboard, label: 'Dashboard' },
  ]

  const studentLinks = [
    { to: '/student',       icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/student/my-qr', icon: QrCode,          label: 'My QR Code' },
    { to: '/student/scan',  icon: ScanLine,        label: 'Scan QR' },
  ]

  const links = isTeacher ? teacherLinks : studentLinks

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/')

  return (
    <nav className="sticky top-0 z-50 border-b border-[rgba(0,0,0,0.06)] bg-[#ffffff]/95 backdrop-blur-md font-['Gambarino',system-ui,sans-serif]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link to={isTeacher ? '/teacher' : '/student'} className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-xl bg-[#ee6a2a] flex items-center justify-center text-[#000000] shadow-sm transition-transform group-hover:scale-105">
              <QrCode size={16} />
            </div>
            <div className="flex flex-col">
              <span className="font-['Source_Serif_4',Georgia,serif] font-bold text-[#1a1a1a] text-lg tracking-tight leading-none">
                QSAMS
              </span>
              <span className="text-[10px] uppercase tracking-wider text-[#7a7a7a] font-bold leading-none mt-0.5">
                NDMC Portal
              </span>
            </div>
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-1.5">
            {links.map(({ to, icon: Icon, label }) => (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                  isActive(to)
                    ? 'bg-[#ebebeb] text-[#ee6a2a] font-semibold'
                    : 'text-[#7a7a7a] hover:text-[#1a1a1a] hover:bg-[#f5f5f5]'
                }`}
              >
                <Icon size={16} />
                {label}
              </Link>
            ))}
          </div>

          {/* User info + profile link + logout */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              to="/profile"
              className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl border transition-all ${
                isActive('/profile')
                  ? 'bg-[#ebebeb] border-[#DDD9D3] text-[#1a1a1a]'
                  : 'bg-[#f5f5f5] border-[rgba(0,0,0,0.06)] text-[#1a1a1a] hover:bg-[#ebebeb]'
              }`}
              title="View Profile Settings"
            >
              <div className="w-7 h-7 rounded-full bg-[#f7b500] text-[#000000] flex items-center justify-center overflow-hidden text-xs font-bold shrink-0">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  profile?.full_name?.[0]?.toUpperCase() || <User size={12} />
                )}
              </div>
              <div className="text-xs text-left">
                <p className="text-[#1a1a1a] font-semibold leading-none truncate max-w-[120px]">
                  {profile?.full_name || 'User'}
                </p>
                <p className="text-[#7a7a7a] text-[10px] leading-none mt-0.5 capitalize">
                  {profile?.role}
                </p>
              </div>
            </Link>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-[#7a7a7a] hover:text-[#B91C1C] hover:bg-[#FEE2E2] transition-all"
            >
              <LogOut size={15} />
              Sign out
            </button>
          </div>

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 rounded-xl text-[#7a7a7a] hover:text-[#1a1a1a] hover:bg-[#f5f5f5]"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-[rgba(0,0,0,0.06)] bg-[#ffffff] px-4 py-3 space-y-1.5 animate-fade-in shadow-lg">
          {/* Mobile profile card */}
          <Link
            to="/profile"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-2xl bg-[#f5f5f5] border border-[rgba(0,0,0,0.06)] mb-2"
          >
            <div className="w-9 h-9 rounded-full bg-[#f7b500] text-[#000000] flex items-center justify-center overflow-hidden text-xs font-bold">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                profile?.full_name?.[0]?.toUpperCase() || <User size={14} />
              )}
            </div>
            <div>
              <p className="text-sm font-semibold text-[#1a1a1a]">{profile?.full_name || 'User'}</p>
              <p className="text-xs text-[#ee6a2a] capitalize">{profile?.role} • Profile Settings</p>
            </div>
          </Link>

          {links.map(({ to, icon: Icon, label }) => (
            <Link
              key={to}
              to={to}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive(to)
                  ? 'bg-[#ebebeb] text-[#ee6a2a] font-semibold'
                  : 'text-[#7a7a7a] hover:text-[#1a1a1a] hover:bg-[#f5f5f5]'
              }`}
            >
              <Icon size={16} />
              {label}
            </Link>
          ))}
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm text-[#7a7a7a] hover:text-[#B91C1C] hover:bg-[#FEE2E2] transition-all mt-2"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      )}
    </nav>
  )
}

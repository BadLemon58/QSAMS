import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { QrCode, LayoutDashboard, ScanLine, BookOpen, LogOut, User, Home, Clock, Tv2, Calendar } from 'lucide';
import { MorphIcon } from 'morphicons/react';
import qsamsLogo from '../../assets/QsamsLogoNew.png'

export default function Navbar() {
  const { profile, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

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
    <>
      <nav className="sticky top-0 z-50 border-b border-[#e2e8f0] bg-[#ffffff]/95 backdrop-blur-md font-['Gambarino',system-ui,sans-serif]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">

            {/* Institutional Logo */}
            <Link to={isTeacher ? '/teacher' : '/student'} className="flex items-center gap-3 group">
              <img
                src={qsamsLogo}
                alt="QSAMS Logo"
                className="w-10 h-10 object-contain rounded-xl shadow-sm transition-transform group-hover:scale-105"
              />
              <div className="flex flex-col">
                <span className="font-['Source_Serif_4',Georgia,serif] font-bold text-[#0f172a] text-lg tracking-tight leading-none">
                  QSAMS
                </span>
                <span className="text-[10px] uppercase tracking-wider text-[#005a36] font-bold leading-none mt-0.5">
                  NDMC Portal
                </span>
              </div>
            </Link>

            {/* Desktop Links */}
            <div className="hidden md:flex items-center gap-1.5">
              {links.map(({ to, icon: Icon, label }) => (
                <Link
                  key={to}
                  to={to}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                    isActive(to)
                      ? 'bg-[#e6f2ec] text-[#005a36] font-bold'
                      : 'text-[#64748b] hover:text-[#0f172a] hover:bg-[#f1f5f9]'
                  }`}
                >
                  <MorphIcon icon={Icon} size={16} />
                  {label}
                </Link>
              ))}
            </div>

            {/* Desktop User Profile & Sign Out */}
            <div className="hidden md:flex items-center gap-3">
              <Link
                to="/profile"
                className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl border transition-all ${
                  isActive('/profile')
                    ? 'bg-[#e6f2ec] border-[#005a36]/30 text-[#005a36]'
                    : 'bg-[#f8fafc] border-[#e2e8f0] text-[#0f172a] hover:bg-[#f1f5f9]'
                }`}
                title="View Profile Settings"
              >
                <div className="w-7 h-7 rounded-full bg-[#005a36] text-[#ffffff] flex items-center justify-center overflow-hidden text-xs font-bold shrink-0">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    profile?.full_name?.[0]?.toUpperCase() || <MorphIcon icon={User} size={12} />
                  )}
                </div>
                <div className="text-xs text-left">
                  <p className="text-[#0f172a] font-semibold leading-none truncate max-w-[120px]">
                    {profile?.full_name || 'User'}
                  </p>
                  <p className="text-[#64748b] text-[10px] leading-none mt-0.5 capitalize">
                    {profile?.role}
                  </p>
                </div>
              </Link>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-[#64748b] hover:text-[#b91c1c] hover:bg-[#fee2e2] transition-all"
              >
                <MorphIcon icon={LogOut} size={15} />
                Sign out
              </button>
            </div>

            {/* Mobile Profile Picture (Replaces Hamburger) */}
            <div className="md:hidden flex items-center">
              <Link to="/profile">
                <div className="w-9 h-9 rounded-full bg-[#005a36] text-[#ffffff] flex items-center justify-center overflow-hidden text-xs font-bold shadow-sm border-2 border-white">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    profile?.full_name?.[0]?.toUpperCase() || <MorphIcon icon={User} size={14} />
                  )}
                </div>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-[68px] bg-[#ffffff]/95 backdrop-blur-md border-t border-[#e2e8f0] flex items-center justify-between px-2 z-[60] shadow-[0_-8px_20px_rgba(0,0,0,0.04)] font-['Gambarino',system-ui,sans-serif]">
        
        {isTeacher ? (
          <>
            <Link to="/teacher" className={`flex flex-col items-center p-2 flex-1 transition-colors ${location.pathname === '/teacher' ? 'text-[#005a36]' : 'text-[#94a3b8]'}`}>
              <MorphIcon icon={Home} size={22} />
              <span className="text-[10px] font-bold mt-1">Home</span>
            </Link>

            <Link to="/teacher" className={`flex flex-col items-center p-2 flex-1 transition-colors ${location.pathname === '/teacher' && false ? 'text-[#005a36]' : 'text-[#94a3b8]'}`}>
              <MorphIcon icon={BookOpen} size={22} />
              <span className="text-[10px] font-bold mt-1">Classes</span>
            </Link>

            {/* Teacher Center Floating Kiosk Button */}
            <div className="relative flex flex-col items-center flex-shrink-0 w-[72px] cursor-pointer group">
              <Link 
                to="/teacher" 
                className="absolute -top-8 w-14 h-14 rounded-full bg-[#ffffff] border-[3px] border-[#005a36] text-[#005a36] flex items-center justify-center shadow-lg group-hover:bg-[#005a36] group-hover:text-white transition-all transform group-hover:scale-105 active:scale-95 z-10"
              >
                <MorphIcon icon={Tv2} size={26} />
              </Link>
              <div className="h-[24px]"></div>
              <span className="text-[10px] font-bold text-[#94a3b8] mt-1">Kiosk</span>
            </div>

            <Link to="/teacher" className={`flex flex-col items-center p-2 flex-1 transition-colors ${location.pathname === '/teacher' && false ? 'text-[#005a36]' : 'text-[#94a3b8]'}`}>
              <MorphIcon icon={Calendar} size={22} />
              <span className="text-[10px] font-bold mt-1">Activity</span>
            </Link>

            <button onClick={handleSignOut} className="flex flex-col items-center p-2 flex-1 text-[#94a3b8] hover:text-[#b91c1c] transition-colors">
              <MorphIcon icon={LogOut} size={22} />
              <span className="text-[10px] font-bold mt-1">Sign Out</span>
            </button>
          </>
        ) : (
          <>
            <Link to="/student" className={`flex flex-col items-center p-2 flex-1 transition-colors ${location.pathname === '/student' ? 'text-[#005a36]' : 'text-[#94a3b8]'}`}>
              <MorphIcon icon={Home} size={22} />
              <span className="text-[10px] font-bold mt-1">Home</span>
            </Link>

            <Link to="/student" className={`flex flex-col items-center p-2 flex-1 transition-colors ${location.pathname === '/student' && false ? 'text-[#005a36]' : 'text-[#94a3b8]'}`}>
              <MorphIcon icon={BookOpen} size={22} />
              <span className="text-[10px] font-bold mt-1">Classes</span>
            </Link>

            {/* Student Center Floating Scan Button */}
            <div className="relative flex flex-col items-center flex-shrink-0 w-[72px] cursor-pointer group">
              <Link 
                to="/student/scan" 
                className="absolute -top-8 w-14 h-14 rounded-full bg-[#ffffff] border-[3px] border-[#005a36] text-[#005a36] flex items-center justify-center shadow-lg group-hover:bg-[#005a36] group-hover:text-white transition-all transform group-hover:scale-105 active:scale-95 z-10"
              >
                <MorphIcon icon={ScanLine} size={26} />
              </Link>
              <div className="h-[24px]"></div>
              <span className="text-[10px] font-bold text-[#94a3b8] mt-1">Scan</span>
            </div>

            <Link to="/student" className={`flex flex-col items-center p-2 flex-1 transition-colors ${location.pathname === '/student' && false ? 'text-[#005a36]' : 'text-[#94a3b8]'}`}>
              <MorphIcon icon={Clock} size={22} />
              <span className="text-[10px] font-bold mt-1">History</span>
            </Link>

            <button onClick={handleSignOut} className="flex flex-col items-center p-2 flex-1 text-[#94a3b8] hover:text-[#b91c1c] transition-colors">
              <MorphIcon icon={LogOut} size={22} />
              <span className="text-[10px] font-bold mt-1">Sign Out</span>
            </button>
          </>
        )}
      </div>
    </>
  )
}

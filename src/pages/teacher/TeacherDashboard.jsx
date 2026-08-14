import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import Navbar from '../../components/common/Navbar'
import Spinner from '../../components/common/Spinner'
import Badge from '../../components/common/Badge'
import {
  BookOpen, Plus, Users, Calendar, Clock,
  ChevronRight, MapPin, X, AlertCircle, Tv2,
  ScanLine, LogOut, User, Sparkles, RefreshCw,
  QrCode, CheckCircle, FileText, ArrowRight
} from 'lucide-react'
import { format, isToday } from 'date-fns'

// ── Create Class Modal (NDMC Forest Green Style) ───────────────────────────
function CreateClassModal({ onClose, onCreated }) {
  const { profile } = useAuth()
  const [form, setForm] = useState({ name: '', description: '', schedule: '', room: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error: err } = await supabase
      .from('classes')
      .insert({ ...form, teacher_id: profile.id })
      .select('*, enrollments(id), attendance_sessions(*)')
      .single()

    if (err) { setError(err.message); setLoading(false); return }
    onCreated(data)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in font-['Gambarino',system-ui,sans-serif]">
      <div className="bg-[#ffffff] text-[#0f172a] w-full max-w-md p-7 rounded-[24px] shadow-2xl border border-[#e2e8f0] relative">
        <button
          onClick={onClose}
          className="absolute right-5 top-5 w-8 h-8 rounded-full bg-[#f1f5f9] flex items-center justify-center text-[#64748b] hover:text-[#0f172a] transition-colors"
        >
          <X size={16} />
        </button>

        <div className="mb-5">
          <span className="text-xs uppercase font-bold tracking-wider text-[#005a36]">Faculty Portal</span>
          <h2 className="font-['Source_Serif_4',Georgia,serif] text-2xl font-bold text-[#0f172a] mt-0.5">
            Create New Class
          </h2>
          <p className="text-[#64748b] text-xs mt-1">Set up a course section to start tracking attendance</p>
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-[#fee2e2] text-[#b91c1c] border border-[#fca5a5] rounded-[16px] px-4 py-3 mb-4 text-xs font-semibold">
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#64748b] mb-1.5">
              Class Name *
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. BSIT 3B - Information Management"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#64748b] mb-1.5">
              Description
            </label>
            <textarea
              className="input-field resize-none"
              rows={2}
              placeholder="Brief course outline or subject description..."
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#64748b] mb-1.5">
                Schedule
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="MWF 9:00–10:30 AM"
                value={form.schedule}
                onChange={e => setForm({ ...form, schedule: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#64748b] mb-1.5">
                Room
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="Room 204"
                value={form.room}
                onChange={e => setForm({ ...form, room: e.target.value })}
              />
            </div>
          </div>

          <div className="flex gap-2.5 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center py-3">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center py-3">
              {loading ? <Spinner size="sm" /> : 'Create Class'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main Component: Responsive Teacher Dashboard ───────────────────────────
export default function TeacherDashboard() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState('overview') // 'overview' | 'classes' | 'activity'
  const [classes, setClasses] = useState([])
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showModal, setShowModal] = useState(false)

  const fetchTeacherData = async () => {
    if (!profile?.id) return
    try {
      const { data: clsData } = await supabase
        .from('classes')
        .select('*, enrollments(id), attendance_sessions(*)')
        .eq('teacher_id', profile.id)
        .order('created_at', { ascending: false })

      setClasses(clsData || [])

      const classIds = (clsData || []).map(c => c.id)
      if (classIds.length > 0) {
        const { data: recentLogs } = await supabase
          .from('attendance_logs')
          .select('*, profiles(full_name, student_id), classes(name, room)')
          .in('class_id', classIds)
          .order('marked_at', { ascending: false })
          .limit(25)
        setLogs(recentLogs || [])
      } else {
        setLogs([])
      }
    } catch (err) {
      console.error('Error loading teacher data:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchTeacherData()
  }, [profile?.id])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchTeacherData()
  }

  // Quick stats calculation
  const totalClasses = classes.length
  const totalStudents = classes.reduce((sum, c) => sum + (c.enrollments?.length || 0), 0)
  const activeSessionsCount = classes.reduce((sum, c) => {
    const active = (c.attendance_sessions || []).filter(s => s.is_active).length
    return sum + active
  }, 0)
  const todayLogsCount = logs.filter(l => l.marked_at && isToday(new Date(l.marked_at))).length

  const primaryClass = classes[0]

  return (
    <div className="min-h-screen bg-[#f4f6f8] text-[#0f172a] font-['Gambarino',system-ui,sans-serif] selection:bg-[#005a36]/20">

      {/* ══════════════════════════════════════════════════════════════
          1. DESKTOP LAYOUT (Visible on lg, xl screens)
          ══════════════════════════════════════════════════════════════ */}
      <div className="hidden lg:block">
        <Navbar />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          {/* Institutional Forest Green Header Banner */}
          <div className="ndmc-banner mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <span className="text-[11px] font-mono tracking-wider opacity-90 block mb-1">
                {format(new Date(), 'yyyy')} - {format(new Date(), 'MMMM d')} • Faculty Dashboard
              </span>
              <h1 className="font-['Source_Serif_4',Georgia,serif] text-2xl sm:text-3xl font-bold tracking-tight text-white">
                Welcome back, {profile?.full_name || 'Faculty Member'}
              </h1>
              <p className="text-xs opacity-90 mt-1">
                Notre Dame of Midsayap College — Smart Attendance Monitoring System
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowModal(true)}
                className="bg-[#ffffff] text-[#005a36] hover:bg-[#f1f5f9] font-bold text-xs py-3 px-5 rounded-[14px] shadow-sm transition-all active:scale-[0.98] flex items-center gap-2"
              >
                <Plus size={16} />
                Create New Class
              </button>
            </div>
          </div>

          {/* Stat Metrics Band */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-[20px] p-5 shadow-sm">
              <span className="text-xs font-bold uppercase tracking-wider text-[#64748b]">Total Classes</span>
              <span className="font-['Source_Serif_4',Georgia,serif] text-3xl font-bold text-[#005a36] block mt-1">
                {totalClasses}
              </span>
            </div>

            <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-[20px] p-5 shadow-sm">
              <span className="text-xs font-bold uppercase tracking-wider text-[#64748b]">Total Students</span>
              <span className="font-['Source_Serif_4',Georgia,serif] text-3xl font-bold text-[#0f172a] block mt-1">
                {totalStudents}
              </span>
            </div>

            <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-[20px] p-5 shadow-sm">
              <span className="text-xs font-bold uppercase tracking-wider text-[#64748b]">Active Kiosks</span>
              <span className="font-['Source_Serif_4',Georgia,serif] text-3xl font-bold text-[#15803d] block mt-1">
                {activeSessionsCount} Live
              </span>
            </div>

            <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-[20px] p-5 shadow-sm">
              <span className="text-xs font-bold uppercase tracking-wider text-[#64748b]">Today's Check-ins</span>
              <span className="font-['Source_Serif_4',Georgia,serif] text-3xl font-bold text-[#d97706] block mt-1">
                {todayLogsCount}
              </span>
            </div>
          </div>

          {/* Classes Section Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BookOpen size={18} className="text-[#005a36]" />
              <h2 className="font-['Source_Serif_4',Georgia,serif] font-bold text-xl text-[#0f172a]">
                Active Class Sections
              </h2>
            </div>
            <span className="text-xs font-semibold text-[#64748b]">
              {classes.length} Total Course{classes.length === 1 ? '' : 's'}
            </span>
          </div>

          {/* Classes Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Spinner size="lg" />
            </div>
          ) : classes.length === 0 ? (
            <div className="bg-[#ffffff] rounded-[24px] border border-[#e2e8f0] p-12 text-center max-w-md mx-auto shadow-sm">
              <div className="w-14 h-14 rounded-full bg-[#e6f2ec] text-[#005a36] flex items-center justify-center mx-auto mb-3">
                <BookOpen size={24} />
              </div>
              <h3 className="font-['Source_Serif_4',Georgia,serif] font-bold text-lg text-[#0f172a] mb-1">
                No classes created yet
              </h3>
              <p className="text-xs text-[#64748b] mb-5">
                Click the button below to add your first course section and generate student join codes.
              </p>
              <button onClick={() => setShowModal(true)} className="btn-primary">
                <Plus size={16} />
                Create First Class
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {classes.map(cls => (
                <div
                  key={cls.id}
                  className="bg-[#ffffff] border border-[#e2e8f0] rounded-[22px] p-5 group hover:border-[#005a36]/40 hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-10 h-10 rounded-xl bg-[#e6f2ec] text-[#005a36] flex items-center justify-center shadow-sm">
                        <BookOpen size={18} />
                      </div>
                      <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-[#f8fafc] text-[#005a36] border border-[#e2e8f0]">
                        {cls.join_code || cls.id.substring(0, 6).toUpperCase()}
                      </span>
                    </div>

                    <Link to={`/teacher/class/${cls.id}`} className="block">
                      <h3 className="font-['Source_Serif_4',Georgia,serif] font-bold text-[#0f172a] text-base mb-1 group-hover:text-[#005a36] transition-colors line-clamp-1">
                        {cls.name}
                      </h3>
                      {cls.description && (
                        <p className="text-[#64748b] text-xs mb-3 line-clamp-2 leading-relaxed">{cls.description}</p>
                      )}
                    </Link>
                  </div>

                  <div className="space-y-3 pt-3 border-t border-[#e2e8f0] mt-3">
                    <div className="flex items-center justify-between text-xs text-[#64748b]">
                      <span>{cls.enrollments?.length || 0} Enrolled</span>
                      <span>{cls.room || 'Room TBA'}</span>
                    </div>

                    <div className="flex gap-2">
                      <Link
                        to={`/teacher/attendance/${cls.id}`}
                        className="btn-primary flex-1 justify-center text-xs py-2"
                      >
                        <Tv2 size={13} /> Live Kiosk
                      </Link>
                      <Link
                        to={`/teacher/class/${cls.id}`}
                        className="btn-secondary flex-1 justify-center text-xs py-2"
                      >
                        Details
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>


      {/* ══════════════════════════════════════════════════════════════
          2. MOBILE PHONE & TABLET APP LAYOUT (Visible on < lg screens)
             - Matches Student mobile layout & TabBar at bottom
             - Sign out button in exact same location & style
          ══════════════════════════════════════════════════════════════ */}
      <div className="lg:hidden flex justify-center">
        <div className="w-full max-w-md sm:max-w-xl md:max-w-2xl min-h-screen bg-[#ffffff] flex flex-col justify-between px-4 sm:px-6 md:px-8 pt-5 pb-24 relative shadow-sm border-x border-[#e2e8f0] transition-all">

          {/* ── Scrollable Content ── */}
          <div className="flex flex-col gap-6 w-full">

            {/* 1. Header Row (Exact same location as student dashboard) */}
            <section className="flex items-center justify-between w-full">
              <button
                onClick={() => navigate('/profile')}
                aria-label="Profile settings"
                className="flex items-center gap-2.5 group text-left"
              >
                <div className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-[#005a36] text-[#ffffff] flex items-center justify-center font-bold text-sm shadow-sm overflow-hidden border border-[#e2e8f0]">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    profile?.full_name?.[0]?.toUpperCase() || <User size={18} />
                  )}
                </div>
                <div>
                  <p className="text-xs font-bold text-[#0f172a] leading-none group-hover:text-[#005a36] transition-colors truncate max-w-[120px] sm:max-w-[180px]">
                    {profile?.full_name || 'Faculty Member'}
                  </p>
                  <p className="text-[11px] text-[#005a36] font-semibold leading-none mt-1">
                    Instructor Portal
                  </p>
                </div>
              </button>

              <button
                onClick={async () => {
                  await signOut()
                  navigate('/login')
                }}
                className="flex items-center gap-2 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-[14px] text-xs sm:text-sm font-semibold text-[#b91c1c] hover:bg-[#fecaca] active:scale-95 transition-all border border-[#fca5a5] bg-[#fee2e2] shadow-sm"
                title="Sign out of account"
              >
                <LogOut size={16} />
                <span>Sign out</span>
              </button>
            </section>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-24">
                <Spinner size="lg" />
                <p className="text-xs text-[#64748b] mt-3 font-medium">Syncing class data...</p>
              </div>
            ) : (
              <>
                {/* ── TAB 1: OVERVIEW / QUICK LAUNCH (DEFAULT) ── */}
                {activeTab === 'overview' && (
                  <>
                    {/* Faculty Hero Hub Stage */}
                    <section className="bg-[#f8fafc] border border-[#e2e8f0] rounded-[24px] p-6 sm:p-8 md:p-10 flex flex-col items-center gap-4 relative shadow-sm">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-[22px] bg-[#005a36] text-white flex items-center justify-center shadow-md relative">
                        <div
                          className="absolute inset-[-6px] rounded-[26px] border-2 border-[#005a36]/20 opacity-55 pointer-events-none"
                          style={{ animation: 'gesso-qr-breathe 3.2s ease-in-out infinite' }}
                        />
                        <Tv2 size={36} className="text-white" />
                      </div>

                      <div className="flex flex-col items-center gap-1 text-center mt-1">
                        <span className="font-['Source_Serif_4',Georgia,serif] font-bold text-[22px] md:text-[26px] text-[#0f172a] tracking-tight">
                          {primaryClass ? primaryClass.name : 'Create Your First Class'}
                        </span>
                        <p className="text-xs text-[#64748b]">
                          {primaryClass
                            ? `${primaryClass.schedule || 'Schedule TBA'} · ${primaryClass.room || 'Room TBA'}`
                            : 'Set up class sections and launch live kiosk tokens'}
                        </p>
                      </div>

                      {primaryClass && (
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#dcfce7] text-[#15803d] font-bold text-xs border border-[#86efac]">
                            <Users size={13} /> {primaryClass.enrollments?.length || 0} Students Enrolled
                          </span>
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ffffff] text-[#005a36] font-mono font-bold text-xs border border-[#e2e8f0] shadow-sm">
                            Code: {primaryClass.join_code || primaryClass.id.substring(0,6).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </section>

                    {/* Action Buttons Row */}
                    <section className="flex flex-col gap-3">
                      {primaryClass ? (
                        <button
                          onClick={() => navigate(`/teacher/attendance/${primaryClass.id}`)}
                          className="w-full py-4 px-4 rounded-[16px] bg-[#005a36] text-[#ffffff] font-semibold text-[14px] md:text-[15px] flex items-center justify-center gap-2 hover:bg-[#00482b] active:scale-[0.98] transition-all shadow-sm"
                        >
                          <Tv2 size={18} />
                          Launch Live Attendance Kiosk
                        </button>
                      ) : (
                        <button
                          onClick={() => setShowModal(true)}
                          className="w-full py-4 px-4 rounded-[16px] bg-[#005a36] text-[#ffffff] font-semibold text-[14px] md:text-[15px] flex items-center justify-center gap-2 hover:bg-[#00482b] active:scale-[0.98] transition-all shadow-sm"
                        >
                          <Plus size={18} />
                          Create First Course
                        </button>
                      )}

                      <div className="flex gap-3">
                        <button
                          onClick={() => setShowModal(true)}
                          className="flex-1 py-3.5 px-3 rounded-[16px] bg-[#f8fafc] text-[#0f172a] border border-[#e2e8f0] font-semibold text-[14px] flex items-center justify-center gap-2 hover:bg-[#f1f5f9] active:scale-[0.98] transition-all shadow-sm"
                        >
                          <Plus size={16} />
                          New Class
                        </button>
                        <button
                          onClick={handleRefresh}
                          className="flex-1 py-3.5 px-3 rounded-[16px] bg-[#f8fafc] text-[#0f172a] border border-[#e2e8f0] font-semibold text-[14px] flex items-center justify-center gap-2 hover:bg-[#f1f5f9] active:scale-[0.98] transition-all shadow-sm"
                        >
                          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                          Refresh
                        </button>
                        <button
                          onClick={() => setActiveTab('classes')}
                          className="flex-1 py-3.5 px-3 rounded-[16px] bg-[#f8fafc] text-[#0f172a] border border-[#e2e8f0] font-semibold text-[14px] flex items-center justify-center gap-2 hover:bg-[#f1f5f9] active:scale-[0.98] transition-all shadow-sm"
                        >
                          <BookOpen size={16} />
                          All ({classes.length})
                        </button>
                      </div>
                    </section>

                    {/* Stat Pair Band — 4-columns on tablet */}
                    <section className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                      <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-[18px] p-4 sm:p-5 flex flex-col gap-1 shadow-sm">
                        <span className="text-[12px] text-[#64748b] font-medium">Class Sections</span>
                        <span className="font-['Source_Serif_4',Georgia,serif] font-bold text-[28px] md:text-[32px] leading-tight text-[#005a36]">
                          {totalClasses}
                        </span>
                      </div>

                      <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-[18px] p-4 sm:p-5 flex flex-col gap-1 shadow-sm">
                        <span className="text-[12px] text-[#64748b] font-medium">Total Students</span>
                        <span className="font-['Source_Serif_4',Georgia,serif] font-bold text-[28px] md:text-[32px] leading-tight text-[#0f172a]">
                          {totalStudents}
                        </span>
                      </div>

                      <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-[18px] p-4 sm:p-5 flex flex-col gap-1 shadow-sm">
                        <span className="text-[12px] text-[#64748b] font-medium">Active Kiosks</span>
                        <span className="font-['Source_Serif_4',Georgia,serif] font-bold text-[28px] md:text-[32px] leading-tight text-[#15803d]">
                          {activeSessionsCount} Live
                        </span>
                      </div>

                      <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-[18px] p-4 sm:p-5 flex flex-col gap-1 shadow-sm">
                        <span className="text-[12px] text-[#64748b] font-medium">Today's Logs</span>
                        <span className="font-['Source_Serif_4',Georgia,serif] font-bold text-[28px] md:text-[32px] leading-tight text-[#d97706]">
                          {todayLogsCount}
                        </span>
                      </div>
                    </section>

                    {/* Quick Class Section Launch List */}
                    <section className="flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] uppercase font-bold tracking-[0.06em] text-[#005a36]">
                          Quick Course Launcher
                        </span>
                        <button
                          onClick={() => setActiveTab('classes')}
                          className="text-[12px] font-semibold text-[#005a36] hover:underline"
                        >
                          View all ({classes.length})
                        </button>
                      </div>

                      <div className="flex flex-col gap-3">
                        {classes.slice(0, 3).map(cls => (
                          <div
                            key={cls.id}
                            className="bg-[#f8fafc] border border-[#e2e8f0] rounded-[20px] p-4 flex flex-col gap-3 shadow-sm hover:border-[#005a36]/30 transition-all"
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <h3 className="font-['Source_Serif_4',Georgia,serif] font-bold text-[16px] text-[#0f172a]">
                                  {cls.name}
                                </h3>
                                <p className="text-[12px] text-[#64748b] mt-0.5">
                                  {cls.schedule || 'Schedule TBA'} {cls.room ? `· ${cls.room}` : ''}
                                </p>
                              </div>
                              <span className="text-xs font-mono font-bold text-[#005a36] bg-[#e6f2ec] px-2.5 py-0.5 rounded-full">
                                {cls.enrollments?.length || 0} Students
                              </span>
                            </div>

                            <div className="flex gap-2 pt-1 border-t border-[#e2e8f0]">
                              <Link
                                to={`/teacher/attendance/${cls.id}`}
                                className="btn-primary flex-1 justify-center text-xs py-2.5"
                              >
                                <Tv2 size={14} /> Start Kiosk
                              </Link>
                              <Link
                                to={`/teacher/class/${cls.id}`}
                                className="btn-secondary flex-1 justify-center text-xs py-2.5"
                              >
                                Manage Roster
                              </Link>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  </>
                )}

                {/* ── TAB 2: ALL COURSES (MOBILE/TABLET) ── */}
                {activeTab === 'classes' && (
                  <section className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] uppercase font-bold tracking-[0.06em] text-[#005a36]">
                        All Class Sections ({classes.length})
                      </span>
                      <button
                        onClick={() => setShowModal(true)}
                        className="text-[12px] font-semibold text-[#005a36] flex items-center gap-1 hover:underline"
                      >
                        <Plus size={14} /> Add Class
                      </button>
                    </div>

                    {classes.length === 0 ? (
                      <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-[24px] p-8 text-center flex flex-col items-center gap-3">
                        <BookOpen size={32} className="text-[#64748b]" />
                        <p className="text-sm font-semibold text-[#0f172a]">No classes created yet</p>
                        <p className="text-xs text-[#64748b]">Set up your first course to begin tracking roll calls.</p>
                        <button
                          onClick={() => setShowModal(true)}
                          className="py-2.5 px-5 rounded-[16px] bg-[#005a36] text-[#ffffff] font-semibold text-xs mt-2"
                        >
                          Create First Class
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        {classes.map(cls => (
                          <div
                            key={cls.id}
                            className="bg-[#f8fafc] border border-[#e2e8f0] rounded-[20px] p-4 md:p-5 flex flex-col justify-between gap-3 shadow-sm hover:border-[#005a36]/40 transition-all"
                          >
                            <div>
                              <div className="flex items-start justify-between mb-1">
                                <h3 className="font-['Source_Serif_4',Georgia,serif] font-bold text-[16px] md:text-[17px] text-[#0f172a]">
                                  {cls.name}
                                </h3>
                                <span className="font-mono text-xs font-bold text-[#005a36] bg-[#e6f2ec] px-2 py-0.5 rounded-md">
                                  {cls.join_code || cls.id.substring(0,6).toUpperCase()}
                                </span>
                              </div>
                              <p className="text-[12px] text-[#64748b]">
                                {cls.schedule || 'Schedule TBA'} {cls.room ? `· ${cls.room}` : ''}
                              </p>
                              {cls.description && (
                                <p className="text-[11px] text-[#64748b] mt-1.5 line-clamp-2">{cls.description}</p>
                              )}
                            </div>

                            <div className="space-y-2 pt-2 border-t border-[#e2e8f0]">
                              <div className="flex items-center justify-between text-[11px] text-[#64748b]">
                                <span>{cls.enrollments?.length || 0} Enrolled Students</span>
                                <span>Join Code Active</span>
                              </div>
                              <div className="flex gap-2">
                                <Link
                                  to={`/teacher/attendance/${cls.id}`}
                                  className="btn-primary flex-1 justify-center text-xs py-2"
                                >
                                  <Tv2 size={13} /> Kiosk
                                </Link>
                                <Link
                                  to={`/teacher/class/${cls.id}`}
                                  className="btn-secondary flex-1 justify-center text-xs py-2"
                                >
                                  Roster
                                </Link>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                )}

                {/* ── TAB 3: LIVE ACTIVITY / RECENT LOGS (MOBILE/TABLET) ── */}
                {activeTab === 'activity' && (
                  <section className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] uppercase font-bold tracking-[0.06em] text-[#005a36]">
                        Recent Check-in Logs ({logs.length})
                      </span>
                      <span className="text-[12px] font-semibold text-[#005a36]">
                        {todayLogsCount} Today
                      </span>
                    </div>

                    {logs.length === 0 ? (
                      <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-[24px] p-8 text-center text-[#64748b] text-xs">
                        No recent attendance records. Start a class session to see live records.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        {logs.map(log => {
                          const dateObj = log.marked_at ? new Date(log.marked_at) : new Date()

                          return (
                            <div
                              key={log.id}
                              className="bg-[#f8fafc] border border-[#e2e8f0] rounded-[16px] p-3.5 md:p-4 flex items-center justify-between shadow-sm"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-[#e6f2ec] text-[#005a36] flex items-center justify-center font-bold text-xs shadow-sm">
                                  {log.profiles?.full_name?.[0]?.toUpperCase() || <User size={15} />}
                                </div>
                                <div className="flex flex-col">
                                  <span className="font-semibold text-sm text-[#0f172a]">
                                    {log.profiles?.full_name || 'Student'}
                                  </span>
                                  <span className="text-[11px] text-[#64748b]">
                                    {log.classes?.name || 'Class'} · {format(dateObj, 'MMM d, h:mm a')}
                                  </span>
                                </div>
                              </div>

                              <Badge status={log.status} />
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </section>
                )}
              </>
            )}

          </div>

          {/* ── Fixed Bottom Tab Bar (Matching Student Dashboard format) ── */}
          <nav
            data-component="TeacherTabBar"
            className="fixed bottom-0 left-0 right-0 max-w-md sm:max-w-xl md:max-w-2xl mx-auto h-16 md:h-18 bg-[#ffffff]/95 backdrop-blur-md border-t border-[#e2e8f0] flex items-center justify-between px-6 sm:px-12 md:px-16 z-40 shadow-lg"
          >
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex flex-col items-center gap-1 flex-1 text-[10px] md:text-xs font-semibold transition-all hover:scale-105 active:scale-95 ${
                activeTab === 'overview' ? 'text-[#005a36] font-bold' : 'text-[#64748b]'
              }`}
            >
              <Tv2 size={22} className={activeTab === 'overview' ? 'text-[#005a36]' : 'text-[#64748b]'} />
              <span>Overview</span>
            </button>

            <button
              onClick={() => setActiveTab('classes')}
              className={`flex flex-col items-center gap-1 flex-1 text-[10px] md:text-xs font-semibold transition-all hover:scale-105 active:scale-95 ${
                activeTab === 'classes' ? 'text-[#005a36] font-bold' : 'text-[#64748b]'
              }`}
            >
              <BookOpen size={22} className={activeTab === 'classes' ? 'text-[#005a36]' : 'text-[#64748b]'} />
              <span>Courses</span>
            </button>

            <button
              onClick={() => setActiveTab('activity')}
              className={`flex flex-col items-center gap-1 flex-1 text-[10px] md:text-xs font-semibold transition-all hover:scale-105 active:scale-95 ${
                activeTab === 'activity' ? 'text-[#005a36] font-bold' : 'text-[#64748b]'
              }`}
            >
              <Calendar size={22} className={activeTab === 'activity' ? 'text-[#005a36]' : 'text-[#64748b]'} />
              <span>Activity</span>
            </button>
          </nav>

        </div>
      </div>

      {showModal && (
        <CreateClassModal
          onClose={() => setShowModal(false)}
          onCreated={(cls) => setClasses(prev => [cls, ...prev])}
        />
      )}
    </div>
  )
}

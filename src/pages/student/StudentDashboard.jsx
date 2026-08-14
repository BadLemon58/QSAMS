import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { QRCodeSVG } from 'qrcode.react'
import { format, isToday } from 'date-fns'
import {
  Camera, RefreshCw, Share2, Plus, X, Flame, CheckCircle,
  AlertCircle, BookOpen, Clock, Calendar, QrCode, ArrowLeft,
  Users, User, ChevronRight, Sparkles, Check, Download, Shield, LogOut
} from 'lucide-react'
import Spinner from '../../components/common/Spinner'
import Navbar from '../../components/common/Navbar'
import Badge from '../../components/common/Badge'

// ── Join Class Modal (NDMC Forest Green Style) ───────────────────────────
function JoinClassModal({ studentId, onClose, onEnrolled }) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const handleJoin = async (e) => {
    e.preventDefault()
    if (!code.trim()) return
    setLoading(true)
    setError('')
    setSuccessMsg('')

    const cleanCode = code.trim().toUpperCase()

    // 1. Search for class
    const { data: foundClasses, error: searchErr } = await supabase
      .from('classes')
      .select('*')

    if (searchErr) {
      setError(searchErr.message)
      setLoading(false)
      return
    }

    const matchedClass = (foundClasses || []).find(c =>
      c.join_code?.toUpperCase() === cleanCode ||
      c.id.substring(0, 6).toUpperCase() === cleanCode
    )

    if (!matchedClass) {
      setError('Invalid Join Code. Please check with your teacher.')
      setLoading(false)
      return
    }

    // 2. Enroll student in class
    const { error: enrollErr } = await supabase
      .from('enrollments')
      .insert({ class_id: matchedClass.id, student_id: studentId })

    if (enrollErr) {
      if (enrollErr.code === '23505') {
        setError(`You are already enrolled in "${matchedClass.name}".`)
      } else {
        setError(enrollErr.message)
      }
      setLoading(false)
      return
    }

    setSuccessMsg(`Enrolled in "${matchedClass.name}"!`)
    onEnrolled(matchedClass)
    setLoading(false)
    setTimeout(onClose, 1200)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in font-['Gambarino',system-ui,sans-serif]">
      <div className="w-full max-w-sm bg-[#ffffff] text-[#0f172a] rounded-[24px] p-6 shadow-2xl border border-[#e2e8f0] relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 w-8 h-8 rounded-full bg-[#f1f5f9] flex items-center justify-center text-[#64748b] hover:text-[#0f172a] transition-colors"
        >
          <X size={16} />
        </button>

        <div className="mb-4">
          <span className="text-[12px] uppercase font-bold tracking-wider text-[#005a36]">Enrollment</span>
          <h2 className="text-xl font-bold font-['Source_Serif_4',Georgia,serif] text-[#0f172a] mt-0.5">Join a Class</h2>
          <p className="text-[#64748b] text-xs mt-1">Enter the 6-character code provided by your teacher</p>
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-[#fee2e2] text-[#b91c1c] rounded-[16px] px-3.5 py-2.5 mb-4 text-xs font-semibold">
            <AlertCircle size={14} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="flex items-center gap-2 bg-[#dcfce7] text-[#15803d] rounded-[16px] px-3.5 py-2.5 mb-4 text-xs font-semibold">
            <CheckCircle size={14} className="shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <input
              type="text"
              className="w-full bg-[#f8fafc] text-[#0f172a] border border-[#cbd5e1] rounded-[16px] px-4 py-3 text-center text-lg font-mono font-bold tracking-widest uppercase focus:outline-none focus:border-[#005a36] focus:ring-2 focus:ring-[#005a36]/20"
              placeholder="e.g. 8A9X2K"
              maxLength={10}
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              required
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={loading || !code.trim()}
            className="w-full py-3.5 px-4 rounded-[16px] bg-[#005a36] text-[#ffffff] font-semibold text-sm hover:bg-[#00482b] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-sm"
          >
            {loading ? <Spinner size="sm" /> : 'Confirm & Join'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ── Main Component: Responsive Student Dashboard ─────────────────────────
export default function StudentDashboard() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  // Mobile/Tablet tab state
  const [activeTab, setActiveTab] = useState('live') // 'live' | 'classes' | 'history'
  const [enrollments, setEnrollments] = useState([])
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [downloaded, setDownloaded] = useState(false)

  // Fetch Student Data
  const fetchData = async () => {
    if (!profile?.id) return
    try {
      const [{ data: enr }, { data: attendanceLogs }] = await Promise.all([
        supabase
          .from('enrollments')
          .select('class_id, classes(id, name, schedule, room, join_code)')
          .eq('student_id', profile.id),
        supabase
          .from('attendance_logs')
          .select('*, attendance_sessions(date), classes(name, room, schedule)')
          .eq('student_id', profile.id)
          .order('marked_at', { ascending: false }),
      ])
      setEnrollments((enr || []).map(e => e.classes).filter(Boolean))
      setLogs(attendanceLogs || [])
    } catch (err) {
      console.error('Error loading student data:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [profile?.id])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchData()
  }

  // Calculate Metrics
  const totalSessions = logs.length
  const presentCount = logs.filter(l => l.status === 'present' || l.status === 'late').length
  const lateCount = logs.filter(l => l.status === 'late').length
  const absentCount = logs.filter(l => l.status === 'absent').length
  const attendancePct = totalSessions > 0 ? Math.round((presentCount / totalSessions) * 100) : 0

  // Calculate Streak
  let currentStreak = 0
  for (const log of logs) {
    if (log.status === 'present' || log.status === 'late') {
      currentStreak++
    } else if (log.status === 'absent') {
      break
    }
  }

  // Classes done today
  const todayLogs = logs.filter(l => {
    const markedDate = l.marked_at ? new Date(l.marked_at) : null
    return markedDate && isToday(markedDate) && (l.status === 'present' || l.status === 'late')
  })
  const classesTodayCount = todayLogs.length

  // Check-in status badge
  const mostRecentCheckIn = logs.find(l => l.status === 'present' || l.status === 'late')
  const checkedInToday = mostRecentCheckIn && mostRecentCheckIn.marked_at && isToday(new Date(mostRecentCheckIn.marked_at))
  const checkInTimeString = checkedInToday
    ? format(new Date(mostRecentCheckIn.marked_at), 'h:mm a')
    : null

  // Active Class context
  const primaryClass = enrollments[0]
  const roomScheduleText = primaryClass
    ? `${primaryClass.room || 'Room 214'} · ${primaryClass.schedule || 'Period 3'}`
    : 'NDMC · Student Portal'

  // Student QR Code Payload
  const qrPayload = JSON.stringify({
    type: 'student_id',
    studentId: profile?.student_id || 'UNKNOWN',
    name: profile?.full_name || 'Student',
    uid: profile?.id,
    timestamp: Date.now(),
  })

  const progressRatio = Math.min(Math.max(attendancePct, 0), 100)

  // QR Download Handler
  const downloadQR = () => {
    const svg = document.getElementById('student-id-qr-desk') || document.getElementById('student-live-qr')
    if (!svg) return

    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()

    img.onload = () => {
      canvas.width = img.width + 80
      canvas.height = img.height + 80

      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 40, 40)

      const pngUrl = canvas.toDataURL('image/png')
      const downloadLink = document.createElement('a')
      downloadLink.href = pngUrl
      downloadLink.download = `QSAMS-QR-${profile?.student_id || 'ID'}.png`
      document.body.appendChild(downloadLink)
      downloadLink.click()
      document.body.removeChild(downloadLink)

      setDownloaded(true)
      setTimeout(() => setDownloaded(false), 2500)
    }

    img.src = 'data:image/svg+xml;base64,' + btoa(svgData)
  }

  return (
    <div className="min-h-screen bg-[#f4f6f8] text-[#0f172a] font-['Gambarino',system-ui,sans-serif] selection:bg-[#005a36]/20">

      {/* ══════════════════════════════════════════════════════════════
          1. DESKTOP LAYOUT (Visible strictly on large screens: lg, xl)
          ══════════════════════════════════════════════════════════════ */}
      <div className="hidden lg:block">
        <Navbar />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          {/* Institutional Forest Green Header Banner */}
          <div className="ndmc-banner mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <span className="text-[11px] font-mono tracking-wider opacity-90 block mb-1">
                {format(new Date(), 'yyyy')} - Semester 1 • Student Portal
              </span>
              <h1 className="font-['Source_Serif_4',Georgia,serif] text-2xl sm:text-3xl font-bold tracking-tight text-white">
                Welcome back, {profile?.full_name || 'Student'}
              </h1>
              <p className="text-xs opacity-90 mt-1">
                Notre Dame of Midsayap College — Student ID: {profile?.student_id || 'N/A'}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowJoinModal(true)}
                className="bg-white text-[#005a36] hover:bg-[#f1f5f9] font-bold text-xs py-3 px-5 rounded-[14px] shadow-sm transition-all flex items-center gap-2"
              >
                <Plus size={16} /> Join Class
              </button>
              <button
                onClick={() => navigate('/student/scan')}
                className="bg-[#d97706] hover:bg-[#b45309] text-white font-bold text-xs py-3 px-5 rounded-[14px] shadow-sm transition-all flex items-center gap-2"
              >
                <Camera size={16} /> Open Scanner
              </button>
            </div>
          </div>

          {/* Stat Metric Cards Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-[20px] p-5 shadow-sm">
              <span className="text-xs font-bold uppercase tracking-wider text-[#64748b]">Attendance Rate</span>
              <p className="font-['Source_Serif_4',Georgia,serif] text-3xl font-bold text-[#005a36] mt-1">
                {attendancePct}%
              </p>
            </div>
            <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-[20px] p-5 shadow-sm">
              <span className="text-xs font-bold uppercase tracking-wider text-[#64748b]">Present Sessions</span>
              <p className="font-['Source_Serif_4',Georgia,serif] text-3xl font-bold text-[#15803d] mt-1">
                {presentCount}
              </p>
            </div>
            <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-[20px] p-5 shadow-sm">
              <span className="text-xs font-bold uppercase tracking-wider text-[#64748b]">Late Sessions</span>
              <p className="font-['Source_Serif_4',Georgia,serif] text-3xl font-bold text-[#d97706] mt-1">
                {lateCount}
              </p>
            </div>
            <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-[20px] p-5 shadow-sm">
              <span className="text-xs font-bold uppercase tracking-wider text-[#64748b]">Missed Sessions</span>
              <p className="font-['Source_Serif_4',Georgia,serif] text-3xl font-bold text-[#b91c1c] mt-1">
                {absentCount}
              </p>
            </div>
            <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-[20px] p-5 shadow-sm col-span-2 lg:col-span-1">
              <div className="flex items-center gap-1.5">
                <Flame size={15} className="text-[#d97706]" />
                <span className="text-xs font-bold uppercase tracking-wider text-[#64748b]">Streak</span>
              </div>
              <p className="font-['Source_Serif_4',Georgia,serif] text-3xl font-bold text-[#0f172a] mt-1">
                {currentStreak} Days
              </p>
            </div>
          </div>

          {/* Main 2-Column Responsive Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* Left 2 Columns: Enrolled Classes & Recent Activity */}
            <div className="lg:col-span-2 space-y-8">
              
              {/* Enrolled Courses */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <BookOpen size={18} className="text-[#005a36]" />
                    <h2 className="font-['Source_Serif_4',Georgia,serif] font-bold text-xl text-[#0f172a]">
                      Enrolled Courses ({enrollments.length})
                    </h2>
                  </div>
                  <button
                    onClick={() => setShowJoinModal(true)}
                    className="text-xs font-semibold text-[#005a36] hover:underline flex items-center gap-1"
                  >
                    <Plus size={14} /> Join Course
                  </button>
                </div>

                {loading ? (
                  <div className="p-8 text-center"><Spinner size="lg" /></div>
                ) : enrollments.length === 0 ? (
                  <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-[24px] p-8 text-center">
                    <p className="text-sm font-semibold text-[#0f172a] mb-1">No enrolled courses</p>
                    <p className="text-xs text-[#64748b] mb-4">Join a class using your teacher's code to start tracking attendance.</p>
                    <button onClick={() => setShowJoinModal(true)} className="btn-primary btn-sm">
                      Join a Class
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {enrollments.map(cls => {
                      const classLogs = logs.filter(l => l.class_id === cls.id)
                      const t = classLogs.length
                      const p = classLogs.filter(l => l.status === 'present' || l.status === 'late').length
                      const rate = t > 0 ? Math.round((p / t) * 100) : 0

                      return (
                        <Link
                          key={cls.id}
                          to={`/student/class/${cls.id}`}
                          className="bg-[#ffffff] border border-[#e2e8f0] rounded-[20px] p-5 hover:border-[#005a36]/40 hover:shadow-md transition-all group flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-start justify-between mb-2">
                              <h3 className="font-['Source_Serif_4',Georgia,serif] font-bold text-base text-[#0f172a] group-hover:text-[#005a36] transition-colors">
                                {cls.name}
                              </h3>
                              <span className="font-['Source_Serif_4',Georgia,serif] font-bold text-lg text-[#005a36]">
                                {rate}%
                              </span>
                            </div>
                            <p className="text-xs text-[#64748b] mb-3">
                              {cls.schedule || 'Schedule TBA'} {cls.room ? `• ${cls.room}` : ''}
                            </p>
                          </div>

                          <div className="space-y-1.5 pt-2">
                            <div className="flex items-center justify-between text-[11px] text-[#64748b]">
                              <span>Attendance Rate</span>
                              <span>{p} of {t} Sessions</span>
                            </div>
                            <div className="w-full h-2 bg-[#e2e8f0] rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full bg-[#005a36] transition-all duration-700"
                                style={{ width: `${rate}%` }}
                              />
                            </div>
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Recent Check-ins Table */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Calendar size={18} className="text-[#005a36]" />
                    <h2 className="font-['Source_Serif_4',Georgia,serif] font-bold text-xl text-[#0f172a]">
                      Recent Attendance Records
                    </h2>
                  </div>
                </div>

                <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-[20px] overflow-hidden shadow-sm">
                  {logs.length === 0 ? (
                    <div className="p-8 text-center text-xs text-[#64748b]">
                      No attendance sessions logged yet.
                    </div>
                  ) : (
                    <table className="w-full">
                      <thead>
                        <tr className="bg-[#005a36] text-white">
                          <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider">Date</th>
                          <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider">Course Name</th>
                          <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider hidden sm:table-cell">Time</th>
                          <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#e2e8f0] text-xs">
                        {logs.slice(0, 8).map(log => {
                          const dateObj = log.marked_at ? new Date(log.marked_at) : (log.attendance_sessions?.date ? new Date(log.attendance_sessions.date) : new Date())
                          return (
                            <tr key={log.id} className="hover:bg-[#f8fafc] transition-colors">
                              <td className="px-4 py-3 font-semibold text-[#0f172a]">
                                {format(dateObj, 'MMM d, yyyy')}
                              </td>
                              <td className="px-4 py-3 text-[#0f172a]">
                                {log.classes?.name || 'Class Session'}
                              </td>
                              <td className="px-4 py-3 text-[#64748b] hidden sm:table-cell">
                                {log.marked_at ? format(dateObj, 'h:mm a') : '—'}
                              </td>
                              <td className="px-4 py-3">
                                <Badge status={log.status} />
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

            </div>

            {/* Right Column: Digital QR ID Card Widget */}
            <div className="space-y-6">
              <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-[24px] p-6 shadow-sm flex flex-col items-center text-center">
                <div className="w-full bg-[#005a36] text-white py-2 px-3.5 rounded-[12px] mb-4 flex items-center justify-between text-xs">
                  <span className="font-bold">Digital Student ID</span>
                  <span className="font-mono">{profile?.student_id || 'Active'}</span>
                </div>

                {/* QR Stage with Pulse Ring */}
                <div className="relative my-3 p-4 bg-[#f8fafc] rounded-[20px] border border-[#e2e8f0] shadow-sm flex items-center justify-center">
                  <div
                    className="absolute inset-[-6px] rounded-[26px] border-2 border-[#005a36]/20 opacity-55 pointer-events-none"
                    style={{ animation: 'gesso-qr-breathe 3.2s ease-in-out infinite' }}
                  />
                  <QRCodeSVG
                    id="student-id-qr-desk"
                    value={qrPayload}
                    size={170}
                    level="H"
                    includeMargin={false}
                    fgColor="#005a36"
                  />
                </div>

                <h3 className="font-['Source_Serif_4',Georgia,serif] text-lg font-bold text-[#0f172a] mt-2">
                  {profile?.full_name || 'Student Name'}
                </h3>
                <p className="text-xs text-[#005a36] font-mono font-semibold">
                  ID: {profile?.student_id || 'Ready'}
                </p>

                {checkedInToday ? (
                  <span className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#dcfce7] text-[#15803d] text-xs font-bold border border-[#86efac]">
                    <CheckCircle size={13} /> Checked in at {checkInTimeString}
                  </span>
                ) : (
                  <span className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f8fafc] text-[#64748b] text-xs border border-[#e2e8f0]">
                    <Clock size={13} /> Ready for scan
                  </span>
                )}

                <div className="w-full space-y-2.5 mt-6">
                  <button
                    onClick={() => navigate('/student/scan')}
                    className="btn-primary w-full justify-center text-xs py-3.5"
                  >
                    <Camera size={15} /> Open Camera Scanner
                  </button>
                  <button
                    onClick={downloadQR}
                    className="btn-secondary w-full justify-center text-xs py-3.5"
                  >
                    {downloaded ? <><Check size={14} /> Saved!</> : <><Download size={14} /> Download ID QR</>}
                  </button>
                </div>
              </div>

              {/* Help & Support Card */}
              <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-[20px] p-4 text-xs text-[#64748b] space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-[#005a36]">
                  <Shield size={14} /> NDMC Attendance Rules
                </div>
                <p>Ensure you are within the classroom geofence before scanning the rotating kiosk token.</p>
              </div>
            </div>

          </div>

        </div>
      </div>


      {/* ══════════════════════════════════════════════════════════════
          2. MOBILE PHONE & TABLET APP LAYOUT (Visible on < lg screens)
             - Mobile (< 640px): max-w-md
             - Tablet (640px - 1023px, sm/md): widened to max-w-2xl / max-w-3xl
          ══════════════════════════════════════════════════════════════ */}
      <div className="lg:hidden flex justify-center">
        <div className="w-full max-w-md sm:max-w-xl md:max-w-2xl min-h-screen bg-[#ffffff] flex flex-col justify-between px-4 sm:px-6 md:px-8 pt-5 pb-24 relative shadow-sm border-x border-[#e2e8f0] transition-all">

          {/* ── Scrollable Content ── */}
          <div className="flex flex-col gap-6 w-full">

            {/* 1. Header Row */}
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
                <div className="hidden xs:block">
                  <p className="text-xs font-bold text-[#0f172a] leading-none group-hover:text-[#005a36] transition-colors truncate max-w-[120px] sm:max-w-[180px]">
                    {profile?.full_name || 'Student'}
                  </p>
                  <p className="text-[11px] text-[#64748b] font-mono leading-none mt-1">
                    {profile?.student_id || 'Student Portal'}
                  </p>
                </div>
              </button>

              <div className="flex items-center gap-2.5">
                <span className="text-[12px] sm:text-[13px] md:text-sm font-bold text-[#005a36] leading-tight text-right">
                  {roomScheduleText}
                </span>

                <button
                  onClick={async () => {
                    await signOut()
                    navigate('/login')
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-[#64748b] hover:text-[#b91c1c] hover:bg-[#fee2e2] active:scale-95 transition-all border border-[#e2e8f0] bg-[#f8fafc] shadow-sm"
                  title="Sign out"
                >
                  <LogOut size={14} />
                  <span className="hidden sm:inline">Sign out</span>
                </button>
              </div>
            </section>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-24">
                <Spinner size="lg" />
                <p className="text-xs text-[#64748b] mt-3 font-medium">Syncing student roll...</p>
              </div>
            ) : (
              <>
                {/* ── TAB 1: LIVE SESSION (DEFAULT APP SCREEN) ── */}
                {activeTab === 'live' && (
                  <>
                    {/* QR Hero Stage — Widens gracefully on tablet */}
                    <section className="bg-[#f8fafc] border border-[#e2e8f0] rounded-[24px] p-6 sm:p-8 md:p-10 flex flex-col items-center gap-4 relative shadow-sm">
                      <div className="relative w-[220px] h-[220px] sm:w-[240px] sm:h-[240px] rounded-[18px] bg-[#ffffff] flex items-center justify-center overflow-hidden shadow-sm border border-[#e2e8f0]">
                        <div
                          className="absolute inset-[-8px] rounded-[26px] border-2 border-[#005a36]/20 opacity-55 pointer-events-none"
                          style={{ animation: 'gesso-qr-breathe 3.2s ease-in-out infinite' }}
                        />
                        <QRCodeSVG
                          id="student-live-qr"
                          value={qrPayload}
                          size={190}
                          level="H"
                          includeMargin={false}
                          fgColor="#005a36"
                        />
                      </div>
                      <div className="flex flex-col items-center gap-1.5 text-center mt-1">
                        <span className="font-['Source_Serif_4',Georgia,serif] font-bold text-[22px] md:text-[26px] text-[#0f172a] tracking-tight">
                          {profile?.full_name || 'Student Name'}
                        </span>
                        {checkedInToday ? (
                          <span className="inline-flex items-center gap-1.5 px-4 py-1 rounded-full bg-[#dcfce7] text-[#15803d] font-bold text-[13px] border border-[#86efac]">
                            <CheckCircle size={14} />
                            Checked in at {checkInTimeString}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-4 py-1 rounded-full bg-[#ffffff] text-[#005a36] font-semibold text-[13px] border border-[#e2e8f0] shadow-sm">
                            <Sparkles size={14} className="text-[#d97706]" />
                            ID: {profile?.student_id || 'Ready to scan'}
                          </span>
                        )}
                      </div>
                    </section>

                    {/* Actions Row */}
                    <section className="flex flex-col gap-3">
                      <button
                        onClick={() => navigate('/student/scan')}
                        className="w-full py-4 px-4 rounded-[16px] bg-[#005a36] text-[#ffffff] font-semibold text-[14px] md:text-[15px] flex items-center justify-center gap-2 hover:bg-[#00482b] active:scale-[0.98] transition-all shadow-sm"
                      >
                        <Camera size={18} />
                        Open camera to scan
                      </button>
                      <div className="flex gap-3">
                        <button
                          onClick={handleRefresh}
                          className="flex-1 py-3.5 px-3 rounded-[16px] bg-[#f8fafc] text-[#0f172a] border border-[#e2e8f0] font-semibold text-[14px] flex items-center justify-center gap-2 hover:bg-[#f1f5f9] active:scale-[0.98] transition-all shadow-sm"
                        >
                          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                          Refresh
                        </button>
                        <button
                          onClick={() => setShowJoinModal(true)}
                          className="flex-1 py-3.5 px-3 rounded-[16px] bg-[#f8fafc] text-[#0f172a] border border-[#e2e8f0] font-semibold text-[14px] flex items-center justify-center gap-2 hover:bg-[#f1f5f9] active:scale-[0.98] transition-all shadow-sm"
                        >
                          <Plus size={16} />
                          Join Class
                        </button>
                        <button
                          onClick={() => navigate('/student/my-qr')}
                          className="flex-1 py-3.5 px-3 rounded-[16px] bg-[#f8fafc] text-[#0f172a] border border-[#e2e8f0] font-semibold text-[14px] flex items-center justify-center gap-2 hover:bg-[#f1f5f9] active:scale-[0.98] transition-all shadow-sm"
                        >
                          <QrCode size={16} />
                          Card ID
                        </button>
                      </div>
                    </section>

                    {/* Stat Pair Band — Expands gracefully into 4 columns on tablet */}
                    <section className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                      <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-[18px] p-4 sm:p-5 flex flex-col gap-1 shadow-sm">
                        <div className="flex items-center gap-1.5">
                          <Flame size={15} className="text-[#d97706]" />
                          <span className="text-[12px] text-[#64748b] font-medium">Streak</span>
                        </div>
                        <span className="font-['Source_Serif_4',Georgia,serif] font-bold text-[28px] md:text-[32px] leading-tight text-[#005a36]">
                          {currentStreak} Days
                        </span>
                      </div>

                      <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-[18px] p-4 sm:p-5 flex flex-col gap-1 shadow-sm">
                        <span className="text-[12px] text-[#64748b] font-medium">Today's Classes</span>
                        <span className="font-['Source_Serif_4',Georgia,serif] font-bold text-[28px] md:text-[32px] leading-tight text-[#0f172a]">
                          {classesTodayCount} Done
                        </span>
                      </div>

                      <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-[18px] p-4 sm:p-5 flex flex-col gap-1 shadow-sm">
                        <span className="text-[12px] text-[#64748b] font-medium">Present Logs</span>
                        <span className="font-['Source_Serif_4',Georgia,serif] font-bold text-[28px] md:text-[32px] leading-tight text-[#15803d]">
                          {presentCount}
                        </span>
                      </div>

                      <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-[18px] p-4 sm:p-5 flex flex-col gap-1 shadow-sm">
                        <span className="text-[12px] text-[#64748b] font-medium">Missed Logs</span>
                        <span className="font-['Source_Serif_4',Georgia,serif] font-bold text-[28px] md:text-[32px] leading-tight text-[#b91c1c]">
                          {absentCount}
                        </span>
                      </div>
                    </section>

                    {/* Attendance Progress Ring */}
                    <section className="flex flex-col gap-3">
                      <span className="text-[12px] uppercase font-bold tracking-[0.06em] text-[#005a36]">
                        Semester Overview
                      </span>
                      <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-[20px] p-5 md:p-6 flex items-center gap-6 shadow-sm">
                        <svg width="92" height="92" viewBox="0 0 92 92" className="shrink-0">
                          <circle cx="46" cy="46" r="38" fill="none" stroke="#e2e8f0" strokeWidth="8" />
                          <circle
                            cx="46" cy="46" r="38" fill="none" stroke="#005a36" strokeWidth="8"
                            strokeLinecap="round" pathLength="100" strokeDasharray={`${progressRatio} 100`}
                            transform="rotate(-90 46 46)"
                          />
                          <text x="46" y="53" textAnchor="middle" className="font-['Source_Serif_4',Georgia,serif] font-bold text-[22px] fill-[#005a36]">
                            {attendancePct}%
                          </text>
                        </svg>
                        <div className="flex flex-col gap-1 flex-1">
                          <span className="font-['Source_Serif_4',Georgia,serif] font-bold text-[19px] md:text-[22px] text-[#0f172a] leading-snug">
                            {presentCount} of {totalSessions || 1} sessions attended
                          </span>
                          <span className="text-[13px] text-[#64748b] leading-relaxed">
                            {absentCount} unexcused missed · {enrollments.length} active subject enrollments
                          </span>
                        </div>
                      </div>
                    </section>

                    {/* Recent Check-in History */}
                    <section className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] uppercase font-bold tracking-[0.06em] text-[#005a36]">
                          Recent check-ins
                        </span>
                        <button onClick={() => setActiveTab('history')} className="text-[12px] font-semibold text-[#005a36] hover:underline">
                          View all
                        </button>
                      </div>

                      <div className="flex flex-col mt-1">
                        {logs.length === 0 ? (
                          <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-[16px] p-6 text-center text-[#64748b] text-xs">
                            No attendance records logged yet. Scan a class QR to start!
                          </div>
                        ) : (
                          logs.slice(0, 5).map((log, idx, arr) => {
                            const isPresent = log.status === 'present' || log.status === 'late'
                            const dateObj = log.marked_at ? new Date(log.marked_at) : (log.attendance_sessions?.date ? new Date(log.attendance_sessions.date) : new Date())
                            const dateLabel = isToday(dateObj) ? `Today · ${format(dateObj, 'h:mm a')}` : format(dateObj, 'MMM d · h:mm a')

                            return (
                              <div key={log.id || idx} className="grid grid-cols-[24px_40px_1fr_auto] items-center gap-3 md:gap-4 py-3 relative">
                                <div className="flex flex-col items-center relative h-full">
                                  <div className={`w-3 h-3 rounded-full shrink-0 z-10 ${isPresent ? 'bg-[#005a36]' : 'bg-transparent border-2 border-[#cbd5e1]'}`} />
                                  {idx < arr.length - 1 && (
                                    <div className="absolute top-5 bottom-[-12px] left-1/2 -translate-x-1/2 w-0 border-l-2 border-dotted border-[#cbd5e1]" />
                                  )}
                                </div>
                                <div className="w-10 h-10 rounded-full bg-[#e6f2ec] text-[#005a36] flex items-center justify-center shadow-sm">
                                  <BookOpen size={18} />
                                </div>
                                <div className="flex flex-col min-w-0">
                                  <span className="font-semibold text-[15px] md:text-[16px] text-[#0f172a] truncate">
                                    {log.classes?.name || 'Class Session'}
                                  </span>
                                  <span className="text-[12px] md:text-[13px] text-[#64748b] truncate">
                                    {dateLabel} · {log.status ? log.status.toUpperCase() : 'MARKED'}
                                  </span>
                                </div>
                                <div className="shrink-0">
                                  {isPresent ? <CheckCircle size={18} className="text-[#005a36]" /> : <span className="text-xs text-[#64748b] font-medium">Missed</span>}
                                </div>
                              </div>
                            )
                          })
                        )}
                      </div>
                    </section>
                  </>
                )}

                {/* ── TAB 2: ENROLLED CLASSES (MOBILE/TABLET) ── */}
                {activeTab === 'classes' && (
                  <section className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] uppercase font-bold tracking-[0.06em] text-[#005a36]">
                        Your Courses ({enrollments.length})
                      </span>
                      <button onClick={() => setShowJoinModal(true)} className="text-[12px] font-semibold text-[#005a36] flex items-center gap-1 hover:underline">
                        <Plus size={14} /> Join New Class
                      </button>
                    </div>

                    {enrollments.length === 0 ? (
                      <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-[24px] p-8 text-center flex flex-col items-center gap-3">
                        <BookOpen size={32} className="text-[#64748b]" />
                        <p className="text-sm font-semibold text-[#0f172a]">You haven't joined any classes yet</p>
                        <p className="text-xs text-[#64748b]">Enter your teacher's 6-character join code to enroll.</p>
                        <button onClick={() => setShowJoinModal(true)} className="py-2.5 px-5 rounded-[16px] bg-[#005a36] text-[#ffffff] font-semibold text-xs mt-2">
                          Join a Class Now
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        {enrollments.map(cls => {
                          const classLogs = logs.filter(l => l.class_id === cls.id)
                          const t = classLogs.length
                          const p = classLogs.filter(l => l.status === 'present' || l.status === 'late').length
                          const rate = t > 0 ? Math.round((p / t) * 100) : 0

                          return (
                            <Link
                              key={cls.id}
                              to={`/student/class/${cls.id}`}
                              className="bg-[#f8fafc] border border-[#e2e8f0] rounded-[20px] p-4 md:p-5 flex flex-col gap-3 hover:bg-[#e6f2ec]/40 active:scale-[0.99] transition-all shadow-sm"
                            >
                              <div className="flex items-start justify-between">
                                <div>
                                  <h3 className="font-['Source_Serif_4',Georgia,serif] font-bold text-[16px] md:text-[17px] text-[#0f172a]">
                                    {cls.name}
                                  </h3>
                                  <p className="text-[12px] text-[#64748b] mt-0.5">
                                    {cls.schedule || 'Schedule TBA'} {cls.room ? `· ${cls.room}` : ''}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <span className="font-['Source_Serif_4',Georgia,serif] font-bold text-[16px] md:text-[18px] text-[#005a36]">
                                    {rate}%
                                  </span>
                                  <p className="text-[10px] text-[#64748b]">{p} of {t} attended</p>
                                </div>
                              </div>

                              <div className="w-full h-2 bg-[#e2e8f0] rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-[#005a36] transition-all duration-700"
                                  style={{ width: `${rate}%` }}
                                />
                              </div>
                            </Link>
                          )
                        })}
                      </div>
                    )}
                  </section>
                )}

                {/* ── TAB 3: HISTORY (MOBILE/TABLET) ── */}
                {activeTab === 'history' && (
                  <section className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] uppercase font-bold tracking-[0.06em] text-[#005a36]">
                        All Check-ins ({logs.length})
                      </span>
                      <span className="text-[12px] font-semibold text-[#005a36]">
                        {attendancePct}% Overall
                      </span>
                    </div>

                    {logs.length === 0 ? (
                      <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-[24px] p-8 text-center text-[#64748b] text-xs">
                        No logs found. Attend classes to generate your attendance records.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        {logs.map(log => {
                          const isPresent = log.status === 'present' || log.status === 'late'
                          const isLate = log.status === 'late'
                          const dateObj = log.marked_at ? new Date(log.marked_at) : (log.attendance_sessions?.date ? new Date(log.attendance_sessions.date) : new Date())

                          return (
                            <div
                              key={log.id}
                              className="bg-[#f8fafc] border border-[#e2e8f0] rounded-[16px] p-3.5 md:p-4 flex items-center justify-between shadow-sm"
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-full flex items-center justify-center shadow-sm ${isPresent ? 'bg-[#dcfce7] text-[#15803d]' : 'bg-[#fee2e2] text-[#b91c1c]'}`}>
                                  {isPresent ? <Check size={16} /> : <X size={16} />}
                                </div>
                                <div className="flex flex-col">
                                  <span className="font-semibold text-sm text-[#0f172a]">
                                    {log.classes?.name || 'Class Session'}
                                  </span>
                                  <span className="text-[11px] text-[#64748b]">
                                    {format(dateObj, 'EEEE, MMM d · h:mm a')}
                                  </span>
                                </div>
                              </div>

                              <span className={`text-[12px] font-bold px-2.5 py-1 rounded-full ${
                                log.status === 'present'
                                  ? 'bg-[#dcfce7] text-[#15803d]'
                                  : isLate
                                  ? 'bg-[#fef3c7] text-[#92400e]'
                                  : 'bg-[#fee2e2] text-[#b91c1c]'
                              }`}>
                                {log.status?.toUpperCase() || 'ABSENT'}
                              </span>
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

          {/* ── Fixed Bottom Tab Bar — Widened comfortably on tablet (max-w-2xl) ── */}
          <nav
            data-component="TabBar"
            className="fixed bottom-0 left-0 right-0 max-w-md sm:max-w-xl md:max-w-2xl mx-auto h-16 md:h-18 bg-[#ffffff]/95 backdrop-blur-md border-t border-[#e2e8f0] flex items-center justify-between px-6 sm:px-12 md:px-16 z-40 shadow-lg"
          >
            <button
              onClick={() => setActiveTab('live')}
              className={`flex flex-col items-center gap-1 flex-1 text-[10px] md:text-xs font-semibold transition-all hover:scale-105 active:scale-95 ${
                activeTab === 'live' ? 'text-[#005a36] font-bold' : 'text-[#64748b]'
              }`}
            >
              <QrCode size={22} className={activeTab === 'live' ? 'text-[#005a36]' : 'text-[#64748b]'} />
              <span>Live Session</span>
            </button>

            <button
              onClick={() => setActiveTab('classes')}
              className={`flex flex-col items-center gap-1 flex-1 text-[10px] md:text-xs font-semibold transition-all hover:scale-105 active:scale-95 ${
                activeTab === 'classes' ? 'text-[#005a36] font-bold' : 'text-[#64748b]'
              }`}
            >
              <BookOpen size={22} className={activeTab === 'classes' ? 'text-[#005a36]' : 'text-[#64748b]'} />
              <span>Classes</span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`flex flex-col items-center gap-1 flex-1 text-[10px] md:text-xs font-semibold transition-all hover:scale-105 active:scale-95 ${
                activeTab === 'history' ? 'text-[#005a36] font-bold' : 'text-[#64748b]'
              }`}
            >
              <Calendar size={22} className={activeTab === 'history' ? 'text-[#005a36]' : 'text-[#64748b]'} />
              <span>History</span>
            </button>
          </nav>

        </div>
      </div>

      {/* Join Class Modal */}
      {showJoinModal && (
        <JoinClassModal
          studentId={profile?.id}
          onClose={() => setShowJoinModal(false)}
          onEnrolled={newCls => setEnrollments(prev => [...prev, newCls])}
        />
      )}
    </div>
  )
}

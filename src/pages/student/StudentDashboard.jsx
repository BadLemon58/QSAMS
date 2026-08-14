import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { QRCodeSVG } from 'qrcode.react'
import { format, isToday } from 'date-fns'
import {
  Camera, RefreshCw, Share2, Plus, X, Flame, CheckCircle,
  AlertCircle, BookOpen, Clock, Calendar, QrCode, ArrowLeft,
  Users, User, ChevronRight, Sparkles, Check
} from 'lucide-react'
import Spinner from '../../components/common/Spinner'

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

// ── Main Component: Student Dashboard (NDMC Forest Green Style) ───────────
export default function StudentDashboard() {
  const { profile } = useAuth()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState('live') // 'live' | 'classes' | 'history'
  const [enrollments, setEnrollments] = useState([])
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showJoinModal, setShowJoinModal] = useState(false)

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

  return (
    <div className="min-h-screen bg-[#f4f6f8] text-[#0f172a] font-['Gambarino',system-ui,sans-serif] flex justify-center selection:bg-[#005a36]/20">
      
      {/* Mobile Shell Wrapper */}
      <div className="w-full max-w-[420px] min-h-screen bg-[#ffffff] flex flex-col justify-between px-4 pt-5 pb-24 relative shadow-sm border-x border-[#e2e8f0]">

        {/* ══════════ MAIN SCROLLABLE CONTENT ══════════ */}
        <div className="flex flex-col gap-6 w-full">

          {/* 1. Header Row */}
          <section className="flex items-center justify-between w-full">
            <button
              onClick={() => navigate('/profile')}
              aria-label="Profile settings"
              className="w-10 h-10 rounded-full bg-[#f1f5f9] flex items-center justify-center text-[#0f172a] hover:bg-[#e2e8f0] active:scale-95 transition-all"
            >
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                <User size={18} />
              )}
            </button>
            <div className="flex flex-col text-right">
              <span className="text-[13px] font-bold text-[#005a36] leading-tight">
                {roomScheduleText}
              </span>
              <h1 className="text-[20px] font-bold font-['Source_Serif_4',Georgia,serif] text-[#0f172a] leading-tight mt-0.5">
                {activeTab === 'live' && 'Your check-in'}
                {activeTab === 'classes' && 'Enrolled Classes'}
                {activeTab === 'history' && 'Attendance History'}
              </h1>
            </div>
          </section>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-24">
              <Spinner size="lg" />
              <p className="text-xs text-[#64748b] mt-3 font-medium">Syncing student roll...</p>
            </div>
          ) : (
            <>
              {/* ══════════ TAB 1: LIVE SESSION (DEFAULT SCREEN) ══════════ */}
              {activeTab === 'live' && (
                <>
                  {/* 2. QR Hero Stage — Student's Personal Check-in Code */}
                  <section className="bg-[#f8fafc] border border-[#e2e8f0] rounded-[24px] p-7 flex flex-col items-center gap-4 relative shadow-sm">
                    <div className="relative w-[220px] h-[220px] rounded-[16px] bg-[#ffffff] flex items-center justify-center overflow-hidden shadow-sm border border-[#e2e8f0]">
                      <div
                        className="absolute inset-[-8px] rounded-[24px] border-2 border-[#005a36]/20 opacity-55 pointer-events-none"
                        style={{ animation: 'gesso-qr-breathe 3.2s ease-in-out infinite' }}
                      />
                      <QRCodeSVG
                        id="student-live-qr"
                        value={qrPayload}
                        size={180}
                        level="H"
                        includeMargin={false}
                        fgColor="#005a36"
                      />
                    </div>
                    <div className="flex flex-col items-center gap-1.5 text-center mt-1">
                      <span className="font-['Source_Serif_4',Georgia,serif] font-bold text-[22px] text-[#0f172a] tracking-tight">
                        {profile?.full_name || 'Student Name'}
                      </span>
                      {checkedInToday ? (
                        <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#dcfce7] text-[#15803d] font-bold text-[13px] border border-[#86efac]">
                          <CheckCircle size={14} />
                          Checked in at {checkInTimeString}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#ffffff] text-[#005a36] font-semibold text-[13px] border border-[#e2e8f0] shadow-sm">
                          <Sparkles size={14} className="text-[#d97706]" />
                          ID: {profile?.student_id || 'Ready to scan'}
                        </span>
                      )}
                    </div>
                  </section>

                  {/* 3. Session Action Row */}
                  <section className="flex flex-col gap-3">
                    <button
                      onClick={() => navigate('/student/scan')}
                      className="w-full py-4 px-4 rounded-[16px] bg-[#005a36] text-[#ffffff] font-semibold text-[14px] flex items-center justify-center gap-2 hover:bg-[#00482b] active:scale-[0.98] transition-all shadow-sm"
                    >
                      <Camera size={18} />
                      Open camera to scan
                    </button>
                    <div className="flex gap-3">
                      <button
                        onClick={handleRefresh}
                        className="flex-1 py-3.5 px-3 rounded-[16px] bg-[#f8fafc] text-[#0f172a] border border-[#e2e8f0] font-semibold text-[14px] flex items-center justify-center gap-2 hover:bg-[#f1f5f9] active:scale-[0.98] transition-all"
                      >
                        <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                        Refresh
                      </button>
                      <button
                        onClick={() => setShowJoinModal(true)}
                        className="flex-1 py-3.5 px-3 rounded-[16px] bg-[#f8fafc] text-[#0f172a] border border-[#e2e8f0] font-semibold text-[14px] flex items-center justify-center gap-2 hover:bg-[#f1f5f9] active:scale-[0.98] transition-all"
                      >
                        <Plus size={16} />
                        Join Class
                      </button>
                      <button
                        onClick={() => navigate('/student/my-qr')}
                        className="flex-1 py-3.5 px-3 rounded-[16px] bg-[#f8fafc] text-[#0f172a] border border-[#e2e8f0] font-semibold text-[14px] flex items-center justify-center gap-2 hover:bg-[#f1f5f9] active:scale-[0.98] transition-all"
                      >
                        <QrCode size={16} />
                        Card ID
                      </button>
                    </div>
                  </section>

                  {/* 4. Stat Pair Band */}
                  <section className="grid grid-cols-2 gap-4">
                    <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-[16px] p-5 flex flex-col gap-2 shadow-sm">
                      <div className="flex items-center gap-2">
                        <Flame size={16} className="text-[#d97706]" />
                        <span className="text-[12px] text-[#64748b] font-medium">Attendance streak</span>
                      </div>
                      <span className="font-['Source_Serif_4',Georgia,serif] font-bold text-[32px] leading-8 text-[#005a36]">
                        {currentStreak}
                      </span>
                    </div>
                    <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-[16px] p-5 flex flex-col gap-2 shadow-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] text-[#64748b] font-medium">Classes done today</span>
                      </div>
                      <span className="font-['Source_Serif_4',Georgia,serif] font-bold text-[32px] leading-8 text-[#0f172a]">
                        {classesTodayCount}
                      </span>
                    </div>
                  </section>

                  {/* 5. Attendance Progress Ring (Data-Viz Gauge) */}
                  <section className="flex flex-col gap-3">
                    <span className="text-[12px] uppercase font-bold tracking-[0.06em] text-[#005a36]">
                      This semester
                    </span>
                    <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-[16px] p-5 flex items-center gap-5 shadow-sm">
                      <svg width="88" height="88" viewBox="0 0 88 88" className="shrink-0">
                        <circle
                          cx="44"
                          cy="44"
                          r="36"
                          fill="none"
                          stroke="#e2e8f0"
                          strokeWidth="8"
                        />
                        <circle
                          cx="44"
                          cy="44"
                          r="36"
                          fill="none"
                          stroke="#005a36"
                          strokeWidth="8"
                          strokeLinecap="round"
                          pathLength="100"
                          strokeDasharray={`${progressRatio} 100`}
                          transform="rotate(-90 44 44)"
                        />
                        <text
                          x="44"
                          y="50"
                          textAnchor="middle"
                          className="font-['Source_Serif_4',Georgia,serif] font-bold text-[22px] fill-[#005a36]"
                        >
                          {attendancePct}%
                        </text>
                      </svg>
                      <div className="flex flex-col gap-1 flex-1">
                        <span className="font-['Source_Serif_4',Georgia,serif] font-bold text-[18px] text-[#0f172a] leading-snug">
                          {presentCount} of {totalSessions || 1} sessions
                        </span>
                        <span className="text-[12px] text-[#64748b] leading-tight">
                          {absentCount} missed · {enrollments.length} enrolled subjects
                        </span>
                      </div>
                    </div>
                  </section>

                  {/* 6. Recent Check-in History (Dotted Rail Motif) */}
                  <section className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] uppercase font-bold tracking-[0.06em] text-[#005a36]">
                        Recent check-ins
                      </span>
                      <button
                        onClick={() => setActiveTab('history')}
                        className="text-[12px] font-semibold text-[#005a36] hover:underline"
                      >
                        View all
                      </button>
                    </div>

                    <div className="flex flex-col mt-1">
                      {logs.length === 0 ? (
                        <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-[16px] p-6 text-center text-[#64748b] text-xs">
                          No attendance records logged yet. Scan a class QR to start!
                        </div>
                      ) : (
                        logs.slice(0, 4).map((log, idx, arr) => {
                          const isPresent = log.status === 'present' || log.status === 'late'
                          const dateObj = log.marked_at ? new Date(log.marked_at) : (log.attendance_sessions?.date ? new Date(log.attendance_sessions.date) : new Date())
                          const dateLabel = isToday(dateObj) ? `Today · ${format(dateObj, 'h:mm a')}` : format(dateObj, 'MMM d · h:mm a')

                          return (
                            <div key={log.id || idx} className="grid grid-cols-[24px_40px_1fr_auto] items-center gap-3 py-3 relative">
                              {/* Dotted Rail */}
                              <div className="flex flex-col items-center relative h-full">
                                <div className={`w-3 h-3 rounded-full shrink-0 z-10 ${isPresent ? 'bg-[#005a36]' : 'bg-transparent border-2 border-[#cbd5e1]'}`} />
                                {idx < arr.length - 1 && (
                                  <div className="absolute top-5 bottom-[-12px] left-1/2 -translate-x-1/2 w-0 border-l-2 border-dotted border-[#cbd5e1]" />
                                )}
                              </div>

                              {/* Class Icon */}
                              <div className="w-10 h-10 rounded-full bg-[#e6f2ec] text-[#005a36] flex items-center justify-center">
                                <BookOpen size={18} />
                              </div>

                              {/* Details */}
                              <div className="flex flex-col min-w-0">
                                <span className="font-semibold text-[15px] text-[#0f172a] truncate">
                                  {log.classes?.name || 'Class Session'}
                                </span>
                                <span className="text-[12px] text-[#64748b] truncate">
                                  {dateLabel} · {log.status ? log.status.toUpperCase() : 'MARKED'}
                                </span>
                              </div>

                              {/* Check Status */}
                              <div className="shrink-0">
                                {isPresent ? (
                                  <CheckCircle size={18} className="text-[#005a36]" />
                                ) : (
                                  <span className="text-xs text-[#64748b] font-medium">Missed</span>
                                )}
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </section>
                </>
              )}

              {/* ══════════ TAB 2: ENROLLED CLASSES ══════════ */}
              {activeTab === 'classes' && (
                <section className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] uppercase font-bold tracking-[0.06em] text-[#005a36]">
                      Your Courses ({enrollments.length})
                    </span>
                    <button
                      onClick={() => setShowJoinModal(true)}
                      className="text-[12px] font-semibold text-[#005a36] flex items-center gap-1 hover:underline"
                    >
                      <Plus size={14} /> Join New Class
                    </button>
                  </div>

                  {enrollments.length === 0 ? (
                    <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-[24px] p-8 text-center flex flex-col items-center gap-3">
                      <BookOpen size={32} className="text-[#64748b]" />
                      <p className="text-sm font-semibold text-[#0f172a]">You haven't joined any classes yet</p>
                      <p className="text-xs text-[#64748b]">Enter your teacher's 6-character join code to enroll.</p>
                      <button
                        onClick={() => setShowJoinModal(true)}
                        className="py-2.5 px-5 rounded-[16px] bg-[#005a36] text-[#ffffff] font-semibold text-xs mt-2"
                      >
                        Join a Class Now
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {enrollments.map(cls => {
                        const classLogs = logs.filter(l => l.class_id === cls.id)
                        const t = classLogs.length
                        const p = classLogs.filter(l => l.status === 'present' || l.status === 'late').length
                        const rate = t > 0 ? Math.round((p / t) * 100) : 0

                        return (
                          <Link
                            key={cls.id}
                            to={`/student/class/${cls.id}`}
                            className="bg-[#f8fafc] border border-[#e2e8f0] rounded-[20px] p-4 flex flex-col gap-3 hover:bg-[#e6f2ec]/50 active:scale-[0.99] transition-all"
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
                              <div className="text-right">
                                <span className="font-['Source_Serif_4',Georgia,serif] font-bold text-[16px] text-[#005a36]">
                                  {rate}%
                                </span>
                                <p className="text-[10px] text-[#64748b]">{p} of {t} attended</p>
                              </div>
                            </div>

                            {/* Progress Track */}
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

              {/* ══════════ TAB 3: ATTENDANCE HISTORY ══════════ */}
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
                    <div className="flex flex-col gap-2.5">
                      {logs.map(log => {
                        const isPresent = log.status === 'present' || log.status === 'late'
                        const isLate = log.status === 'late'
                        const dateObj = log.marked_at ? new Date(log.marked_at) : (log.attendance_sessions?.date ? new Date(log.attendance_sessions.date) : new Date())

                        return (
                          <div
                            key={log.id}
                            className="bg-[#f8fafc] border border-[#e2e8f0] rounded-[16px] p-3.5 flex items-center justify-between shadow-sm"
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-9 h-9 rounded-full flex items-center justify-center ${isPresent ? 'bg-[#dcfce7] text-[#15803d]' : 'bg-[#fee2e2] text-[#b91c1c]'}`}>
                                {isPresent ? <Check size={16} /> : <X size={16} />}
                              </div>
                              <div className="flex flex-col">
                                <span className="font-semibold text-sm text-[#0f172a]">
                                  {log.classes?.name || 'Class Session'}
                                </span>
                                <span className="text-[11px] text-[#64748b]">
                                  {format(dateObj, 'EEEE, MMM d, yyyy · h:mm a')}
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

        {/* ══════════ FIXED BOTTOM TAB BAR ══════════ */}
        <nav
          data-component="TabBar"
          data-chrome="tab-bar"
          className="fixed bottom-0 left-0 right-0 max-w-[420px] mx-auto h-16 bg-[#ffffff] border-t border-[#e2e8f0] flex items-center justify-between px-6 z-40"
        >
          {/* Tab 1: Live Session */}
          <button
            onClick={() => setActiveTab('live')}
            className={`flex flex-col items-center gap-1 flex-1 text-[10px] font-semibold transition-colors ${
              activeTab === 'live' ? 'text-[#005a36]' : 'text-[#64748b]'
            }`}
          >
            <QrCode size={22} className={activeTab === 'live' ? 'text-[#005a36]' : 'text-[#64748b]'} />
            <span>Live Session</span>
          </button>

          {/* Tab 2: Classes */}
          <button
            onClick={() => setActiveTab('classes')}
            className={`flex flex-col items-center gap-1 flex-1 text-[10px] font-semibold transition-colors ${
              activeTab === 'classes' ? 'text-[#005a36]' : 'text-[#64748b]'
            }`}
          >
            <BookOpen size={22} className={activeTab === 'classes' ? 'text-[#005a36]' : 'text-[#64748b]'} />
            <span>Classes</span>
          </button>

          {/* Tab 3: History */}
          <button
            onClick={() => setActiveTab('history')}
            className={`flex flex-col items-center gap-1 flex-1 text-[10px] font-semibold transition-colors ${
              activeTab === 'history' ? 'text-[#005a36]' : 'text-[#64748b]'
            }`}
          >
            <Calendar size={22} className={activeTab === 'history' ? 'text-[#005a36]' : 'text-[#64748b]'} />
            <span>History</span>
          </button>
        </nav>

      </div>

      {/* Join Modal Overlay */}
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

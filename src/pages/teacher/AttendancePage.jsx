import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import Navbar from '../../components/common/Navbar'
import KioskMode from '../../components/teacher/KioskMode'
import IDCardScanner from '../../components/teacher/IDCardScanner'
import RosterTable from '../../components/teacher/RosterTable'
import Spinner from '../../components/common/Spinner'
import {
  Tv2, ScanLine, ArrowLeft, CheckCircle,
  AlertCircle, Users, CalendarDays, Zap,
  Download, FileSpreadsheet
} from 'lucide-react'
import AttendanceReportModal from '../../components/teacher/AttendanceReportModal'
import { exportSingleSessionToExcel } from '../../lib/excelExport'

// ── Mode toggle button ──────────────────────────────────────
function ModeTab({ id, icon: Icon, label, description, active, onClick }) {
  return (
    <button
      id={id}
      onClick={onClick}
      className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all duration-200 ${
        active
          ? 'bg-indigo-500/15 border-indigo-500/50 shadow-lg shadow-indigo-500/10'
          : 'bg-slate-900/40 border-slate-700/40 hover:border-slate-600/60 hover:bg-slate-800/40'
      }`}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
        active ? 'bg-indigo-500/25 text-indigo-300' : 'bg-slate-800 text-slate-500'
      }`}>
        <Icon size={20} />
      </div>
      <div className="text-center">
        <p className={`font-semibold text-sm ${active ? 'text-indigo-300' : 'text-slate-400'}`}>{label}</p>
        <p className="text-slate-600 text-xs mt-0.5 hidden sm:block">{description}</p>
      </div>
    </button>
  )
}

// ── Toast notification ──────────────────────────────────────
function Toast({ message, type, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3500)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl text-sm font-medium animate-fade-in ${
      type === 'success'
        ? 'bg-emerald-900/90 border border-emerald-500/40 text-emerald-300'
        : 'bg-red-900/90 border border-red-500/40 text-red-300'
    }`}>
      {type === 'success'
        ? <CheckCircle size={18} className="text-emerald-400" />
        : <AlertCircle size={18} className="text-red-400" />}
      {message}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// MAIN: AttendancePage — Dual-Method Attendance
// ══════════════════════════════════════════════════════════════
export default function AttendancePage() {
  const { classId } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuth()

  // UI state
  const [mode, setMode] = useState('kiosk') // 'kiosk' | 'idcard'
  const [toast, setToast] = useState(null)
  const [showReportModal, setShowReportModal] = useState(false)

  // Data state
  const [classInfo, setClassInfo] = useState(null)
  const [session, setSession] = useState(null)
  const [roster, setRoster] = useState([])
  const [loadingRoster, setLoadingRoster] = useState(true)

  // ── Excel Export for current session ──────────────────────
  const handleExportSessionExcel = () => {
    if (roster.length === 0) {
      showToast('No students to export in this session.', 'error')
      return
    }

    exportSingleSessionToExcel({
      classInfo,
      session,
      roster,
      teacherName: profile?.full_name,
    })

    showToast('Downloaded session Excel report!', 'success')
  }

  // ── Load class info ────────────────────────────────────────
  useEffect(() => {
    const fetchClass = async () => {
      const { data } = await supabase
        .from('classes')
        .select('*')
        .eq('id', classId)
        .single()
      if (data) setClassInfo(data)
    }
    fetchClass()
  }, [classId])

  // ── Load active session ────────────────────────────────────
  useEffect(() => {
    const fetchSession = async () => {
      const { data } = await supabase
        .from('attendance_sessions')
        .select('*')
        .eq('class_id', classId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      setSession(data)
    }
    fetchSession()

    // Real-time: update when session changes
    const channel = supabase
      .channel(`session:${classId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public',
        table: 'attendance_sessions',
        filter: `class_id=eq.${classId}`
      }, () => fetchSession())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [classId])

  // ── Load roster + current attendance logs ──────────────────
  const loadRoster = useCallback(async () => {
    setLoadingRoster(true)

    // Fetch enrolled students
    const { data: enrollments } = await supabase
      .from('enrollments')
      .select('student_id, profiles(id, full_name, student_id)')
      .eq('class_id', classId)

    if (!enrollments) { setLoadingRoster(false); return }

    const students = enrollments.map(e => e.profiles).filter(Boolean)

    // Fetch attendance logs for today's active session
    let logs = []
    if (session?.id) {
      const { data: logData } = await supabase
        .from('attendance_logs')
        .select('*')
        .eq('session_id', session.id)
      logs = logData || []
    }

    // Merge: attach current status to each student
    const merged = students.map(s => {
      const log = logs.find(l => l.student_id === s.id)
      return { ...s, status: log?.status || null, log_id: log?.id || null }
    })

    // Sort: marked students first, then alphabetically
    merged.sort((a, b) => {
      if (a.status && !b.status) return -1
      if (!a.status && b.status) return 1
      return (a.full_name || '').localeCompare(b.full_name || '')
    })

    setRoster(merged)
    setLoadingRoster(false)
  }, [classId, session?.id])

  useEffect(() => { loadRoster() }, [loadRoster])

  // Real-time roster refresh when logs change
  useEffect(() => {
    if (!session?.id) return
    const channel = supabase
      .channel(`logs:${session.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public',
        table: 'attendance_logs',
        filter: `session_id=eq.${session.id}`
      }, () => loadRoster())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [session?.id, loadRoster])

  // ── Mark attendance (used by both scanner and manual override) ──
  const markAttendance = useCallback(async (studentId, status, method = 'manual') => {
    if (!session?.id) {
      showToast('No active session. Please generate a QR first.', 'error')
      return false
    }

    // Upsert: insert or update if already marked
    const { error } = await supabase
      .from('attendance_logs')
      .upsert({
        session_id: session.id,
        student_id: studentId,
        class_id: classId,
        status,
        method,
        marked_at: new Date().toISOString(),
      }, { onConflict: 'session_id,student_id' })

    if (error) {
      showToast(`Error: ${error.message}`, 'error')
      return false
    }

    // Eagerly update local state so the dropdown updates instantly
    setRoster(prev => prev.map(s => s.id === studentId ? { ...s, status } : s))

    showToast(`Marked ${status}!`, 'success')
    return true
  }, [session, classId])

  // ── ID Card scanner: decode student_id from QR payload ────
  const handleIDCardScan = useCallback(async (rawValue) => {
    // Try to find student by their student_id string
    let targetStudentId = rawValue

    // If it's a JSON payload (from QSAMS student QR), parse it
    try {
      const parsed = JSON.parse(rawValue)
      targetStudentId = parsed.studentId || parsed.id || rawValue
    } catch (_) { /* plain string student_id — ok */ }

    // Look up the profile uuid from the student_id string
    const { data: found } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('student_id', targetStudentId)
      .single()

    if (!found) {
      showToast(`Student not found: ${targetStudentId}`, 'error')
      return
    }

    // Check enrollment
    const enrolled = roster.find(s => s.id === found.id)
    if (!enrolled) {
      showToast(`${found.full_name} is not enrolled in this class.`, 'error')
      return
    }

    await markAttendance(found.id, 'present', 'qr_teacher')
    showToast(`✓ ${found.full_name} marked present`, 'success')
  }, [roster, markAttendance])

  const showToast = (message, type) => {
    setToast({ message, type, key: Date.now() })
  }

  // ── Manual override handler ─────────────────────────────────
  const handleManualOverride = useCallback((studentId, status) => {
    return markAttendance(studentId, status, 'manual')
  }, [markAttendance])

  // ── Render ──────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0a0f1e]">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Back button + Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(`/teacher/class/${classId}`)}
            className="flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-4 transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Class
          </button>

          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <CalendarDays size={16} className="text-indigo-400" />
                <span className="text-indigo-400 text-sm font-medium">
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">Take Attendance</h1>
              {classInfo && (
                <p className="text-slate-400 text-sm mt-1">{classInfo.name}</p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 self-start">
              <button
                onClick={handleExportSessionExcel}
                className="btn-secondary btn-sm flex items-center gap-1.5"
                title="Download formatted Excel workbook for this session"
              >
                <FileSpreadsheet size={14} className="text-emerald-400" /> Export Excel
              </button>
              <button
                onClick={() => setShowReportModal(true)}
                className="btn-secondary btn-sm flex items-center gap-1.5"
                title="Generate Full Attendance Report"
              >
                <FileSpreadsheet size={14} className="text-indigo-400" /> Full Report
              </button>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <span className="pulse-dot" />
                <span className="text-emerald-400 text-xs font-medium">Session Active</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* ── LEFT PANEL: Mode selector + Active tool ── */}
          <div className="lg:col-span-2 flex flex-col gap-5">

            {/* Mode Toggle */}
            <div className="glass-card p-2 flex gap-2">
              <ModeTab
                id="mode-kiosk"
                icon={Tv2}
                label="Kiosk Mode"
                description="Display QR for students to scan"
                active={mode === 'kiosk'}
                onClick={() => setMode('kiosk')}
              />
              <ModeTab
                id="mode-idcard"
                icon={ScanLine}
                label="ID Card Mode"
                description="Scan student QR with camera"
                active={mode === 'idcard'}
                onClick={() => setMode('idcard')}
              />
            </div>

            {/* Mode Tip */}
            <div className="flex items-start gap-2 bg-slate-800/40 border border-slate-700/30 rounded-xl px-4 py-3">
              <Zap size={14} className="text-yellow-400 flex-shrink-0 mt-0.5" />
              <p className="text-slate-400 text-xs leading-relaxed">
                {mode === 'kiosk'
                  ? 'Project this QR code on a screen. Students scan it using the QSAMS mobile scanner to mark themselves present.'
                  : 'Use this to scan each student\'s printed or displayed QR ID card as they walk in.'}
              </p>
            </div>

            {/* Active Tool Panel */}
            <div className="glass-card p-6 animate-fade-in">
              {mode === 'kiosk' && (
                <KioskMode classId={classId} />
              )}
              {mode === 'idcard' && (
                <IDCardScanner
                  onScan={handleIDCardScan}
                  onError={msg => showToast(msg, 'error')}
                />
              )}
            </div>
          </div>

          {/* ── RIGHT PANEL: Roster ── */}
          <div className="lg:col-span-3 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-white flex items-center gap-2">
                <Users size={16} className="text-indigo-400" />
                Student Roster
              </h2>
              <span className="text-slate-500 text-xs">
                {roster.filter(s => s.status === 'present' || s.status === 'late').length} / {roster.length} present
              </span>
            </div>

            <RosterTable
              students={roster}
              onStatusChange={handleManualOverride}
              loading={loadingRoster}
            />
          </div>
        </div>
      </div>

      {/* Full Report Modal */}
      {showReportModal && (
        <AttendanceReportModal
          classId={classId}
          classInfo={classInfo}
          teacherName={profile?.full_name}
          onClose={() => setShowReportModal(false)}
        />
      )}

      {/* Toast */}
      {toast && (
        <Toast
          key={toast.key}
          message={toast.message}
          type={toast.type}
          onDone={() => setToast(null)}
        />
      )}
    </div>
  )
}

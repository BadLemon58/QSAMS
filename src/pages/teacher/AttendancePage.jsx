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
import { format } from 'date-fns'

// ── Mode Toggle Button (Chalk Register Style) ─────────────────────────────
function ModeTab({ id, icon: Icon, label, description, active, onClick }) {
  return (
    <button
      id={id}
      onClick={onClick}
      className={`flex-1 flex flex-col items-center gap-1.5 p-4 rounded-[20px] border transition-all ${
        active
          ? 'bg-[#ffffff] border-[#DDD9D3] shadow-sm text-[#ee6a2a]'
          : 'bg-[#f5f5f5] border-transparent text-[#7a7a7a] hover:text-[#1a1a1a]'
      }`}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
        active ? 'bg-[#ebebeb] text-[#ee6a2a]' : 'bg-[#ffffff] text-[#7a7a7a]'
      }`}>
        <Icon size={20} />
      </div>
      <div className="text-center">
        <p className={`font-semibold text-sm ${active ? 'text-[#1a1a1a]' : 'text-[#7a7a7a]'}`}>{label}</p>
        <p className="text-[#7a7a7a] text-xs mt-0.5 hidden sm:block">{description}</p>
      </div>
    </button>
  )
}

// ── Toast Notification (Chalk Register Style) ─────────────────────────────
function Toast({ message, type, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3500)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-[20px] shadow-2xl text-sm font-semibold animate-fade-in ${
      type === 'success'
        ? 'bg-[#DCFCE7] border border-[#86EFAC] text-[#15803D]'
        : 'bg-[#FEE2E2] border border-[#FCA5A5] text-[#B91C1C]'
    }`}>
      {type === 'success'
        ? <CheckCircle size={18} />
        : <AlertCircle size={18} />}
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

  // Excel export
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

  // Load class info
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

  // Load active session
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

  // Load roster + current attendance logs
  const loadRoster = useCallback(async () => {
    setLoadingRoster(true)

    const { data: enrollments } = await supabase
      .from('enrollments')
      .select('student_id, profiles(id, full_name, student_id, avatar_url)')
      .eq('class_id', classId)

    if (!enrollments) { setLoadingRoster(false); return }

    const students = enrollments.map(e => e.profiles).filter(Boolean)

    let logs = []
    if (session?.id) {
      const { data: logData } = await supabase
        .from('attendance_logs')
        .select('*')
        .eq('session_id', session.id)
      logs = logData || []
    }

    const merged = students.map(s => {
      const log = logs.find(l => l.student_id === s.id)
      return { ...s, status: log?.status || null, log_id: log?.id || null }
    })

    merged.sort((a, b) => {
      if (a.status && !b.status) return -1
      if (!a.status && b.status) return 1
      return (a.full_name || '').localeCompare(b.full_name || '')
    })

    setRoster(merged)
    setLoadingRoster(false)
  }, [classId, session?.id])

  useEffect(() => { loadRoster() }, [loadRoster])

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

  // Mark attendance
  const markAttendance = useCallback(async (studentId, status, method = 'manual') => {
    if (!session?.id) {
      showToast('No active session. Please generate a QR first.', 'error')
      return false
    }

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

    setRoster(prev => prev.map(s => s.id === studentId ? { ...s, status } : s))
    showToast(`Marked ${status}!`, 'success')
    return true
  }, [session, classId])

  // ID Card scanner handler
  const handleIDCardScan = useCallback(async (rawValue) => {
    let targetStudentId = rawValue
    try {
      const parsed = JSON.parse(rawValue)
      targetStudentId = parsed.studentId || parsed.id || rawValue
    } catch (_) {}

    const { data: found } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('student_id', targetStudentId)
      .single()

    if (!found) {
      showToast(`Student not found: ${targetStudentId}`, 'error')
      return
    }

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

  const handleManualOverride = useCallback((studentId, status) => {
    return markAttendance(studentId, status, 'manual')
  }, [markAttendance])

  return (
    <div className="min-h-screen bg-[#ffffff] text-[#1a1a1a] font-['Gambarino',system-ui,sans-serif] selection:bg-[#ee6a2a]/20">
      <Navbar />

      {/* Header Banner */}
      <div className="bg-[#f5f5f5] border-b border-[rgba(0,0,0,0.06)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <button
            onClick={() => navigate(`/teacher/class/${classId}`)}
            className="inline-flex items-center gap-2 text-xs font-semibold text-[#ee6a2a] hover:underline mb-4 transition-colors"
          >
            <ArrowLeft size={15} /> Back to Course
          </button>

          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <CalendarDays size={14} className="text-[#ee6a2a]" />
                <span className="text-[#7a7a7a] text-xs font-bold uppercase tracking-wider">
                  {format(new Date(), 'EEEE, MMMM d, yyyy')}
                </span>
              </div>
              <h1 className="font-['Source_Serif_4',Georgia,serif] text-3xl font-bold text-[#1a1a1a]">
                Take Attendance
              </h1>
              {classInfo && (
                <p className="text-[#7a7a7a] text-xs mt-1">{classInfo.name} {classInfo.room ? `· ${classInfo.room}` : ''}</p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2.5 self-start">
              <button
                onClick={handleExportSessionExcel}
                className="btn-secondary btn-sm flex items-center gap-1.5"
                title="Download formatted Excel workbook for this session"
              >
                <FileSpreadsheet size={14} className="text-[#15803D]" /> Export Excel
              </button>
              <button
                onClick={() => setShowReportModal(true)}
                className="btn-secondary btn-sm flex items-center gap-1.5"
                title="Generate Full Attendance Report"
              >
                <FileSpreadsheet size={14} className="text-[#ee6a2a]" /> Full Report
              </button>
              <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#DCFCE7] text-[#15803D] border border-[#86EFAC] text-xs font-bold">
                <span className="w-2 h-2 rounded-full bg-[#15803D] animate-pulse" />
                <span>Session Active</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* ── LEFT PANEL: Mode selector + Active tool ── */}
          <div className="lg:col-span-2 flex flex-col gap-4">

            {/* Mode Switcher */}
            <div className="bg-[#ebebeb] p-2 rounded-[24px] flex gap-2 border border-[rgba(0,0,0,0.06)] shadow-sm">
              <ModeTab
                id="mode-kiosk"
                icon={Tv2}
                label="Kiosk Mode"
                description="Project QR for student scan"
                active={mode === 'kiosk'}
                onClick={() => setMode('kiosk')}
              />
              <ModeTab
                id="mode-idcard"
                icon={ScanLine}
                label="ID Scanner"
                description="Scan student QR cards"
                active={mode === 'idcard'}
                onClick={() => setMode('idcard')}
              />
            </div>

            {/* Mode Tip */}
            <div className="flex items-start gap-2.5 bg-[#f5f5f5] border border-[rgba(0,0,0,0.06)] rounded-[16px] px-4 py-3">
              <Zap size={15} className="text-[#ee6a2a] shrink-0 mt-0.5" />
              <p className="text-[#7a7a7a] text-xs leading-relaxed">
                {mode === 'kiosk'
                  ? 'Project the dynamic QR on a screen. Students scan it using their QSAMS app to mark themselves present.'
                  : 'Use your camera to scan student ID cards as they enter the classroom.'}
              </p>
            </div>

            {/* Active Tool Panel */}
            <div className="bg-[#ebebeb] border border-[rgba(0,0,0,0.06)] rounded-[24px] p-6 shadow-sm animate-fade-in">
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

          {/* ── RIGHT PANEL: Roster Table ── */}
          <div className="lg:col-span-3 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-[#ee6a2a]" />
                <h2 className="font-['Source_Serif_4',Georgia,serif] font-bold text-lg text-[#1a1a1a]">
                  Student Roster
                </h2>
              </div>
              <span className="text-xs font-semibold text-[#7a7a7a]">
                {roster.filter(s => s.status === 'present' || s.status === 'late').length} of {roster.length} Checked In
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

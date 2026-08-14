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

// ── Mode Toggle Button (NDMC Forest Green Style) ───────────────────────────
function ModeTab({ id, icon: Icon, label, description, active, onClick }) {
  return (
    <button
      id={id}
      onClick={onClick}
      className={`flex-1 flex flex-col items-center gap-1.5 p-4 rounded-[20px] border transition-all ${
        active
          ? 'bg-[#ffffff] border-[#005a36] shadow-sm text-[#005a36]'
          : 'bg-[#f8fafc] border-transparent text-[#64748b] hover:text-[#0f172a]'
      }`}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
        active ? 'bg-[#e6f2ec] text-[#005a36]' : 'bg-[#ffffff] text-[#64748b]'
      }`}>
        <Icon size={20} />
      </div>
      <div className="text-center">
        <p className={`font-semibold text-sm ${active ? 'text-[#005a36]' : 'text-[#64748b]'}`}>{label}</p>
        <p className="text-[#64748b] text-xs mt-0.5 hidden sm:block">{description}</p>
      </div>
    </button>
  )
}

// ── Toast Notification ─────────────────────────────────────────────────────
function Toast({ message, type, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3500)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-[20px] shadow-2xl text-sm font-semibold animate-fade-in ${
      type === 'success'
        ? 'bg-[#dcfce7] border border-[#86efac] text-[#15803d]'
        : 'bg-[#fee2e2] border border-[#fca5a5] text-[#b91c1c]'
    }`}>
      {type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
      {message}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// MAIN: AttendancePage — Dual-Method Attendance (NDMC Style)
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
    <div className="min-h-screen bg-[#f4f6f8] text-[#0f172a] font-['Gambarino',system-ui,sans-serif] selection:bg-[#005a36]/20">
      <Navbar />

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Back Link */}
        <button
          onClick={() => navigate(`/teacher/class/${classId}`)}
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#005a36] hover:underline mb-4 transition-colors"
        >
          <ArrowLeft size={15} /> Back to Course
        </button>

        {/* Institutional Forest Green Banner (Matches Assessment Photo) */}
        <div className="ndmc-banner mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <span className="text-[11px] font-mono tracking-wider opacity-90 block mb-1">
                {format(new Date(), 'EEEE, MMMM d, yyyy')} • Live Session Monitor
              </span>
              <h1 className="font-['Source_Serif_4',Georgia,serif] text-2xl sm:text-3xl font-bold tracking-tight text-white">
                Take Attendance
              </h1>
              {classInfo && (
                <p className="text-xs opacity-90 mt-1">{classInfo.name} {classInfo.room ? `• ${classInfo.room}` : ''}</p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2.5 self-start">
              <button
                onClick={handleExportSessionExcel}
                className="bg-white text-[#005a36] hover:bg-[#f1f5f9] font-bold text-xs py-2.5 px-4 rounded-[12px] shadow-sm transition-all flex items-center gap-1.5"
                title="Download formatted Excel workbook for this session"
              >
                <FileSpreadsheet size={14} className="text-[#15803d]" /> Export Excel
              </button>
              <button
                onClick={() => setShowReportModal(true)}
                className="bg-white text-[#005a36] hover:bg-[#f1f5f9] font-bold text-xs py-2.5 px-4 rounded-[12px] shadow-sm transition-all flex items-center gap-1.5"
                title="Generate Full Attendance Report"
              >
                <FileSpreadsheet size={14} /> Full Report
              </button>
              <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#dcfce7] text-[#15803d] border border-[#86efac] text-xs font-bold shadow-sm">
                <span className="w-2 h-2 rounded-full bg-[#15803d] animate-pulse" />
                <span>Session Active</span>
              </div>
            </div>
          </div>
        </div>

        {/* Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* ── LEFT PANEL: Mode selector + Active tool ── */}
          <div className="lg:col-span-2 flex flex-col gap-4">

            {/* Mode Switcher */}
            <div className="bg-[#ffffff] p-2 rounded-[24px] flex gap-2 border border-[#e2e8f0] shadow-sm">
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
            <div className="flex items-start gap-2.5 bg-[#ffffff] border border-[#e2e8f0] rounded-[16px] px-4 py-3 shadow-sm">
              <Zap size={15} className="text-[#005a36] shrink-0 mt-0.5" />
              <p className="text-[#64748b] text-xs leading-relaxed">
                {mode === 'kiosk'
                  ? 'Project the dynamic QR on a screen. Students scan it using their QSAMS app to mark themselves present.'
                  : 'Use your camera to scan student ID cards as they enter the classroom.'}
              </p>
            </div>

            {/* Active Tool Panel */}
            <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-[24px] p-6 shadow-sm animate-fade-in">
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
                <Users size={16} className="text-[#005a36]" />
                <h2 className="font-['Source_Serif_4',Georgia,serif] font-bold text-lg text-[#0f172a]">
                  Student Roster
                </h2>
              </div>
              <span className="text-xs font-semibold text-[#64748b]">
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

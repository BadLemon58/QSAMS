import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import Navbar from '../../components/common/Navbar'
import Spinner from '../../components/common/Spinner'
import Badge from '../../components/common/Badge'
import { QRCodeSVG } from 'qrcode.react'
import {
  ArrowLeft, ClipboardList, Users, UserPlus,
  CalendarDays, ChevronRight, Clock, MapPin,
  X, AlertCircle, Search, QrCode, Copy, Check, Sparkles,
  Trash2, BarChart2, FileSpreadsheet, AlertTriangle, User
} from 'lucide-react'
import StudentSummaryModal from '../../components/teacher/StudentSummaryModal'
import AttendanceReportModal from '../../components/teacher/AttendanceReportModal'
import { format, parseISO } from 'date-fns'

// ── Join Code & QR Modal (Chalk Register Style) ───────────────────────────
function JoinCodeModal({ classInfo, onClose }) {
  const [copied, setCopied] = useState(false)
  const joinCode = classInfo?.join_code || classInfo?.id?.slice(0, 6).toUpperCase() || 'QSAMS1'

  const qrValue = JSON.stringify({
    type: 'class_enrollment',
    classId: classInfo.id,
    joinCode: joinCode,
    className: classInfo.name
  })

  const copyCode = () => {
    navigator.clipboard.writeText(joinCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in font-['Gambarino',system-ui,sans-serif]">
      <div className="bg-[#ffffff] text-[#1a1a1a] w-full max-w-md p-7 text-center rounded-[24px] shadow-2xl border border-[rgba(0,0,0,0.06)] relative">
        <button
          onClick={onClose}
          className="absolute right-5 top-5 w-8 h-8 rounded-full bg-[#ebebeb] flex items-center justify-center text-[#7a7a7a] hover:text-[#1a1a1a] transition-colors"
        >
          <X size={16} />
        </button>

        <div className="inline-flex items-center gap-1.5 bg-[#f5f5f5] border border-[rgba(0,0,0,0.06)] rounded-full px-3.5 py-1 text-[#ee6a2a] text-xs font-bold uppercase tracking-wider mb-3">
          <Sparkles size={13} /> Class Enrollment Code
        </div>

        <h2 className="font-['Source_Serif_4',Georgia,serif] text-2xl font-bold text-[#1a1a1a] mb-1">
          {classInfo.name}
        </h2>
        <p className="text-[#7a7a7a] text-xs mb-6">Students scan this QR or type the code to enroll instantly</p>

        {/* Join Code Box */}
        <div className="bg-[#f5f5f5] border border-[#DDD9D3] rounded-[20px] p-4 mb-6 flex items-center justify-between">
          <div className="text-left pl-2">
            <p className="text-[#7a7a7a] text-[10px] uppercase font-bold tracking-widest">6-Digit Join Code</p>
            <p className="text-2xl font-mono font-extrabold text-[#ee6a2a] tracking-wider mt-0.5">{joinCode}</p>
          </div>
          <button
            onClick={copyCode}
            className="btn-secondary btn-sm flex items-center gap-1.5"
          >
            {copied ? <Check size={14} className="text-[#15803D]" /> : <Copy size={14} />}
            {copied ? 'Copied!' : 'Copy Code'}
          </button>
        </div>

        {/* QR Code */}
        <div className="relative p-5 bg-[#ebebeb] rounded-[20px] inline-block mx-auto mb-4 shadow-sm">
          <QRCodeSVG value={qrValue} size={190} level="H" includeMargin={false} fgColor="#1a1a1a" />
        </div>

        <p className="text-[#7a7a7a] text-xs">
          Students can use <span className="text-[#1a1a1a] font-bold">"Scan QR"</span> or <span className="text-[#1a1a1a] font-bold">"Join Class"</span> on their QSAMS mobile app
        </p>
      </div>
    </div>
  )
}

// ── Enroll Students Modal (Chalk Register Style) ──────────────────────────
function EnrollModal({ classId, onClose, onEnrolled }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [enrolling, setEnrolling] = useState(null)
  const [error, setError] = useState('')

  const search = async (q) => {
    if (!q.trim()) { setResults([]); return }
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, student_id')
      .eq('role', 'student')
      .or(`full_name.ilike.%${q}%,student_id.ilike.%${q}%`)
      .limit(10)
    setResults(data || [])
    setLoading(false)
  }

  useEffect(() => {
    const t = setTimeout(() => search(query), 300)
    return () => clearTimeout(t)
  }, [query])

  const enroll = async (student) => {
    setEnrolling(student.id)
    setError('')
    const { error: err } = await supabase
      .from('enrollments')
      .insert({ class_id: classId, student_id: student.id })

    if (err) {
      setError(err.code === '23505' ? `${student.full_name} is already enrolled.` : err.message)
    } else {
      onEnrolled(student)
    }
    setEnrolling(null)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in font-['Gambarino',system-ui,sans-serif]">
      <div className="bg-[#ffffff] text-[#1a1a1a] w-full max-w-md p-6 rounded-[24px] shadow-2xl border border-[rgba(0,0,0,0.06)]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-['Source_Serif_4',Georgia,serif] text-xl font-bold text-[#1a1a1a]">
            Enroll Student Manually
          </h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-[#ebebeb] flex items-center justify-center text-[#7a7a7a] hover:text-[#1a1a1a]">
            <X size={16} />
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-[#FEE2E2] text-[#B91C1C] border border-[#FCA5A5] rounded-[16px] px-3.5 py-2.5 mb-3 text-xs font-semibold">
            <AlertCircle size={14} /> {error}
          </div>
        )}

        <div className="relative mb-3">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7a7a7a]" />
          <input
            type="text"
            className="input-field pl-10"
            placeholder="Search students by name or ID..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoFocus
          />
        </div>

        <div className="space-y-2 max-h-64 overflow-y-auto">
          {loading && <div className="flex justify-center py-4"><Spinner /></div>}
          {!loading && results.length === 0 && query && (
            <p className="text-[#7a7a7a] text-xs text-center py-4">No students found matching your search</p>
          )}
          {results.map(s => (
            <div key={s.id} className="flex items-center justify-between bg-[#f5f5f5] rounded-[16px] px-3.5 py-2.5 border border-[rgba(0,0,0,0.06)]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#f7b500] text-[#000000] flex items-center justify-center text-xs font-bold">
                  {s.full_name?.[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#1a1a1a]">{s.full_name}</p>
                  <p className="text-xs text-[#7a7a7a] font-mono">{s.student_id || 'No ID'}</p>
                </div>
              </div>
              <button
                onClick={() => enroll(s)}
                disabled={enrolling === s.id}
                className="btn-primary btn-sm"
              >
                {enrolling === s.id ? <Spinner size="sm" /> : <UserPlus size={13} />}
                {enrolling === s.id ? '' : 'Add'}
              </button>
            </div>
          ))}
        </div>
        <button onClick={onClose} className="btn-secondary w-full justify-center mt-4">Done</button>
      </div>
    </div>
  )
}

// ── Main Class Detail Page ────────────────────────────────────────────────
export default function ClassDetailPage() {
  const { classId } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuth()

  const [classInfo, setClassInfo] = useState(null)
  const [students, setStudents] = useState([])
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showEnroll, setShowEnroll] = useState(false)
  const [showJoinCode, setShowJoinCode] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [studentToRemove, setStudentToRemove] = useState(null)
  const [removing, setRemoving] = useState(false)

  useEffect(() => {
    const load = async () => {
      const [{ data: cls }, { data: enr }, { data: sess }] = await Promise.all([
        supabase.from('classes').select('*').eq('id', classId).single(),
        supabase.from('enrollments').select('profiles(id, full_name, student_id, avatar_url)').eq('class_id', classId),
        supabase.from('attendance_sessions').select('*').eq('class_id', classId).order('created_at', { ascending: false }).limit(10),
      ])

      if (cls && !cls.join_code) {
        const generatedCode = cls.id.slice(0, 6).toUpperCase()
        await supabase.from('classes').update({ join_code: generatedCode }).eq('id', classId)
        cls.join_code = generatedCode
      }

      setClassInfo(cls)
      setStudents((enr || []).map(e => e.profiles).filter(Boolean))
      setSessions(sess || [])
      setLoading(false)
    }
    load()
  }, [classId])

  // Real-time enrollments refresh
  useEffect(() => {
    const channel = supabase
      .channel(`enrollments:${classId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public',
        table: 'enrollments',
        filter: `class_id=eq.${classId}`
      }, async () => {
        const { data: enr } = await supabase
          .from('enrollments')
          .select('profiles(id, full_name, student_id, avatar_url)')
          .eq('class_id', classId)
        setStudents((enr || []).map(e => e.profiles).filter(Boolean))
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [classId])

  // Remove student
  const handleRemoveStudent = async () => {
    if (!studentToRemove) return
    setRemoving(true)
    const { error } = await supabase
      .from('enrollments')
      .delete()
      .eq('class_id', classId)
      .eq('student_id', studentToRemove.id)

    if (!error) {
      setStudents(prev => prev.filter(s => s.id !== studentToRemove.id))
      setStudentToRemove(null)
    }
    setRemoving(false)
  }

  if (loading) return (
    <div className="min-h-screen bg-[#ffffff] flex items-center justify-center"><Spinner size="xl" /></div>
  )

  return (
    <div className="min-h-screen bg-[#ffffff] text-[#1a1a1a] font-['Gambarino',system-ui,sans-serif] selection:bg-[#ee6a2a]/20">
      <Navbar />

      {/* Class Header Banner */}
      <div className="bg-[#f5f5f5] border-b border-[rgba(0,0,0,0.06)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <button
            onClick={() => navigate('/teacher')}
            className="inline-flex items-center gap-2 text-xs font-semibold text-[#ee6a2a] hover:underline mb-4 transition-colors"
          >
            <ArrowLeft size={15} /> Back to Dashboard
          </button>

          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <span className="text-xs uppercase font-bold tracking-wider text-[#7a7a7a]">Course Section</span>
              <h1 className="font-['Source_Serif_4',Georgia,serif] text-3xl font-bold text-[#1a1a1a] mt-0.5 mb-2">
                {classInfo?.name}
              </h1>
              {classInfo?.description && (
                <p className="text-[#7a7a7a] text-xs mb-3 max-w-xl leading-relaxed">{classInfo.description}</p>
              )}
              <div className="flex flex-wrap gap-2.5 text-xs text-[#7a7a7a]">
                {classInfo?.schedule && (
                  <span className="flex items-center gap-1.5 bg-[#ffffff] px-3 py-1 rounded-full border border-[rgba(0,0,0,0.06)]">
                    <Clock size={12} className="text-[#ee6a2a]" /> {classInfo.schedule}
                  </span>
                )}
                {classInfo?.room && (
                  <span className="flex items-center gap-1.5 bg-[#ffffff] px-3 py-1 rounded-full border border-[rgba(0,0,0,0.06)]">
                    <MapPin size={12} className="text-[#ee6a2a]" /> {classInfo.room}
                  </span>
                )}
                <span className="flex items-center gap-1.5 bg-[#ffffff] px-3 py-1 rounded-full border border-[rgba(0,0,0,0.06)]">
                  <Users size={12} className="text-[#ee6a2a]" /> {students.length} students enrolled
                </span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-2.5 self-start md:self-auto">
              <button
                onClick={() => setShowJoinCode(true)}
                className="btn-secondary btn-sm flex items-center gap-1.5"
              >
                <QrCode size={14} className="text-[#ee6a2a]" /> Join Code & QR
              </button>
              <button
                onClick={() => setShowReport(true)}
                className="btn-secondary btn-sm flex items-center gap-1.5"
              >
                <FileSpreadsheet size={14} className="text-[#15803D]" /> Attendance Report
              </button>
              <button
                onClick={() => setShowEnroll(true)}
                className="btn-secondary btn-sm flex items-center gap-1.5"
              >
                <UserPlus size={14} /> Enroll Student
              </button>
              <Link
                to={`/teacher/class/${classId}/attendance`}
                className="btn-primary btn-sm flex items-center gap-1.5"
              >
                <ClipboardList size={14} /> Take Attendance
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Enrolled Students Roster */}
          <div className="lg:col-span-2 bg-[#ebebeb] border border-[rgba(0,0,0,0.06)] rounded-[24px] overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-[rgba(0,0,0,0.06)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-[#ee6a2a]" />
                <h2 className="font-['Source_Serif_4',Georgia,serif] font-bold text-lg text-[#1a1a1a]">
                  Enrolled Students
                </h2>
              </div>
              <span className="text-xs font-semibold text-[#7a7a7a]">{students.length} Total</span>
            </div>

            {students.length === 0 ? (
              <div className="p-12 text-center text-[#7a7a7a]">
                <p className="text-xs mb-4">No students enrolled in this section yet.</p>
                <div className="flex justify-center gap-3">
                  <button onClick={() => setShowJoinCode(true)} className="btn-secondary btn-sm">
                    <QrCode size={14} /> Show Join QR
                  </button>
                  <button onClick={() => setShowEnroll(true)} className="btn-primary btn-sm">
                    <UserPlus size={14} /> Enroll Student
                  </button>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-[rgba(0,0,0,0.06)]">
                {students.map((s, i) => (
                  <div key={s.id} className="flex items-center gap-3 px-6 py-3.5 hover:bg-[#e2e2e2]/60 transition-colors group">
                    <span className="text-[#7a7a7a] text-xs font-mono w-5 text-right">{i + 1}</span>
                    <div className="w-8 h-8 rounded-full bg-[#f7b500] text-[#000000] flex items-center justify-center text-xs font-bold overflow-hidden shrink-0">
                      {s.avatar_url ? (
                        <img src={s.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        s.full_name?.[0]?.toUpperCase() || <User size={14} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#1a1a1a] truncate">{s.full_name}</p>
                      <p className="text-xs text-[#7a7a7a] font-mono">{s.student_id || 'No Student ID'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedStudent(s)}
                        className="px-2.5 py-1 rounded-[12px] bg-[#ffffff] hover:bg-[#f5f5f5] text-[#1a1a1a] text-xs font-semibold flex items-center gap-1 border border-[rgba(0,0,0,0.06)] shadow-sm transition-colors"
                        title="View student attendance record"
                      >
                        <BarChart2 size={13} className="text-[#ee6a2a]" />
                        <span>Stats</span>
                      </button>
                      <button
                        onClick={() => setStudentToRemove(s)}
                        className="w-7 h-7 rounded-full bg-[#ffffff] hover:bg-[#FEE2E2] text-[#7a7a7a] hover:text-[#B91C1C] flex items-center justify-center border border-[rgba(0,0,0,0.06)] transition-colors"
                        title="Remove student from class"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Attendance Sessions */}
          <div className="bg-[#ebebeb] border border-[rgba(0,0,0,0.06)] rounded-[24px] overflow-hidden shadow-sm h-fit">
            <div className="px-6 py-4 border-b border-[rgba(0,0,0,0.06)] flex items-center gap-2">
              <CalendarDays size={16} className="text-[#ee6a2a]" />
              <h2 className="font-['Source_Serif_4',Georgia,serif] font-bold text-lg text-[#1a1a1a]">
                Recent Sessions
              </h2>
            </div>

            {sessions.length === 0 ? (
              <div className="p-8 text-center text-[#7a7a7a] text-xs">
                No attendance sessions recorded yet.
              </div>
            ) : (
              <div className="divide-y divide-[rgba(0,0,0,0.06)]">
                {sessions.map(s => (
                  <div key={s.id} className="px-6 py-3.5 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-[#1a1a1a]">
                        {format(parseISO(s.date), 'MMM d, yyyy')}
                      </p>
                      <p className="text-xs text-[#7a7a7a] mt-0.5">
                        {format(parseISO(s.created_at), 'h:mm a')}
                      </p>
                    </div>
                    <Badge status={s.is_active ? 'present' : 'absent'} label={s.is_active ? 'Active' : 'Closed'} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showEnroll && (
        <EnrollModal
          classId={classId}
          onClose={() => setShowEnroll(false)}
          onEnrolled={s => setStudents(prev => [...prev, s])}
        />
      )}

      {showJoinCode && (
        <JoinCodeModal
          classInfo={classInfo}
          onClose={() => setShowJoinCode(false)}
        />
      )}

      {showReport && (
        <AttendanceReportModal
          classId={classId}
          classInfo={classInfo}
          teacherName={profile?.full_name}
          onClose={() => setShowReport(false)}
        />
      )}

      {selectedStudent && (
        <StudentSummaryModal
          student={selectedStudent}
          classId={classId}
          className={classInfo?.name}
          onClose={() => setSelectedStudent(null)}
        />
      )}

      {/* Delete Student Confirmation Modal */}
      {studentToRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in font-['Gambarino',system-ui,sans-serif]">
          <div className="bg-[#ffffff] text-[#1a1a1a] w-full max-w-sm p-6 rounded-[24px] shadow-2xl border border-[rgba(0,0,0,0.06)] text-center">
            <div className="w-12 h-12 rounded-full bg-[#FEE2E2] text-[#B91C1C] flex items-center justify-center mx-auto mb-3">
              <AlertTriangle size={24} />
            </div>
            <h3 className="font-['Source_Serif_4',Georgia,serif] text-xl font-bold text-[#1a1a1a] mb-1">
              Remove Student?
            </h3>
            <p className="text-[#7a7a7a] text-xs mb-5">
              Are you sure you want to remove <span className="text-[#1a1a1a] font-bold">{studentToRemove.full_name}</span> from this class?
            </p>
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setStudentToRemove(null)}
                className="btn-secondary flex-1 justify-center py-3"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRemoveStudent}
                disabled={removing}
                className="btn-danger flex-1 justify-center py-3"
              >
                {removing ? <Spinner size="sm" /> : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

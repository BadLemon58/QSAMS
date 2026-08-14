import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import Navbar from '../../components/common/Navbar'
import Spinner from '../../components/common/Spinner'
import AttendanceReportModal from '../../components/teacher/AttendanceReportModal'
import StudentSummaryModal from '../../components/teacher/StudentSummaryModal'
import {
  Users, QrCode, ArrowLeft, Plus, Clock, MapPin,
  ClipboardList, Copy, Check, X, AlertCircle, Trash2,
  BarChart2, FileSpreadsheet, UserPlus, AlertTriangle, User, CalendarDays
} from 'lucide-react'
import { format } from 'date-fns'

// ── Join Code Modal (NDMC Forest Green Style) ───────────────────────────────
function JoinCodeModal({ joinCode, className, onClose }) {
  const [copied, setCopied] = useState(false)
  const qrData = JSON.stringify({ type: 'join_class', joinCode, className })

  const handleCopy = () => {
    navigator.clipboard.writeText(joinCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in font-['Gambarino',system-ui,sans-serif]">
      <div className="bg-[#ffffff] text-[#0f172a] w-full max-w-sm p-7 rounded-[24px] shadow-2xl border border-[#e2e8f0] relative text-center">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 w-8 h-8 rounded-full bg-[#f1f5f9] flex items-center justify-center text-[#64748b] hover:text-[#0f172a] transition-colors"
        >
          <X size={16} />
        </button>

        <div className="inline-flex items-center gap-1.5 bg-[#e6f2ec] border border-[#005a36]/20 rounded-full px-3.5 py-1 text-[#005a36] text-xs font-bold uppercase tracking-wider mb-3">
          <QrCode size={13} />
          <span>Student Enrollment</span>
        </div>

        <h2 className="font-['Source_Serif_4',Georgia,serif] text-xl font-bold text-[#0f172a] mb-1">{className}</h2>
        <p className="text-[#64748b] text-xs mb-5">Students scan or enter this code in their QSAMS app to enroll</p>

        <div className="flex justify-center mb-5">
          <div className="p-4 bg-[#f8fafc] rounded-[20px] border border-[#e2e8f0] shadow-sm">
            <QRCodeSVG value={qrData} size={190} level="H" includeMargin={false} fgColor="#005a36" />
          </div>
        </div>

        <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-[16px] p-3.5 mb-5">
          <span className="text-[10px] uppercase font-bold tracking-widest text-[#64748b]">Class Join Code</span>
          <p className="text-2xl font-mono font-extrabold text-[#005a36] tracking-wider mt-0.5">{joinCode}</p>
        </div>

        <button onClick={handleCopy} className="btn-primary w-full justify-center">
          {copied ? <><Check size={16} /> Copied to Clipboard!</> : <><Copy size={16} /> Copy Code</>}
        </button>
      </div>
    </div>
  )
}

// ── Manual Add Student Modal (NDMC Forest Green Style) ─────────────────────
function ManualEnrollModal({ classId, existingStudentIds, onClose, onEnrolled }) {
  const [students, setStudents] = useState([])
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    const fetchAvailableStudents = async () => {
      setLoading(true)
      const { data, error: err } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'student')
        .order('full_name', { ascending: true })

      if (err) setError(err.message)
      else setStudents(data || [])
      setLoading(false)
    }
    fetchAvailableStudents()
  }, [])

  const availableStudents = students.filter(
    s => !existingStudentIds.includes(s.id) &&
    (s.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
     s.student_id?.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const handleEnroll = async (e) => {
    e.preventDefault()
    if (!selectedStudentId) return
    setSubmitting(true)
    setError('')

    const { error: err } = await supabase
      .from('enrollments')
      .insert({ class_id: classId, student_id: selectedStudentId })

    if (err) {
      setError(err.message)
      setSubmitting(false)
      return
    }

    const newlyEnrolled = students.find(s => s.id === selectedStudentId)
    onEnrolled(newlyEnrolled)
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
          <span className="text-xs uppercase font-bold tracking-wider text-[#005a36]">Student Roster</span>
          <h2 className="font-['Source_Serif_4',Georgia,serif] text-2xl font-bold text-[#0f172a] mt-0.5">
            Add Student to Class
          </h2>
          <p className="text-[#64748b] text-xs mt-1">Select a registered student to add directly to this class roster</p>
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-[#fee2e2] text-[#b91c1c] border border-[#fca5a5] rounded-[16px] px-4 py-3 mb-4 text-xs font-semibold">
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleEnroll} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#64748b] mb-1.5">
              Filter Student Name or ID
            </label>
            <input
              type="text"
              className="input-field mb-2"
              placeholder="Search by name or student ID..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#64748b] mb-1.5">
              Select Student *
            </label>
            {loading ? (
              <div className="py-6 text-center text-xs text-[#64748b]"><Spinner size="sm" /></div>
            ) : availableStudents.length === 0 ? (
              <p className="text-xs text-[#64748b] italic p-3 bg-[#f8fafc] rounded-[16px]">
                No available students matching search.
              </p>
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                {availableStudents.map(st => (
                  <label
                    key={st.id}
                    className={`flex items-center justify-between p-3 rounded-[14px] border cursor-pointer transition-all ${
                      selectedStudentId === st.id
                        ? 'bg-[#e6f2ec] border-[#005a36] text-[#005a36]'
                        : 'bg-[#f8fafc] border-[#e2e8f0] text-[#0f172a] hover:bg-[#f1f5f9]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="radio"
                        name="student"
                        value={st.id}
                        checked={selectedStudentId === st.id}
                        onChange={() => setSelectedStudentId(st.id)}
                        className="accent-[#005a36]"
                      />
                      <span className="font-semibold text-sm">{st.full_name}</span>
                    </div>
                    <span className="text-xs font-mono text-[#64748b]">{st.student_id || 'No ID'}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2.5 pt-3">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center py-3">
              Cancel
            </button>
            <button type="submit" disabled={submitting || !selectedStudentId} className="btn-primary flex-1 justify-center py-3">
              {submitting ? <Spinner size="sm" /> : 'Add to Roster'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Delete Confirmation Modal ──────────────────────────────────────────────
function DeleteStudentModal({ student, onConfirm, onCancel, deleting }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in font-['Gambarino',system-ui,sans-serif]">
      <div className="bg-[#ffffff] text-[#0f172a] w-full max-w-sm p-6 rounded-[24px] shadow-2xl border border-[#e2e8f0] text-center">
        <div className="w-12 h-12 rounded-full bg-[#fee2e2] text-[#b91c1c] flex items-center justify-center mx-auto mb-3">
          <AlertTriangle size={24} />
        </div>
        <h3 className="font-['Source_Serif_4',Georgia,serif] text-xl font-bold text-[#0f172a] mb-1">Remove Student?</h3>
        <p className="text-[#64748b] text-xs mb-5">
          Are you sure you want to remove <strong className="text-[#0f172a]">{student?.full_name}</strong> from this class roster?
        </p>
        <div className="flex gap-2.5">
          <button onClick={onCancel} disabled={deleting} className="btn-secondary flex-1 justify-center py-3">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={deleting} className="btn-danger flex-1 justify-center py-3">
            {deleting ? <Spinner size="sm" /> : 'Remove'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Class Detail Page (NDMC Forest Green Style) ───────────────────────
export default function ClassDetailPage() {
  const { classId } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuth()

  const [classInfo, setClassInfo] = useState(null)
  const [students, setStudents] = useState([])
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)

  // Modals
  const [showJoinCode, setShowJoinCode] = useState(false)
  const [showEnroll, setShowEnroll] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [selectedStudentForSummary, setSelectedStudentForSummary] = useState(null)
  const [studentToDelete, setStudentToDelete] = useState(null)
  const [removing, setRemoving] = useState(false)

  const loadData = async () => {
    try {
      const { data: cls } = await supabase
        .from('classes')
        .select('*')
        .eq('id', classId)
        .single()
      setClassInfo(cls)

      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('student_id, profiles(id, full_name, student_id, avatar_url)')
        .eq('class_id', classId)
      setStudents((enrollments || []).map(e => e.profiles).filter(Boolean))

      const { data: sess } = await supabase
        .from('attendance_sessions')
        .select('*')
        .eq('class_id', classId)
        .order('date', { ascending: false })
      setSessions(sess || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [classId])

  const handleRemoveStudent = async () => {
    if (!studentToDelete) return
    setRemoving(true)
    const { error } = await supabase
      .from('enrollments')
      .delete()
      .eq('class_id', classId)
      .eq('student_id', studentToDelete.id)

    if (!error) {
      setStudents(prev => prev.filter(s => s.id !== studentToDelete.id))
      setStudentToDelete(null)
    }
    setRemoving(false)
  }

  if (loading) return (
    <div className="min-h-screen bg-[#f4f6f8] flex items-center justify-center"><Spinner size="xl" /></div>
  )

  return (
    <div className="min-h-screen bg-[#f4f6f8] text-[#0f172a] font-['Gambarino',system-ui,sans-serif] selection:bg-[#005a36]/20">
      <Navbar />

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Back Link */}
        <button
          onClick={() => navigate('/teacher')}
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#005a36] hover:underline mb-4 transition-colors"
        >
          <ArrowLeft size={15} /> Back to Dashboard
        </button>

        {/* Institutional Forest Green Banner (Matches Assessment Photo Exactly) */}
        <div className="ndmc-banner mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <span className="text-[11px] font-mono tracking-wider opacity-90 block mb-1">
                {classInfo?.schedule || 'Academic Schedule'} • Section Details
              </span>
              <h1 className="font-['Source_Serif_4',Georgia,serif] text-2xl sm:text-3xl font-bold tracking-tight text-white">
                {classInfo?.name}
              </h1>
              {classInfo?.description && (
                <p className="text-xs opacity-90 mt-1 max-w-2xl leading-relaxed">{classInfo.description}</p>
              )}
              <div className="flex flex-wrap gap-2.5 text-xs mt-3">
                {classInfo?.room && (
                  <span className="flex items-center gap-1.5 bg-white/15 px-3 py-1 rounded-full text-white backdrop-blur-sm">
                    <MapPin size={12} /> Room: {classInfo.room}
                  </span>
                )}
                <span className="flex items-center gap-1.5 bg-white/15 px-3 py-1 rounded-full text-white backdrop-blur-sm">
                  <Users size={12} /> {students.length} Enrolled Students
                </span>
                <span className="flex items-center gap-1.5 bg-white/15 px-3 py-1 rounded-full text-white backdrop-blur-sm font-mono font-bold">
                  Join Code: {classInfo?.join_code || classInfo?.id?.substring(0, 6).toUpperCase()}
                </span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-2.5 self-start md:self-auto">
              <button
                onClick={() => setShowJoinCode(true)}
                className="bg-white text-[#005a36] hover:bg-[#f1f5f9] font-bold text-xs py-2.5 px-4 rounded-[12px] shadow-sm transition-all flex items-center gap-1.5"
              >
                <QrCode size={14} /> Join QR
              </button>
              <button
                onClick={() => setShowReport(true)}
                className="bg-white text-[#005a36] hover:bg-[#f1f5f9] font-bold text-xs py-2.5 px-4 rounded-[12px] shadow-sm transition-all flex items-center gap-1.5"
              >
                <FileSpreadsheet size={14} /> Attendance Report
              </button>
              <button
                onClick={() => setShowEnroll(true)}
                className="bg-white text-[#005a36] hover:bg-[#f1f5f9] font-bold text-xs py-2.5 px-4 rounded-[12px] shadow-sm transition-all flex items-center gap-1.5"
              >
                <UserPlus size={14} /> Add Student
              </button>
              <Link
                to={`/teacher/class/${classId}/attendance`}
                className="bg-[#d97706] hover:bg-[#b45309] text-white font-bold text-xs py-2.5 px-4 rounded-[12px] shadow-sm transition-all flex items-center gap-1.5"
              >
                <ClipboardList size={14} /> Take Attendance
              </Link>
            </div>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Enrolled Students Roster */}
          <div className="lg:col-span-2 bg-[#ffffff] border border-[#e2e8f0] rounded-[24px] overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-[#e2e8f0] flex items-center justify-between bg-[#f8fafc]">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-[#005a36]" />
                <h2 className="font-['Source_Serif_4',Georgia,serif] font-bold text-lg text-[#0f172a]">
                  Enrolled Students Roster
                </h2>
              </div>
              <span className="text-xs font-semibold text-[#64748b]">{students.length} Total</span>
            </div>

            {students.length === 0 ? (
              <div className="p-12 text-center text-[#64748b]">
                <p className="text-xs mb-4">No students enrolled in this section yet.</p>
                <div className="flex justify-center gap-3">
                  <button onClick={() => setShowJoinCode(true)} className="btn-secondary btn-sm">
                    <QrCode size={14} /> Show Join QR
                  </button>
                  <button onClick={() => setShowEnroll(true)} className="btn-primary btn-sm">
                    <UserPlus size={14} /> Add Student
                  </button>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-[#e2e8f0]">
                {students.map((student, idx) => (
                  <div
                    key={student.id}
                    className="px-6 py-3.5 flex items-center justify-between hover:bg-[#f8fafc] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-[#64748b] font-mono w-5">{idx + 1}</span>
                      <div className="w-8 h-8 rounded-full bg-[#005a36] text-[#ffffff] flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden">
                        {student.avatar_url ? (
                          <img src={student.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          student.full_name?.[0]?.toUpperCase() || <User size={12} />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-[#0f172a]">{student.full_name}</p>
                        <p className="text-xs text-[#64748b] font-mono">{student.student_id || 'No ID'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedStudentForSummary(student)}
                        className="px-3 py-1.5 rounded-[12px] bg-[#f1f5f9] text-[#005a36] hover:bg-[#e6f2ec] text-xs font-semibold flex items-center gap-1.5 transition-colors"
                        title="View Attendance History"
                      >
                        <BarChart2 size={13} />
                        <span className="hidden sm:inline">Stats</span>
                      </button>
                      <button
                        onClick={() => setStudentToDelete(student)}
                        className="p-1.5 rounded-[12px] bg-[#fee2e2] text-[#b91c1c] hover:bg-[#fecaca] transition-colors"
                        title="Remove student from class"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar: Recent Sessions */}
          <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-[24px] p-6 shadow-sm flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarDays size={16} className="text-[#005a36]" />
                <h3 className="font-['Source_Serif_4',Georgia,serif] font-bold text-base text-[#0f172a]">
                  Recorded Sessions
                </h3>
              </div>
              <span className="text-xs font-semibold text-[#64748b]">{sessions.length} Sessions</span>
            </div>

            {sessions.length === 0 ? (
              <div className="py-8 text-center text-[#64748b] text-xs">
                No attendance sessions recorded yet.
              </div>
            ) : (
              <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                {sessions.map(sess => (
                  <div
                    key={sess.id}
                    className="p-3.5 bg-[#f8fafc] rounded-[16px] border border-[#e2e8f0] flex items-center justify-between"
                  >
                    <div>
                      <p className="font-semibold text-xs text-[#0f172a]">
                        {format(new Date(sess.date), 'EEEE, MMM d, yyyy')}
                      </p>
                      <p className="text-[11px] text-[#64748b] mt-0.5">
                        {sess.is_active ? '● Live Session' : 'Recorded'}
                      </p>
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${sess.is_active ? 'bg-[#dcfce7] text-[#15803d]' : 'bg-[#f1f5f9] text-[#64748b]'}`}>
                      {sess.is_active ? 'Active' : 'Closed'}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <Link
              to={`/teacher/class/${classId}/attendance`}
              className="btn-primary w-full justify-center mt-2"
            >
              <ClipboardList size={15} /> Launch Attendance
            </Link>
          </div>

        </div>
      </div>

      {/* Modals */}
      {showJoinCode && (
        <JoinCodeModal
          joinCode={classInfo?.join_code || classInfo?.id?.substring(0, 6).toUpperCase()}
          className={classInfo?.name}
          onClose={() => setShowJoinCode(false)}
        />
      )}

      {showEnroll && (
        <ManualEnrollModal
          classId={classId}
          existingStudentIds={students.map(s => s.id)}
          onClose={() => setShowEnroll(false)}
          onEnrolled={(newStudent) => setStudents(prev => [...prev, newStudent])}
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

      {selectedStudentForSummary && (
        <StudentSummaryModal
          student={selectedStudentForSummary}
          classId={classId}
          className={classInfo?.name}
          onClose={() => setSelectedStudentForSummary(null)}
        />
      )}

      {studentToDelete && (
        <DeleteStudentModal
          student={studentToDelete}
          onConfirm={handleRemoveStudent}
          onCancel={() => setStudentToDelete(null)}
          deleting={removing}
        />
      )}
    </div>
  )
}

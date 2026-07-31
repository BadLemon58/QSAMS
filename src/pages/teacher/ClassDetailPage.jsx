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
  X, AlertCircle, Search, QrCode, Copy, Check, Sparkles
} from 'lucide-react'

// ── Join Code & QR Modal ───────────────────────────────────────────────────
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <div className="glass-card w-full max-w-md p-6 text-center animate-fade-in relative">
        <button onClick={onClose} className="absolute right-4 top-4 text-slate-500 hover:text-white transition-colors">
          <X size={20} />
        </button>

        <div className="inline-flex items-center gap-1.5 bg-indigo-500/10 border border-indigo-500/30 rounded-full px-3 py-1 text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-3">
          <Sparkles size={13} /> Class Enrollment Code
        </div>

        <h2 className="text-xl font-bold text-white mb-1">{classInfo.name}</h2>
        <p className="text-slate-400 text-xs mb-6">Students scan this QR or type the code to enroll instantly</p>

        {/* Big Code Box */}
        <div className="bg-slate-900/80 border border-indigo-500/30 rounded-2xl p-4 mb-6 flex items-center justify-between">
          <div className="text-left pl-2">
            <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest">6-Digit Join Code</p>
            <p className="text-2xl font-mono font-extrabold text-indigo-400 tracking-wider mt-0.5">{joinCode}</p>
          </div>
          <button
            onClick={copyCode}
            className="btn-secondary btn-sm flex items-center gap-1.5"
          >
            {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>

        {/* QR Code */}
        <div className="p-4 bg-white rounded-2xl shadow-2xl inline-block mx-auto mb-4">
          <QRCodeSVG value={qrValue} size={200} level="H" includeMargin={false} fgColor="#1e1b4b" />
        </div>

        <p className="text-slate-500 text-xs">
          Students can use <span className="text-slate-300 font-semibold">"Scan QR"</span> or <span className="text-slate-300 font-semibold">"Join Class"</span> on their QSAMS app
        </p>
      </div>
    </div>
  )
}

// ── Enroll Students Modal ──────────────────────────────────────────────────
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="glass-card w-full max-w-md p-6 animate-fade-in">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Enroll Students</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={20} /></button>
        </div>
        {error && (
          <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2.5 mb-3 text-amber-400 text-sm">
            <AlertCircle size={14} /> {error}
          </div>
        )}
        <div className="relative mb-3">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            className="input-field pl-9"
            placeholder="Search students by name or ID..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoFocus
          />
        </div>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {loading && <div className="flex justify-center py-4"><Spinner /></div>}
          {!loading && results.length === 0 && query && (
            <p className="text-slate-500 text-sm text-center py-4">No students found</p>
          )}
          {results.map(s => (
            <div key={s.id} className="flex items-center justify-between bg-slate-800/50 rounded-xl px-3 py-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-xs font-bold text-white">
                  {s.full_name?.[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-200">{s.full_name}</p>
                  <p className="text-xs text-slate-500 font-mono">{s.student_id || 'No ID'}</p>
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

// ── Main ─────────────────────────────────────────────────────────────────
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

  useEffect(() => {
    const load = async () => {
      const [{ data: cls }, { data: enr }, { data: sess }] = await Promise.all([
        supabase.from('classes').select('*').eq('id', classId).single(),
        supabase.from('enrollments').select('profiles(id, full_name, student_id)').eq('class_id', classId),
        supabase.from('attendance_sessions').select('*').eq('class_id', classId).order('created_at', { ascending: false }).limit(10),
      ])

      // If class doesn't have a join code yet, generate one and save it
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

  if (loading) return (
    <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center"><Spinner size="xl" /></div>
  )

  return (
    <div className="min-h-screen bg-[#0a0f1e]">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button onClick={() => navigate('/teacher')} className="flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-5 transition-colors">
          <ArrowLeft size={16} /> Back to Dashboard
        </button>

        {/* Class header */}
        <div className="glass-card p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">{classInfo?.name}</h1>
              {classInfo?.description && <p className="text-slate-400 text-sm mb-3">{classInfo.description}</p>}
              <div className="flex flex-wrap gap-3">
                {classInfo?.schedule && (
                  <span className="flex items-center gap-1.5 text-xs text-slate-500"><Clock size={12} />{classInfo.schedule}</span>
                )}
                {classInfo?.room && (
                  <span className="flex items-center gap-1.5 text-xs text-slate-500"><MapPin size={12} />{classInfo.room}</span>
                )}
                <span className="flex items-center gap-1.5 text-xs text-slate-500"><Users size={12} />{students.length} students</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setShowJoinCode(true)} className="btn-secondary btn-sm flex items-center gap-1.5">
                <QrCode size={14} className="text-indigo-400" /> Join Code & QR
              </button>
              <button onClick={() => setShowEnroll(true)} className="btn-secondary btn-sm">
                <UserPlus size={14} /> Enroll Student
              </button>
              <Link to={`/teacher/class/${classId}/attendance`} className="btn-primary btn-sm">
                <ClipboardList size={14} /> Take Attendance
              </Link>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Roster */}
          <div className="lg:col-span-2 glass-card overflow-hidden">
            <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
              <h2 className="font-semibold text-white flex items-center gap-2"><Users size={16} className="text-indigo-400" />Enrolled Students</h2>
              <span className="text-slate-500 text-xs">{students.length} total</span>
            </div>
            {students.length === 0 ? (
              <div className="p-10 text-center">
                <p className="text-slate-500 text-sm">No students enrolled yet.</p>
                <div className="flex justify-center gap-3 mt-4">
                  <button onClick={() => setShowJoinCode(true)} className="btn-secondary btn-sm">
                    <QrCode size={14} /> Show Join QR
                  </button>
                  <button onClick={() => setShowEnroll(true)} className="btn-primary btn-sm">
                    <UserPlus size={14} /> Enroll Student
                  </button>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {students.map((s, i) => (
                  <div key={s.id} className="flex items-center gap-3 px-5 py-3 hover:bg-white/[0.02] transition-colors">
                    <span className="text-slate-600 text-sm w-5 text-right">{i + 1}</span>
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-xs font-bold text-white">
                      {s.full_name?.[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-200">{s.full_name}</p>
                      <p className="text-xs text-slate-500 font-mono">{s.student_id || '—'}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent sessions */}
          <div className="glass-card overflow-hidden">
            <div className="px-5 py-4 border-b border-white/5">
              <h2 className="font-semibold text-white flex items-center gap-2"><CalendarDays size={16} className="text-indigo-400" />Recent Sessions</h2>
            </div>
            {sessions.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-slate-500 text-sm">No sessions yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {sessions.map(s => (
                  <div key={s.id} className="px-5 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-200">{new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                      <p className="text-xs text-slate-500">{new Date(s.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
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
    </div>
  )
}

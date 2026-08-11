import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import Navbar from '../../components/common/Navbar'
import Badge from '../../components/common/Badge'
import Spinner from '../../components/common/Spinner'
import {
  QrCode, ScanLine, BookOpen, TrendingUp, Calendar, Clock,
  ChevronRight, Plus, X, AlertCircle, CheckCircle, Sparkles
} from 'lucide-react'
import { format, parseISO } from 'date-fns'

// ── Join Class Modal ───────────────────────────────────────────────────────
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

    // 1. Search for class with this join_code or ID prefix
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

    setSuccessMsg(`Successfully enrolled in "${matchedClass.name}"!`)
    onEnrolled(matchedClass)
    setLoading(false)
    setTimeout(onClose, 1800)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <div className="glass-card w-full max-w-md p-6 animate-fade-in relative">
        <button onClick={onClose} className="absolute right-4 top-4 text-slate-500 hover:text-white transition-colors">
          <X size={20} />
        </button>

        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
            <Sparkles size={18} />
          </div>
          <h2 className="text-lg font-bold text-white">Join a Class</h2>
        </div>
        <p className="text-slate-400 text-xs mb-5">Enter the 6-digit Join Code provided by your teacher</p>

        {error && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2.5 mb-4 text-red-400 text-sm">
            <AlertCircle size={15} /> {error}
          </div>
        )}

        {successMsg && (
          <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-2.5 mb-4 text-emerald-400 text-sm">
            <CheckCircle size={15} /> {successMsg}
          </div>
        )}

        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Class Join Code</label>
            <input
              type="text"
              className="input-field tracking-widest uppercase font-mono text-center text-lg font-bold py-3"
              placeholder="e.g. 8A9X2K"
              maxLength={10}
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              required
              autoFocus
            />
          </div>

          <button type="submit" disabled={loading || !code.trim()} className="btn-primary w-full justify-center py-3">
            {loading ? <Spinner size="sm" /> : 'Join Class'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ── Stat Card ─────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color, sublabel }) {
  return (
    <div className="glass-card p-5">
      <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br ${color} mb-3`}>
        <Icon size={18} className="text-white" />
      </div>
      <p className="text-3xl font-bold text-white">{value}</p>
      <p className="text-slate-400 text-sm mt-0.5">{label}</p>
      {sublabel && <p className="text-slate-600 text-xs mt-1">{sublabel}</p>}
    </div>
  )
}

export default function StudentDashboard() {
  const { profile } = useAuth()
  const [enrollments, setEnrollments] = useState([])
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [showJoinModal, setShowJoinModal] = useState(false)

  useEffect(() => {
    if (!profile?.id) {
      setLoading(false)
      return
    }
    const load = async () => {
      try {
        const [{ data: enr }, { data: attendanceLogs }] = await Promise.all([
          supabase
            .from('enrollments')
            .select('class_id, classes(id, name, schedule, room, join_code)')
            .eq('student_id', profile.id),
          supabase
            .from('attendance_logs')
            .select('*, attendance_sessions(date), classes(name)')
            .eq('student_id', profile.id)
            .order('marked_at', { ascending: false }),
        ])
        setEnrollments((enr || []).map(e => e.classes).filter(Boolean))
        setLogs(attendanceLogs || [])
      } catch (err) {
        console.error('Error loading student data:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [profile?.id])

  const totalSessions = logs.length
  const presentCount = logs.filter(l => l.status === 'present' || l.status === 'late').length
  const absentCount = logs.filter(l => l.status === 'absent').length
  const attendancePct = totalSessions > 0 ? Math.round((presentCount / totalSessions) * 100) : 0

  return (
    <div className="min-h-screen bg-[#0a0f1e]">
      <Navbar />

      {/* Hero */}
      <div className="relative overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-900/30 to-indigo-900/20" />
        <div className="absolute top-0 right-0 w-80 h-48 bg-purple-600/10 rounded-full blur-3xl" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-purple-400 text-sm font-medium mb-1">
              {format(new Date(), 'EEEE, MMMM d, yyyy')}
            </p>
            <h1 className="text-3xl font-bold text-white">
              Welcome back, <span className="gradient-text">{profile?.full_name?.split(' ')[0] || 'Student'}</span>
            </h1>
            <p className="text-slate-400 mt-1 text-sm">
              Student ID: <span className="font-mono text-slate-300">{profile?.student_id || 'N/A'}</span>
            </p>
          </div>

          <button
            onClick={() => setShowJoinModal(true)}
            className="btn-primary flex items-center gap-2 self-start sm:self-center py-2.5 px-5 text-sm"
          >
            <Plus size={16} />
            Join Class
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex justify-center py-20"><Spinner size="xl" /></div>
        ) : (
          <>
            {/* Stats & Actions grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard icon={TrendingUp} label="Attendance Rate" value={`${attendancePct}%`} color="from-indigo-600 to-purple-600" sublabel={`${presentCount} of ${totalSessions} sessions`} />
              <StatCard icon={BookOpen} label="Enrolled Classes" value={enrollments.length} color="from-sky-600 to-indigo-600" />
              
              <Link to="/student/my-qr" className="glass-card p-5 flex items-center gap-4 group hover:border-indigo-500/30 transition-all">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center flex-shrink-0">
                  <QrCode size={22} className="text-white" />
                </div>
                <div>
                  <p className="font-semibold text-white group-hover:text-indigo-200 transition-colors">My QR Code</p>
                  <p className="text-slate-500 text-xs mt-1">Show ID to teacher</p>
                </div>
                <ChevronRight size={16} className="text-slate-600 group-hover:text-indigo-400 transition-colors ml-auto" />
              </Link>

              <Link to="/student/scan" className="glass-card p-5 flex items-center gap-4 group hover:border-purple-500/30 transition-all">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center flex-shrink-0">
                  <ScanLine size={22} className="text-white" />
                </div>
                <div>
                  <p className="font-semibold text-white group-hover:text-purple-200 transition-colors">Scan QR</p>
                  <p className="text-slate-500 text-xs mt-1">Mark attendance</p>
                </div>
                <ChevronRight size={16} className="text-slate-600 group-hover:text-purple-400 transition-colors ml-auto" />
              </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Enrolled classes with individual progress */}
              <div className="glass-card overflow-hidden h-fit">
                <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
                  <h2 className="font-semibold text-white">My Classes Performance</h2>
                  <button onClick={() => setShowJoinModal(true)} className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1">
                    <Plus size={14} /> Join Class
                  </button>
                </div>
                {enrollments.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="text-slate-500 text-sm">Not enrolled in any class.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {enrollments.map(cls => {
                      const classLogs = logs.filter(l => l.class_id === cls.id);
                      const t = classLogs.length;
                      const p = classLogs.filter(l => l.status === 'present' || l.status === 'late').length;
                      const rate = t > 0 ? Math.round((p / t) * 100) : 0;
                      
                      return (
                        <Link to={`/student/class/${cls.id}`} key={cls.id} className="block px-5 py-4 hover:bg-white/[0.04] transition-colors group">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <p className="text-sm font-medium text-slate-200 group-hover:text-indigo-300 transition-colors">{cls.name}</p>
                              {cls.schedule && <p className="text-xs text-slate-500 mt-0.5">{cls.schedule}</p>}
                            </div>
                            <div className="text-right">
                              <span className={`font-bold ${rate >= 80 ? 'text-emerald-400' : rate >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                                {rate}%
                              </span>
                              <p className="text-[10px] text-slate-500">{t > 0 ? `${p} of ${t} attended` : 'No sessions yet'}</p>
                            </div>
                          </div>
                          
                          {/* Progress bar per class */}
                          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-1000 ${
                                rate >= 80 ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                                  : rate >= 60 ? 'bg-gradient-to-r from-yellow-500 to-orange-400'
                                    : 'bg-gradient-to-r from-red-500 to-rose-400'
                              }`}
                              style={{ width: `${rate}%` }}
                            />
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Attendance log */}
              <div className="glass-card overflow-hidden h-fit">
                <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
                  <h2 className="font-semibold text-white">Recent Attendance History</h2>
                </div>
                {logs.length === 0 ? (
                  <div className="p-10 text-center">
                    <p className="text-slate-500 text-sm">No attendance records yet.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {logs.slice(0, 10).map(log => (
                      <div key={log.id} className="flex items-center justify-between px-5 py-3 hover:bg-white/[0.02] transition-colors">
                        <div>
                          <p className="text-sm font-medium text-slate-200">{log.classes?.name || 'Unknown Class'}</p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {log.attendance_sessions?.date
                              ? format(parseISO(log.attendance_sessions.date), 'MMM d, yyyy')
                              : format(parseISO(log.marked_at), 'MMM d, yyyy')}
                            {' · '}
                            {format(parseISO(log.marked_at), 'h:mm a')}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge status={log.status} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {showJoinModal && (
        <JoinClassModal
          studentId={profile?.id}
          onClose={() => setShowJoinModal(false)}
          onEnrolled={newClass => setEnrollments(prev => [...prev, newClass])}
        />
      )}
    </div>
  )
}

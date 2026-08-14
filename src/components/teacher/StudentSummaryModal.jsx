import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import Badge from '../common/Badge'
import Spinner from '../common/Spinner'
import { X, Calendar, Clock, CheckCircle2, TrendingUp, AlertTriangle } from 'lucide-react'

export default function StudentSummaryModal({ student, classId, className, onClose }) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ total: 0, present: 0, late: 0, absent: 0, excused: 0, rate: 0 })

  useEffect(() => {
    const fetchStudentHistory = async () => {
      setLoading(true)

      // Fetch all sessions for this class
      const { data: sessions } = await supabase
        .from('attendance_sessions')
        .select('id, date, created_at')
        .eq('class_id', classId)
        .order('date', { ascending: false })

      // Fetch logs for this student in this class
      const { data: studentLogs } = await supabase
        .from('attendance_logs')
        .select('*')
        .eq('class_id', classId)
        .eq('student_id', student.id)

      const logMap = new Map((studentLogs || []).map(l => [l.session_id, l]))

      let presentCount = 0
      let lateCount = 0
      let absentCount = 0
      let excusedCount = 0

      const merged = (sessions || []).map(sess => {
        const log = logMap.get(sess.id)
        const status = log ? log.status : 'absent'
        if (status === 'present') presentCount++
        else if (status === 'late') lateCount++
        else if (status === 'absent') absentCount++
        else if (status === 'excused') excusedCount++

        return {
          sessionId: sess.id,
          date: sess.date,
          createdAt: sess.created_at,
          status,
          method: log?.method || 'unrecorded',
          markedAt: log?.marked_at || null,
        }
      })

      const total = merged.length
      const attended = presentCount + lateCount
      const rate = total > 0 ? Math.round((attended / total) * 100) : 0

      setStats({
        total,
        present: presentCount,
        late: lateCount,
        absent: absentCount,
        excused: excusedCount,
        rate,
      })
      setLogs(merged)
      setLoading(false)
    }

    if (student?.id && classId) {
      fetchStudentHistory()
    }
  }, [student?.id, classId])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <div className="glass-card w-full max-w-lg p-6 animate-fade-in relative max-h-[90vh] flex flex-col">
        {/* Close Button */}
        <button onClick={onClose} className="absolute right-4 top-4 text-slate-500 hover:text-white transition-colors">
          <X size={20} />
        </button>

        {/* Student Profile Header */}
        <div className="flex items-center gap-3.5 mb-5 pr-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-lg font-bold shadow-lg shadow-indigo-500/20 flex-shrink-0 overflow-hidden">
            {student?.avatar_url ? (
              <img src={student.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              student?.full_name?.[0]?.toUpperCase() || '?'
            )}
          </div>
          <div>
            <h2 className="text-lg font-bold text-white leading-tight">{student?.full_name}</h2>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              ID: {student?.student_id || 'Not assigned'} • {className}
            </p>
          </div>
        </div>

        {/* Stats Summary Bar */}
        <div className="grid grid-cols-4 gap-2 mb-5">
          <div className="bg-slate-900/60 border border-white/5 rounded-xl p-2.5 text-center">
            <p className={`text-xl font-bold ${stats.rate >= 80 ? 'text-emerald-400' : stats.rate >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
              {stats.rate}%
            </p>
            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mt-0.5">Rate</p>
          </div>
          <div className="bg-slate-900/60 border border-white/5 rounded-xl p-2.5 text-center">
            <p className="text-xl font-bold text-emerald-400">{stats.present}</p>
            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mt-0.5">Present</p>
          </div>
          <div className="bg-slate-900/60 border border-white/5 rounded-xl p-2.5 text-center">
            <p className="text-xl font-bold text-yellow-400">{stats.late}</p>
            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mt-0.5">Late</p>
          </div>
          <div className="bg-slate-900/60 border border-white/5 rounded-xl p-2.5 text-center">
            <p className="text-xl font-bold text-red-400">{stats.absent}</p>
            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mt-0.5">Absent</p>
          </div>
        </div>

        {/* Attendance History List */}
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Calendar size={13} className="text-indigo-400" /> Session History ({logs.length})
        </h3>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[160px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-10">
              <Spinner size="md" />
              <p className="text-xs text-slate-500 mt-2">Loading attendance logs...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-10 bg-slate-900/40 rounded-xl border border-white/5">
              <AlertTriangle size={24} className="text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-400">No attendance sessions recorded yet</p>
            </div>
          ) : (
            logs.map(log => (
              <div
                key={log.sessionId}
                className="flex items-center justify-between bg-slate-900/50 border border-white/5 rounded-xl px-3.5 py-2.5 hover:border-white/10 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-slate-200">
                    {new Date(log.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                  <p className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                    <Clock size={11} />
                    {log.markedAt
                      ? new Date(log.markedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : 'No check-in timestamp'}
                    <span className="text-slate-600">•</span>
                    <span className="capitalize">{log.method?.replace('_', ' ')}</span>
                  </p>
                </div>
                <Badge status={log.status} />
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-white/5 mt-4">
          <button onClick={onClose} className="btn-secondary w-full justify-center text-sm">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

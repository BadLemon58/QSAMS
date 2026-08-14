import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import Badge from '../common/Badge'
import Spinner from '../common/Spinner'
import { X, Calendar, Clock, AlertTriangle, User } from 'lucide-react'
import { format, parseISO } from 'date-fns'

export default function StudentSummaryModal({ student, classId, className, onClose }) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ total: 0, present: 0, late: 0, absent: 0, excused: 0, rate: 0 })

  useEffect(() => {
    const fetchStudentHistory = async () => {
      setLoading(true)

      const { data: sessions } = await supabase
        .from('attendance_sessions')
        .select('id, date, created_at')
        .eq('class_id', classId)
        .order('date', { ascending: false })

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in font-['Gambarino',system-ui,sans-serif]">
      <div className="bg-[#ffffff] text-[#1a1a1a] w-full max-w-lg p-6 rounded-[24px] shadow-2xl border border-[rgba(0,0,0,0.06)] relative max-h-[90vh] flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 w-8 h-8 rounded-full bg-[#ebebeb] flex items-center justify-center text-[#7a7a7a] hover:text-[#1a1a1a] transition-colors"
        >
          <X size={16} />
        </button>

        {/* Student Profile Header */}
        <div className="flex items-center gap-3.5 mb-5 pr-8">
          <div className="w-12 h-12 rounded-full bg-[#f7b500] text-[#000000] flex items-center justify-center text-lg font-bold shadow-sm shrink-0 overflow-hidden">
            {student?.avatar_url ? (
              <img src={student.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              student?.full_name?.[0]?.toUpperCase() || <User size={20} />
            )}
          </div>
          <div>
            <h2 className="font-['Source_Serif_4',Georgia,serif] text-xl font-bold text-[#1a1a1a] leading-tight">
              {student?.full_name}
            </h2>
            <p className="text-xs text-[#7a7a7a] font-mono mt-0.5">
              ID: {student?.student_id || 'N/A'} • {className}
            </p>
          </div>
        </div>

        {/* Stats Summary Grid */}
        <div className="grid grid-cols-4 gap-2 mb-5">
          <div className="bg-[#f5f5f5] border border-[rgba(0,0,0,0.06)] rounded-[16px] p-2.5 text-center">
            <p className={`font-['Source_Serif_4',Georgia,serif] text-xl font-bold ${stats.rate >= 80 ? 'text-[#15803D]' : stats.rate >= 60 ? 'text-[#A16207]' : 'text-[#B91C1C]'}`}>
              {stats.rate}%
            </p>
            <p className="text-[10px] uppercase tracking-wider text-[#7a7a7a] font-bold mt-0.5">Rate</p>
          </div>
          <div className="bg-[#f5f5f5] border border-[rgba(0,0,0,0.06)] rounded-[16px] p-2.5 text-center">
            <p className="font-['Source_Serif_4',Georgia,serif] text-xl font-bold text-[#15803D]">{stats.present}</p>
            <p className="text-[10px] uppercase tracking-wider text-[#7a7a7a] font-bold mt-0.5">Present</p>
          </div>
          <div className="bg-[#f5f5f5] border border-[rgba(0,0,0,0.06)] rounded-[16px] p-2.5 text-center">
            <p className="font-['Source_Serif_4',Georgia,serif] text-xl font-bold text-[#A16207]">{stats.late}</p>
            <p className="text-[10px] uppercase tracking-wider text-[#7a7a7a] font-bold mt-0.5">Late</p>
          </div>
          <div className="bg-[#f5f5f5] border border-[rgba(0,0,0,0.06)] rounded-[16px] p-2.5 text-center">
            <p className="font-['Source_Serif_4',Georgia,serif] text-xl font-bold text-[#B91C1C]">{stats.absent}</p>
            <p className="text-[10px] uppercase tracking-wider text-[#7a7a7a] font-bold mt-0.5">Absent</p>
          </div>
        </div>

        {/* Attendance History List */}
        <h3 className="text-xs font-bold text-[#7a7a7a] uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Calendar size={13} className="text-[#ee6a2a]" /> Session History ({logs.length})
        </h3>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[160px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-10">
              <Spinner size="md" />
              <p className="text-xs text-[#7a7a7a] mt-2 font-medium">Loading records...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-10 bg-[#f5f5f5] rounded-[16px]">
              <AlertTriangle size={24} className="text-[#7a7a7a] mx-auto mb-2" />
              <p className="text-xs text-[#7a7a7a]">No attendance sessions recorded yet</p>
            </div>
          ) : (
            logs.map(log => (
              <div
                key={log.sessionId}
                className="flex items-center justify-between bg-[#f5f5f5] border border-[rgba(0,0,0,0.06)] rounded-[16px] px-3.5 py-2.5 hover:bg-[#ebebeb] transition-colors"
              >
                <div>
                  <p className="text-sm font-semibold text-[#1a1a1a]">
                    {format(parseISO(log.date), 'EEEE, MMM d, yyyy')}
                  </p>
                  <p className="text-[11px] text-[#7a7a7a] flex items-center gap-1.5 mt-0.5">
                    <Clock size={11} className="text-[#ee6a2a]" />
                    {log.markedAt
                      ? format(parseISO(log.markedAt), 'h:mm a')
                      : 'Unmarked'}
                    <span>•</span>
                    <span className="capitalize">{log.method?.replace('_', ' ')}</span>
                  </p>
                </div>
                <Badge status={log.status} />
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-[rgba(0,0,0,0.06)] mt-4">
          <button onClick={onClose} className="btn-secondary w-full justify-center text-sm py-3">
            Close Summary
          </button>
        </div>
      </div>
    </div>
  )
}

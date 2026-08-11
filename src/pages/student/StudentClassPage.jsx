import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import Navbar from '../../components/common/Navbar'
import Badge from '../../components/common/Badge'
import Spinner from '../../components/common/Spinner'
import { ArrowLeft, Calendar, Clock, BookOpen } from 'lucide-react'
import { format, parseISO } from 'date-fns'

export default function StudentClassPage() {
  const { classId } = useParams()
  const { profile } = useAuth()
  const [classData, setClassData] = useState(null)
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile?.id || !classId) return
    const load = async () => {
      try {
        const [{ data: cls }, { data: attendanceLogs }] = await Promise.all([
          supabase
            .from('classes')
            .select('*')
            .eq('id', classId)
            .single(),
          supabase
            .from('attendance_logs')
            .select('*, attendance_sessions(date)')
            .eq('class_id', classId)
            .eq('student_id', profile.id)
            .order('marked_at', { ascending: false })
        ])
        setClassData(cls)
        setLogs(attendanceLogs || [])
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [profile?.id, classId])

  if (loading) return <div className="min-h-screen bg-[#0a0f1e] flex justify-center py-20"><Spinner size="xl" /></div>
  if (!classData) return <div className="min-h-screen bg-[#0a0f1e] text-white flex justify-center py-20">Class not found.</div>

  const total = logs.length
  const present = logs.filter(l => l.status === 'present' || l.status === 'late').length
  const rate = total > 0 ? Math.round((present / total) * 100) : 0

  return (
    <div className="min-h-screen bg-[#0a0f1e]">
      <Navbar />
      
      {/* Header */}
      <div className="bg-slate-900 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Link to="/student" className="inline-flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 mb-6 transition-colors">
            <ArrowLeft size={16} /> Back to Dashboard
          </Link>
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">{classData.name}</h1>
              {classData.schedule && (
                <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                  <Clock size={14} /> {classData.schedule}
                </div>
              )}
              {classData.room && (
                <div className="flex items-center gap-2 text-slate-400 text-sm">
                  <BookOpen size={14} /> {classData.room}
                </div>
              )}
            </div>
            
            {/* Class Stats */}
            <div className="glass-card p-4 min-w-[200px]">
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">Attendance Rate</p>
              <div className="flex items-end justify-between mb-2">
                <span className={`text-3xl font-bold ${rate >= 80 ? 'text-emerald-400' : rate >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {rate}%
                </span>
                <span className="text-sm text-slate-500 mb-1">{present} of {total}</span>
              </div>
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
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="glass-card overflow-hidden">
          <div className="px-5 py-4 border-b border-white/5 flex items-center gap-2">
            <Calendar size={18} className="text-slate-400" />
            <h2 className="font-semibold text-white">Attendance Log</h2>
          </div>
          
          {logs.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-slate-500">No attendance sessions recorded for this class yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {logs.map(log => (
                <div key={log.id} className="flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-colors">
                  <div>
                    <p className="text-sm font-medium text-slate-200">
                      {log.attendance_sessions?.date
                        ? format(parseISO(log.attendance_sessions.date), 'EEEE, MMMM d, yyyy')
                        : format(parseISO(log.marked_at), 'EEEE, MMMM d, yyyy')}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Marked at: {format(parseISO(log.marked_at), 'h:mm a')}
                    </p>
                  </div>
                  <div>
                    <Badge status={log.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

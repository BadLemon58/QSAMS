import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import Navbar from '../../components/common/Navbar'
import Badge from '../../components/common/Badge'
import Spinner from '../../components/common/Spinner'
import { ArrowLeft, Calendar, Clock, BookOpen, CheckCircle } from 'lucide-react'
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#ffffff] flex flex-col justify-center items-center py-20">
        <Spinner size="xl" />
      </div>
    )
  }

  if (!classData) {
    return (
      <div className="min-h-screen bg-[#ffffff] text-[#1a1a1a] flex flex-col justify-center items-center py-20">
        <p className="text-sm text-[#7a7a7a]">Class not found.</p>
        <Link to="/student" className="btn-secondary mt-4">Return to Dashboard</Link>
      </div>
    )
  }

  const total = logs.length
  const present = logs.filter(l => l.status === 'present' || l.status === 'late').length
  const absent = logs.filter(l => l.status === 'absent').length
  const rate = total > 0 ? Math.round((present / total) * 100) : 0

  return (
    <div className="min-h-screen bg-[#ffffff] text-[#1a1a1a] font-['Gambarino',system-ui,sans-serif] selection:bg-[#ee6a2a]/20">
      <Navbar />

      {/* Header Banner */}
      <div className="bg-[#f5f5f5] border-b border-[rgba(0,0,0,0.06)]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Link
            to="/student"
            className="inline-flex items-center gap-2 text-xs font-semibold text-[#ee6a2a] hover:underline mb-4 transition-colors"
          >
            <ArrowLeft size={15} /> Back to Dashboard
          </Link>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <span className="text-xs uppercase font-bold tracking-wider text-[#7a7a7a]">Course Attendance</span>
              <h1 className="font-['Source_Serif_4',Georgia,serif] text-3xl font-bold text-[#1a1a1a] mt-0.5 mb-2">
                {classData.name}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-[#7a7a7a] text-xs">
                {classData.schedule && (
                  <div className="flex items-center gap-1.5 bg-[#ffffff] px-3 py-1 rounded-full border border-[rgba(0,0,0,0.06)]">
                    <Clock size={13} className="text-[#ee6a2a]" /> {classData.schedule}
                  </div>
                )}
                {classData.room && (
                  <div className="flex items-center gap-1.5 bg-[#ffffff] px-3 py-1 rounded-full border border-[rgba(0,0,0,0.06)]">
                    <BookOpen size={13} className="text-[#ee6a2a]" /> {classData.room}
                  </div>
                )}
              </div>
            </div>

            {/* Attendance Progress Ring Mini */}
            <div className="bg-[#ffffff] border border-[rgba(0,0,0,0.06)] rounded-[20px] p-4 flex items-center gap-4 shadow-sm min-w-[240px]">
              <svg width="60" height="60" viewBox="0 0 60 60" className="shrink-0">
                <circle cx="30" cy="30" r="24" fill="none" stroke="#ebebeb" strokeWidth="6" />
                <circle
                  cx="30"
                  cy="30"
                  r="24"
                  fill="none"
                  stroke="#ee6a2a"
                  strokeWidth="6"
                  strokeLinecap="round"
                  pathLength="100"
                  strokeDasharray={`${rate} 100`}
                  transform="rotate(-90 30 30)"
                />
                <text x="30" y="35" textAnchor="middle" className="font-['Source_Serif_4',Georgia,serif] font-bold text-[14px] fill-[#1a1a1a]">
                  {rate}%
                </text>
              </svg>
              <div className="flex flex-col">
                <span className="font-['Source_Serif_4',Georgia,serif] font-bold text-[15px] text-[#1a1a1a]">
                  {present} of {total} sessions
                </span>
                <span className="text-[11px] text-[#7a7a7a] mt-0.5">
                  {absent} missed session{absent === 1 ? '' : 's'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-[#ebebeb] border border-[rgba(0,0,0,0.06)] rounded-[24px] overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-[rgba(0,0,0,0.06)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-[#ee6a2a]" />
              <h2 className="font-['Source_Serif_4',Georgia,serif] font-bold text-lg text-[#1a1a1a]">
                Attendance History
              </h2>
            </div>
            <span className="text-xs font-semibold text-[#7a7a7a]">
              {logs.length} Total Record{logs.length === 1 ? '' : 's'}
            </span>
          </div>

          {logs.length === 0 ? (
            <div className="p-12 text-center text-[#7a7a7a] text-xs">
              No attendance sessions recorded for this class yet.
            </div>
          ) : (
            <div className="divide-y divide-[rgba(0,0,0,0.06)]">
              {logs.map(log => {
                const dateObj = log.attendance_sessions?.date
                  ? parseISO(log.attendance_sessions.date)
                  : parseISO(log.marked_at)
                return (
                  <div key={log.id} className="flex items-center justify-between px-6 py-4 hover:bg-[#e2e2e2]/50 transition-colors">
                    <div>
                      <p className="text-sm font-semibold text-[#1a1a1a]">
                        {format(dateObj, 'EEEE, MMMM d, yyyy')}
                      </p>
                      <p className="text-xs text-[#7a7a7a] mt-0.5">
                        Recorded at {format(parseISO(log.marked_at), 'h:mm a')} • Method: {log.method || 'QR'}
                      </p>
                    </div>
                    <div>
                      <Badge status={log.status} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

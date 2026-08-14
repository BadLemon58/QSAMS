import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import Navbar from '../../components/common/Navbar'
import Spinner from '../../components/common/Spinner'
import Badge from '../../components/common/Badge'
import {
  ArrowLeft, BookOpen, Clock, MapPin,
  Calendar, CheckCircle, AlertTriangle, User
} from 'lucide-react'
import { format, parseISO } from 'date-fns'

export default function StudentClassPage() {
  const { classId } = useParams()
  const { profile } = useAuth()
  const navigate = useNavigate()

  const [classInfo, setClassInfo] = useState(null)
  const [sessions, setSessions] = useState([])
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchClassData = async () => {
      setLoading(true)

      const [{ data: cls }, { data: sessList }, { data: logList }] = await Promise.all([
        supabase.from('classes').select('*, profiles:teacher_id(full_name)').eq('id', classId).single(),
        supabase.from('attendance_sessions').select('*').eq('class_id', classId).order('date', { ascending: false }),
        supabase.from('attendance_logs').select('*').eq('class_id', classId).eq('student_id', profile.id),
      ])

      setClassInfo(cls)
      setSessions(sessList || [])
      setLogs(logList || [])
      setLoading(false)
    }

    if (classId && profile?.id) {
      fetchClassData()
    }
  }, [classId, profile?.id])

  const totalSessions = sessions.length
  const presentCount = logs.filter(l => l.status === 'present' || l.status === 'late').length
  const rate = totalSessions > 0 ? Math.round((presentCount / totalSessions) * 100) : 0

  const logMap = new Map(logs.map(l => [l.session_id, l]))

  if (loading) return (
    <div className="min-h-screen bg-[#f4f6f8] flex items-center justify-center"><Spinner size="xl" /></div>
  )

  return (
    <div className="min-h-screen bg-[#f4f6f8] text-[#0f172a] font-['Gambarino',system-ui,sans-serif] selection:bg-[#005a36]/20">
      <Navbar />

      {/* Main Container */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Back Link */}
        <button
          onClick={() => navigate('/student')}
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#005a36] hover:underline mb-4 transition-colors"
        >
          <ArrowLeft size={15} /> Back to Dashboard
        </button>

        {/* Institutional Forest Green Header Banner */}
        <div className="ndmc-banner mb-6">
          <span className="text-[11px] font-mono tracking-wider opacity-90 block mb-1">
            Student Course Attendance
          </span>
          <h1 className="font-['Source_Serif_4',Georgia,serif] text-2xl sm:text-3xl font-bold tracking-tight text-white">
            {classInfo?.name}
          </h1>
          {classInfo?.description && (
            <p className="text-xs opacity-90 mt-1">{classInfo.description}</p>
          )}
          <div className="flex flex-wrap gap-2.5 text-xs mt-3">
            {classInfo?.profiles?.full_name && (
              <span className="flex items-center gap-1.5 bg-white/15 px-3 py-1 rounded-full text-white backdrop-blur-sm">
                <User size={12} /> Instructor: {classInfo.profiles.full_name}
              </span>
            )}
            {classInfo?.schedule && (
              <span className="flex items-center gap-1.5 bg-white/15 px-3 py-1 rounded-full text-white backdrop-blur-sm">
                <Clock size={12} /> {classInfo.schedule}
              </span>
            )}
            {classInfo?.room && (
              <span className="flex items-center gap-1.5 bg-white/15 px-3 py-1 rounded-full text-white backdrop-blur-sm">
                <MapPin size={12} /> {classInfo.room}
              </span>
            )}
          </div>
        </div>

        {/* Stat Summary Band */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-[20px] p-4 text-center shadow-sm">
            <span className="text-xs text-[#64748b] font-bold uppercase tracking-wider">Attendance Rate</span>
            <p className="font-['Source_Serif_4',Georgia,serif] text-2xl sm:text-3xl font-bold text-[#005a36] mt-1">{rate}%</p>
          </div>
          <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-[20px] p-4 text-center shadow-sm">
            <span className="text-xs text-[#64748b] font-bold uppercase tracking-wider">Attended</span>
            <p className="font-['Source_Serif_4',Georgia,serif] text-2xl sm:text-3xl font-bold text-[#15803d] mt-1">{presentCount}</p>
          </div>
          <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-[20px] p-4 text-center shadow-sm">
            <span className="text-xs text-[#64748b] font-bold uppercase tracking-wider">Total Sessions</span>
            <p className="font-['Source_Serif_4',Georgia,serif] text-2xl sm:text-3xl font-bold text-[#0f172a] mt-1">{totalSessions}</p>
          </div>
        </div>

        {/* Session Attendance Records */}
        <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-[24px] overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-[#e2e8f0] flex items-center justify-between bg-[#f8fafc]">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-[#005a36]" />
              <h2 className="font-['Source_Serif_4',Georgia,serif] font-bold text-base text-[#0f172a]">
                Course Attendance History
              </h2>
            </div>
            <span className="text-xs font-semibold text-[#64748b]">{sessions.length} Recorded</span>
          </div>

          {sessions.length === 0 ? (
            <div className="p-10 text-center text-[#64748b] text-xs">
              No attendance sessions recorded for this class yet.
            </div>
          ) : (
            <div className="divide-y divide-[#e2e8f0]">
              {sessions.map(sess => {
                const log = logMap.get(sess.id)
                const status = log ? log.status : 'absent'

                return (
                  <div
                    key={sess.id}
                    className="px-6 py-3.5 flex items-center justify-between hover:bg-[#f8fafc] transition-colors"
                  >
                    <div>
                      <p className="font-semibold text-sm text-[#0f172a]">
                        {format(parseISO(sess.date), 'EEEE, MMMM d, yyyy')}
                      </p>
                      <p className="text-xs text-[#64748b] flex items-center gap-1.5 mt-0.5">
                        <Clock size={11} className="text-[#005a36]" />
                        {log?.marked_at
                          ? `Recorded at ${format(parseISO(log.marked_at), 'h:mm a')}`
                          : 'Unrecorded / Missed'}
                      </p>
                    </div>

                    <Badge status={status} />
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

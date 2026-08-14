import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import Spinner from '../common/Spinner'
import {
  X, Download, Printer, FileSpreadsheet, Users,
  Calendar, CheckCircle, Clock, AlertTriangle, Sparkles
} from 'lucide-react'
import { exportAttendanceReportToExcel } from '../../lib/excelExport'

export default function AttendanceReportModal({ classId, classInfo, teacherName, onClose }) {
  const [loading, setLoading] = useState(true)
  const [reportData, setReportData] = useState([])
  const [rawLogs, setRawLogs] = useState([])
  const [sessions, setSessions] = useState([])
  const [overallStats, setOverallStats] = useState({
    totalStudents: 0,
    totalSessions: 0,
    totalPresents: 0,
    totalLates: 0,
    totalAbsents: 0,
    averageRate: 0,
  })

  useEffect(() => {
    const fetchReport = async () => {
      setLoading(true)

      // 1. Fetch enrolled students
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('student_id, profiles(id, full_name, student_id)')
        .eq('class_id', classId)

      const students = (enrollments || []).map(e => e.profiles).filter(Boolean)

      // 2. Fetch all sessions for this class
      const { data: sessData } = await supabase
        .from('attendance_sessions')
        .select('id, date, created_at')
        .eq('class_id', classId)
        .order('date', { ascending: true })

      const allSessions = sessData || []
      setSessions(allSessions)

      // 3. Fetch all attendance logs for this class
      const { data: allLogs } = await supabase
        .from('attendance_logs')
        .select('*')
        .eq('class_id', classId)

      const logs = allLogs || []
      setRawLogs(logs)

      // 4. Calculate per-student metrics
      let totalPresents = 0
      let totalLates = 0
      let totalAbsents = 0

      const studentRows = students.map(st => {
        const studentLogs = logs.filter(l => l.student_id === st.id)
        let present = 0
        let late = 0
        let absent = 0
        let excused = 0

        // Map logs against sessions
        allSessions.forEach(sess => {
          const log = studentLogs.find(l => l.session_id === sess.id)
          if (!log) {
            absent++
          } else if (log.status === 'present') {
            present++
          } else if (log.status === 'late') {
            late++
          } else if (log.status === 'absent') {
            absent++
          } else if (log.status === 'excused') {
            excused++
          }
        })

        const totalAttended = present + late
        const rate = allSessions.length > 0 ? Math.round((totalAttended / allSessions.length) * 100) : 0

        totalPresents += present
        totalLates += late
        totalAbsents += absent

        return {
          id: st.id,
          name: st.full_name,
          studentId: st.student_id || '—',
          present,
          late,
          absent,
          excused,
          totalAttended,
          rate,
        }
      })

      studentRows.sort((a, b) => a.name.localeCompare(b.name))

      const totalExpected = students.length * allSessions.length
      const avgRate = totalExpected > 0 ? Math.round(((totalPresents + totalLates) / totalExpected) * 100) : 0

      setOverallStats({
        totalStudents: students.length,
        totalSessions: allSessions.length,
        totalPresents,
        totalLates,
        totalAbsents,
        averageRate: avgRate,
      })

      setReportData(studentRows)
      setLoading(false)
    }

    if (classId) {
      fetchReport()
    }
  }, [classId])

  // ── Export Excel Handler ────────────────────────────────────
  const handleExportExcel = () => {
    exportAttendanceReportToExcel({
      classInfo,
      teacherName,
      reportData,
      sessions,
      overallStats,
      rawLogs,
    })
  }

  // ── Print / Save as PDF Handler ───────────────────────────
  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="glass-card w-full max-w-4xl p-6 sm:p-8 animate-fade-in relative my-auto max-h-[92vh] flex flex-col print:max-h-none print:shadow-none print:border-none print:bg-white print:text-black print:p-0">

        {/* Modal Controls (Hidden in Print) */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10 print:hidden">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <FileSpreadsheet size={18} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white leading-none">Attendance Report</h2>
              <p className="text-xs text-slate-400 mt-1">Export or print the official attendance summary</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              disabled={loading || reportData.length === 0}
              className="btn-secondary btn-sm flex items-center gap-1.5"
              title="Download formatted Excel workbook (.xlsx)"
            >
              <FileSpreadsheet size={14} className="text-emerald-400" />
              <span>Export Excel</span>
            </button>
            <button
              onClick={handlePrint}
              disabled={loading || reportData.length === 0}
              className="btn-primary btn-sm flex items-center gap-1.5"
              title="Print or Save as PDF"
            >
              <Printer size={14} />
              <span>Print / PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors ml-2"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* ══════════ PRINTABLE REPORT SHEET CONTENT ══════════ */}
        <div id="printable-report" className="flex-1 overflow-y-auto print:overflow-visible">

          {/* Institutional Header */}
          <div className="text-center pb-4 mb-4 print:pb-1.5 print:mb-2 border-b border-white/10 print:border-slate-300 print:text-black">
            <p className="text-xs print:text-[9.5px] font-bold uppercase tracking-widest text-indigo-400 print:text-slate-800">
              Notre Dame of Midsayap College
            </p>
            <h1 className="text-xl sm:text-2xl print:text-base font-black text-white print:text-black tracking-tight mt-0.5">
              QR Code-Based Student Attendance Monitoring System (QSAMS)
            </h1>
            <p className="text-xs print:text-[9px] text-slate-400 print:text-slate-600 font-medium mt-0.5">
              Official Class Attendance Summary Report
            </p>
          </div>

          {/* Class Metadata & Info Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 print:gap-1.5 bg-slate-900/50 print:bg-slate-50 border border-white/5 print:border-slate-200 rounded-xl print:rounded-lg p-4 print:p-2 mb-5 print:mb-2 print:text-black">
            <div>
              <p className="text-[10px] print:text-[8px] uppercase font-bold text-slate-500 tracking-wider">Class Name</p>
              <p className="text-sm print:text-[10px] font-semibold text-white print:text-black truncate">{classInfo?.name}</p>
            </div>
            <div>
              <p className="text-[10px] print:text-[8px] uppercase font-bold text-slate-500 tracking-wider">Teacher</p>
              <p className="text-sm print:text-[10px] font-semibold text-white print:text-black truncate">{teacherName || 'Authorized Faculty'}</p>
            </div>
            <div>
              <p className="text-[10px] print:text-[8px] uppercase font-bold text-slate-500 tracking-wider">Schedule & Room</p>
              <p className="text-sm print:text-[10px] font-semibold text-white print:text-black truncate">
                {classInfo?.schedule || 'N/A'} {classInfo?.room ? `(${classInfo.room})` : ''}
              </p>
            </div>
            <div>
              <p className="text-[10px] print:text-[8px] uppercase font-bold text-slate-500 tracking-wider">Report Date</p>
              <p className="text-sm print:text-[10px] font-semibold text-white print:text-black">
                {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 print:gap-1 mb-5 print:mb-2">
            <div className="bg-slate-900/40 print:bg-slate-100 border border-white/5 print:border-slate-200 rounded-xl print:rounded-md p-2.5 print:p-1 text-center">
              <p className="text-lg print:text-xs font-bold text-white print:text-black">{overallStats.totalStudents}</p>
              <p className="text-[10px] print:text-[7.5px] uppercase text-slate-400 font-semibold mt-0.5">Enrolled</p>
            </div>
            <div className="bg-slate-900/40 print:bg-slate-100 border border-white/5 print:border-slate-200 rounded-xl print:rounded-md p-2.5 print:p-1 text-center">
              <p className="text-lg print:text-xs font-bold text-indigo-400 print:text-indigo-700">{overallStats.totalSessions}</p>
              <p className="text-[10px] print:text-[7.5px] uppercase text-slate-400 font-semibold mt-0.5">Sessions</p>
            </div>
            <div className="bg-slate-900/40 print:bg-slate-100 border border-white/5 print:border-slate-200 rounded-xl print:rounded-md p-2.5 print:p-1 text-center">
              <p className="text-lg print:text-xs font-bold text-emerald-400 print:text-emerald-700">{overallStats.totalPresents}</p>
              <p className="text-[10px] print:text-[7.5px] uppercase text-slate-400 font-semibold mt-0.5">Present</p>
            </div>
            <div className="bg-slate-900/40 print:bg-slate-100 border border-white/5 print:border-slate-200 rounded-xl print:rounded-md p-2.5 print:p-1 text-center">
              <p className="text-lg print:text-xs font-bold text-yellow-400 print:text-amber-700">{overallStats.totalLates}</p>
              <p className="text-[10px] print:text-[7.5px] uppercase text-slate-400 font-semibold mt-0.5">Late</p>
            </div>
            <div className="bg-slate-900/40 print:bg-slate-100 border border-white/5 print:border-slate-200 rounded-xl print:rounded-md p-2.5 print:p-1 text-center">
              <p className="text-lg print:text-xs font-bold text-red-400 print:text-red-700">{overallStats.totalAbsents}</p>
              <p className="text-[10px] print:text-[7.5px] uppercase text-slate-400 font-semibold mt-0.5">Absent</p>
            </div>
            <div className="bg-slate-900/40 print:bg-slate-100 border border-white/5 print:border-slate-200 rounded-xl print:rounded-md p-2.5 print:p-1 text-center">
              <p className={`text-lg print:text-xs font-bold ${overallStats.averageRate >= 80 ? 'text-emerald-400 print:text-emerald-700' : overallStats.averageRate >= 60 ? 'text-yellow-400 print:text-amber-700' : 'text-red-400 print:text-red-700'}`}>
                {overallStats.averageRate}%
              </p>
              <p className="text-[10px] print:text-[7.5px] uppercase text-slate-400 font-semibold mt-0.5">Avg Rate</p>
            </div>
          </div>

          {/* Student Roster Attendance Table */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Spinner size="lg" />
              <p className="text-sm text-slate-400 mt-2">Compiling class attendance statistics...</p>
            </div>
          ) : reportData.length === 0 ? (
            <div className="p-8 text-center bg-slate-900/40 rounded-xl border border-white/5">
              <p className="text-slate-400 text-sm">No students enrolled in this class yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-white/10 print:border-slate-300 rounded-xl print:rounded-none">
              <table className="w-full text-left text-xs print:text-[9px] border-collapse">
                <thead>
                  <tr className="bg-slate-900/80 print:bg-slate-100 border-b border-white/10 print:border-slate-300 text-slate-400 print:text-slate-800">
                    <th className="py-2.5 px-3 print:py-1 print:px-1.5 font-semibold uppercase tracking-wider text-center w-8">#</th>
                    <th className="py-2.5 px-3 print:py-1 print:px-2 font-semibold uppercase tracking-wider">Student Name</th>
                    <th className="py-2.5 px-3 print:py-1 print:px-2 font-semibold uppercase tracking-wider">Student ID</th>
                    <th className="py-2.5 px-2.5 print:py-1 print:px-1 font-semibold uppercase tracking-wider text-center text-emerald-400 print:text-emerald-800">Present</th>
                    <th className="py-2.5 px-2.5 print:py-1 print:px-1 font-semibold uppercase tracking-wider text-center text-yellow-400 print:text-amber-800">Late</th>
                    <th className="py-2.5 px-2.5 print:py-1 print:px-1 font-semibold uppercase tracking-wider text-center text-red-400 print:text-red-800">Absent</th>
                    <th className="py-2.5 px-2.5 print:py-1 print:px-1 font-semibold uppercase tracking-wider text-center text-indigo-400 print:text-indigo-800">Excused</th>
                    <th className="py-2.5 px-3 print:py-1 print:px-1.5 font-semibold uppercase tracking-wider text-center">Attended</th>
                    <th className="py-2.5 px-3 print:py-1 print:px-1.5 font-semibold uppercase tracking-wider text-right">Rate (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 print:divide-slate-200">
                  {reportData.map((st, idx) => (
                    <tr key={st.id} className="hover:bg-white/[0.02] print:hover:bg-transparent">
                      <td className="py-2 px-3 print:py-0.5 print:px-1.5 text-center text-slate-500 print:text-slate-600 font-mono">{idx + 1}</td>
                      <td className="py-2 px-3 print:py-0.5 print:px-2 font-medium text-slate-200 print:text-black">{st.name}</td>
                      <td className="py-2 px-3 print:py-0.5 print:px-2 text-slate-400 print:text-slate-700 font-mono">{st.studentId}</td>
                      <td className="py-2 px-2.5 print:py-0.5 print:px-1 text-center font-semibold text-emerald-400 print:text-emerald-800">{st.present}</td>
                      <td className="py-2 px-2.5 print:py-0.5 print:px-1 text-center font-semibold text-yellow-400 print:text-amber-800">{st.late}</td>
                      <td className="py-2 px-2.5 print:py-0.5 print:px-1 text-center font-semibold text-red-400 print:text-red-800">{st.absent}</td>
                      <td className="py-2 px-2.5 print:py-0.5 print:px-1 text-center font-semibold text-indigo-400 print:text-indigo-800">{st.excused}</td>
                      <td className="py-2 px-3 print:py-0.5 print:px-1.5 text-center font-semibold text-slate-200 print:text-black">
                        {st.totalAttended} / {sessions.length}
                      </td>
                      <td className="py-2 px-3 print:py-0.5 print:px-1.5 text-right font-bold">
                        <span className={st.rate >= 80 ? 'text-emerald-400 print:text-emerald-800' : st.rate >= 60 ? 'text-yellow-400 print:text-amber-800' : 'text-red-400 print:text-red-800'}>
                          {st.rate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Institutional Sign-off in Print View */}
          <div className="hidden print:grid grid-cols-2 gap-8 mt-6 pt-4 text-black text-[9.5px]">
            <div className="border-t border-slate-400 pt-1 text-center">
              <p className="font-bold">{teacherName || 'Subject Teacher'}</p>
              <p className="text-slate-500">Instructor Signature & Date</p>
            </div>
            <div className="border-t border-slate-400 pt-1 text-center">
              <p className="font-bold">NDMC Academic Affairs / Department Head</p>
              <p className="text-slate-500">Verified & Approved By</p>
            </div>
          </div>

        </div>

      </div>
    </div>
  )
}

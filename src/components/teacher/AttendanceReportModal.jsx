import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import Spinner from '../common/Spinner'
import {
  X, Printer, FileSpreadsheet, Users,
  Calendar, CheckCircle, Clock, AlertTriangle
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

  // Export Excel
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

  // Print
  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/40 backdrop-blur-sm overflow-y-auto print:p-0 print:bg-white print:static font-['Gambarino',system-ui,sans-serif]">
      <div className="bg-[#ffffff] text-[#0f172a] w-full max-w-4xl p-6 sm:p-8 rounded-[24px] shadow-2xl border border-[#e2e8f0] animate-fade-in relative my-auto max-h-[92vh] flex flex-col print:max-h-none print:shadow-none print:border-none print:bg-white print:text-black print:p-0">

        {/* Modal Controls (Hidden in Print) */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#e2e8f0] print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#e6f2ec] text-[#005a36] flex items-center justify-center">
              <FileSpreadsheet size={18} />
            </div>
            <div>
              <h2 className="font-['Source_Serif_4',Georgia,serif] text-xl font-bold text-[#0f172a] leading-none">
                Attendance Report
              </h2>
              <p className="text-xs text-[#64748b] mt-1">Export Excel or print the official attendance summary</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              disabled={loading || reportData.length === 0}
              className="btn-secondary btn-sm flex items-center gap-1.5"
              title="Download formatted Excel workbook (.xlsx)"
            >
              <FileSpreadsheet size={14} className="text-[#15803d]" />
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
              className="w-8 h-8 rounded-full bg-[#f1f5f9] flex items-center justify-center text-[#64748b] hover:text-[#0f172a] transition-colors ml-1"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ══════════ PRINTABLE REPORT SHEET CONTENT ══════════ */}
        <div id="printable-report" className="flex-1 overflow-y-auto print:overflow-visible">

          {/* Institutional Header */}
          <div className="text-center pb-4 mb-4 print:pb-1.5 print:mb-2 border-b border-[#e2e8f0] print:border-slate-300 print:text-black">
            <p className="text-xs print:text-[9.5px] font-bold uppercase tracking-widest text-[#005a36] print:text-slate-800">
              Notre Dame of Midsayap College
            </p>
            <h1 className="font-['Source_Serif_4',Georgia,serif] text-xl sm:text-2xl print:text-base font-bold text-[#0f172a] print:text-black tracking-tight mt-0.5">
              QR Code-Based Student Attendance Monitoring System (QSAMS)
            </h1>
            <p className="text-xs print:text-[9px] text-[#64748b] print:text-slate-600 font-medium mt-0.5">
              Official Class Attendance Summary Report
            </p>
          </div>

          {/* Class Metadata Grid (Assessment Style) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 print:gap-1.5 bg-[#f8fafc] print:bg-slate-50 border border-[#e2e8f0] print:border-slate-200 rounded-[18px] print:rounded-lg p-4 print:p-2 mb-5 print:mb-2">
            <div>
              <p className="text-[10px] print:text-[8px] uppercase font-bold text-[#64748b] tracking-wider">Class Name</p>
              <p className="text-sm print:text-[10px] font-semibold text-[#0f172a] print:text-black truncate">{classInfo?.name}</p>
            </div>
            <div>
              <p className="text-[10px] print:text-[8px] uppercase font-bold text-[#64748b] tracking-wider">Teacher</p>
              <p className="text-sm print:text-[10px] font-semibold text-[#0f172a] print:text-black truncate">{teacherName || 'Authorized Faculty'}</p>
            </div>
            <div>
              <p className="text-[10px] print:text-[8px] uppercase font-bold text-[#64748b] tracking-wider">Schedule & Room</p>
              <p className="text-sm print:text-[10px] font-semibold text-[#0f172a] print:text-black truncate">
                {classInfo?.schedule || 'N/A'} {classInfo?.room ? `(${classInfo.room})` : ''}
              </p>
            </div>
            <div>
              <p className="text-[10px] print:text-[8px] uppercase font-bold text-[#64748b] tracking-wider">Report Date</p>
              <p className="text-sm print:text-[10px] font-semibold text-[#0f172a] print:text-black">
                {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 print:gap-1 mb-5 print:mb-2">
            <div className="bg-[#f8fafc] print:bg-slate-100 border border-[#e2e8f0] print:border-slate-200 rounded-[14px] print:rounded-md p-2.5 print:p-1 text-center">
              <p className="font-['Source_Serif_4',Georgia,serif] text-lg print:text-xs font-bold text-[#0f172a] print:text-black">{overallStats.totalStudents}</p>
              <p className="text-[10px] print:text-[7.5px] uppercase text-[#64748b] font-bold mt-0.5">Enrolled</p>
            </div>
            <div className="bg-[#f8fafc] print:bg-slate-100 border border-[#e2e8f0] print:border-slate-200 rounded-[14px] print:rounded-md p-2.5 print:p-1 text-center">
              <p className="font-['Source_Serif_4',Georgia,serif] text-lg print:text-xs font-bold text-[#005a36] print:text-emerald-700">{overallStats.totalSessions}</p>
              <p className="text-[10px] print:text-[7.5px] uppercase text-[#64748b] font-bold mt-0.5">Sessions</p>
            </div>
            <div className="bg-[#f8fafc] print:bg-slate-100 border border-[#e2e8f0] print:border-slate-200 rounded-[14px] print:rounded-md p-2.5 print:p-1 text-center">
              <p className="font-['Source_Serif_4',Georgia,serif] text-lg print:text-xs font-bold text-[#15803d] print:text-emerald-700">{overallStats.totalPresents}</p>
              <p className="text-[10px] print:text-[7.5px] uppercase text-[#64748b] font-bold mt-0.5">Present</p>
            </div>
            <div className="bg-[#f8fafc] print:bg-slate-100 border border-[#e2e8f0] print:border-slate-200 rounded-[14px] print:rounded-md p-2.5 print:p-1 text-center">
              <p className="font-['Source_Serif_4',Georgia,serif] text-lg print:text-xs font-bold text-[#d97706] print:text-amber-700">{overallStats.totalLates}</p>
              <p className="text-[10px] print:text-[7.5px] uppercase text-[#64748b] font-bold mt-0.5">Late</p>
            </div>
            <div className="bg-[#f8fafc] print:bg-slate-100 border border-[#e2e8f0] print:border-slate-200 rounded-[14px] print:rounded-md p-2.5 print:p-1 text-center">
              <p className="font-['Source_Serif_4',Georgia,serif] text-lg print:text-xs font-bold text-[#b91c1c] print:text-red-700">{overallStats.totalAbsents}</p>
              <p className="text-[10px] print:text-[7.5px] uppercase text-[#64748b] font-bold mt-0.5">Absent</p>
            </div>
            <div className="bg-[#f8fafc] print:bg-slate-100 border border-[#e2e8f0] print:border-slate-200 rounded-[14px] print:rounded-md p-2.5 print:p-1 text-center">
              <p className={`font-['Source_Serif_4',Georgia,serif] text-lg print:text-xs font-bold ${overallStats.averageRate >= 80 ? 'text-[#15803d]' : overallStats.averageRate >= 60 ? 'text-[#d97706]' : 'text-[#b91c1c]'}`}>
                {overallStats.averageRate}%
              </p>
              <p className="text-[10px] print:text-[7.5px] uppercase text-[#64748b] font-bold mt-0.5">Avg Rate</p>
            </div>
          </div>

          {/* Student Table (Forest Green Head) */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Spinner size="lg" />
              <p className="text-xs text-[#64748b] mt-3">Compiling attendance records...</p>
            </div>
          ) : reportData.length === 0 ? (
            <div className="p-8 text-center bg-[#f8fafc] rounded-[18px]">
              <p className="text-[#64748b] text-xs">No attendance data recorded yet.</p>
            </div>
          ) : (
            <div className="border border-[#e2e8f0] print:border-slate-300 rounded-[18px] print:rounded-none overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#005a36] text-white print:bg-[#005a36] print:text-white border-b border-[#00482b] text-[10px] print:text-[8px] font-bold uppercase tracking-wider">
                    <th className="py-2.5 px-3 print:py-1 print:px-1.5 w-8">#</th>
                    <th className="py-2.5 px-3 print:py-1 print:px-1.5">Student Name</th>
                    <th className="py-2.5 px-3 print:py-1 print:px-1.5">ID Number</th>
                    <th className="py-2.5 px-3 print:py-1 print:px-1.5 text-center">Present</th>
                    <th className="py-2.5 px-3 print:py-1 print:px-1.5 text-center">Late</th>
                    <th className="py-2.5 px-3 print:py-1 print:px-1.5 text-center">Absent</th>
                    <th className="py-2.5 px-3 print:py-1 print:px-1.5 text-center">Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e2e8f0] print:divide-slate-200 text-xs print:text-[8.5px]">
                  {reportData.map((row, idx) => (
                    <tr key={row.id} className="hover:bg-[#f8fafc] print:hover:bg-transparent">
                      <td className="py-2 px-3 print:py-0.5 print:px-1.5 text-[#64748b] print:text-black font-mono">{idx + 1}</td>
                      <td className="py-2 px-3 print:py-0.5 print:px-1.5 font-semibold text-[#0f172a] print:text-black">{row.name}</td>
                      <td className="py-2 px-3 print:py-0.5 print:px-1.5 font-mono text-[#64748b] print:text-black">{row.studentId}</td>
                      <td className="py-2 px-3 print:py-0.5 print:px-1.5 text-center font-bold text-[#15803d] print:text-black">{row.present}</td>
                      <td className="py-2 px-3 print:py-0.5 print:px-1.5 text-center font-bold text-[#d97706] print:text-black">{row.late}</td>
                      <td className="py-2 px-3 print:py-0.5 print:px-1.5 text-center font-bold text-[#b91c1c] print:text-black">{row.absent}</td>
                      <td className="py-2 px-3 print:py-0.5 print:px-1.5 text-center font-bold text-[#005a36] print:text-black">{row.rate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Institutional Sign-off Footer */}
          <div className="mt-8 print:mt-4 pt-4 border-t border-[#e2e8f0] print:border-slate-300 grid grid-cols-2 gap-8 text-center text-xs print:text-[8.5px]">
            <div>
              <div className="border-b border-[#0f172a]/20 print:border-black w-48 mx-auto mb-1" />
              <p className="font-bold text-[#0f172a]">{teacherName || 'Course Instructor'}</p>
              <p className="text-[#64748b]">Faculty Signature</p>
            </div>
            <div>
              <div className="border-b border-[#0f172a]/20 print:border-black w-48 mx-auto mb-1" />
              <p className="font-bold text-[#0f172a]">Office of Academic Affairs</p>
              <p className="text-[#64748b]">Verified & Recorded</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { X, Printer, FileSpreadsheet, Users, Calendar, CheckCircle, Clock, AlertTriangle, RefreshCw, LayoutGrid, List } from 'lucide';
import { MorphIcon } from 'morphicons/react';
import { exportAttendanceReportToExcel } from '../../lib/excelExport'
import { TableRowSkeleton } from '../common/Skeleton'
import { format } from 'date-fns'

export default function AttendanceReportModal({ classId, classInfo, teacherName, onClose }) {
  const [loading, setLoading] = useState(true)
  const [reportData, setReportData] = useState([])
  const [rawLogs, setRawLogs] = useState([])
  const [sessions, setSessions] = useState([])
  const [viewMode, setViewMode] = useState('summary') // 'summary' | 'matrix'
  const [lastUpdated, setLastUpdated] = useState(new Date())
  const [overallStats, setOverallStats] = useState({
    totalStudents: 0,
    totalSessions: 0,
    totalPresents: 0,
    totalLates: 0,
    totalAbsents: 0,
    totalExcused: 0,
    averageRate: 0,
  })

  // Cumulative Semester Data Fetcher
  const fetchSemesterReport = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true)

    try {
      // 1. Fetch all officially enrolled students
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('student_id, profiles(id, full_name, student_id, avatar_url)')
        .eq('class_id', classId)

      const students = (enrollments || []).map(e => e.profiles).filter(Boolean)

      // 2. Fetch all recorded attendance sessions across the entire semester
      const { data: sessData } = await supabase
        .from('attendance_sessions')
        .select('id, date, created_at, is_active')
        .eq('class_id', classId)
        .order('date', { ascending: true })

      const allSessions = sessData || []
      setSessions(allSessions)

      // 3. Fetch all raw attendance logs recorded for this course
      const { data: allLogs } = await supabase
        .from('attendance_logs')
        .select('*')
        .eq('class_id', classId)

      const logs = allLogs || []
      setRawLogs(logs)

      // 4. Compute Cumulative Semester Metrics per student
      let totalPresents = 0
      let totalLates = 0
      let totalAbsents = 0
      let totalExcused = 0

      const studentRows = students.map(st => {
        const studentLogs = logs.filter(l => l.student_id === st.id)
        let present = 0
        let late = 0
        let absent = 0
        let excused = 0

        // Per-session status lookup map
        const sessionStatusMap = {}

        allSessions.forEach(sess => {
          const log = studentLogs.find(l => l.session_id === sess.id)
          if (!log) {
            absent++
            sessionStatusMap[sess.id] = 'absent'
          } else if (log.status === 'present') {
            present++
            sessionStatusMap[sess.id] = 'present'
          } else if (log.status === 'late') {
            late++
            sessionStatusMap[sess.id] = 'late'
          } else if (log.status === 'absent') {
            absent++
            sessionStatusMap[sess.id] = 'absent'
          } else if (log.status === 'excused') {
            excused++
            sessionStatusMap[sess.id] = 'excused'
          }
        })

        const totalAttended = present + late
        const rate = allSessions.length > 0 ? Math.round((totalAttended / allSessions.length) * 100) : 0

        totalPresents += present
        totalLates += late
        totalAbsents += absent
        totalExcused += excused

        return {
          id: st.id,
          name: st.full_name,
          studentId: st.student_id || '—',
          avatarUrl: st.avatar_url,
          present,
          late,
          absent,
          excused,
          totalAttended,
          rate,
          sessionStatusMap,
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
        totalExcused,
        averageRate: avgRate,
      })

      setReportData(studentRows)
      setLastUpdated(new Date())
    } catch (err) {
      console.error('Failed to compile semester report:', err)
    } finally {
      if (isInitial) setLoading(false)
    }
  }, [classId])

  // Initial mount load
  useEffect(() => {
    if (classId) {
      fetchSemesterReport(true)
    }
  }, [classId, fetchSemesterReport])

  // Real-time Supabase Subscription: Auto-updates whenever new attendance is logged or sessions added
  useEffect(() => {
    if (!classId) return

    const logsChannel = supabase
      .channel(`report-logs:${classId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'attendance_logs',
        filter: `class_id=eq.${classId}`
      }, () => {
        fetchSemesterReport(false)
      })
      .subscribe()

    const sessionChannel = supabase
      .channel(`report-sessions:${classId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'attendance_sessions',
        filter: `class_id=eq.${classId}`
      }, () => {
        fetchSemesterReport(false)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(logsChannel)
      supabase.removeChannel(sessionChannel)
    }
  }, [classId, fetchSemesterReport])

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
      <div className="bg-[#ffffff] text-[#0f172a] w-full max-w-5xl p-6 sm:p-8 rounded-[24px] shadow-2xl border border-[#e2e8f0] animate-fade-in relative my-auto max-h-[92vh] flex flex-col print:max-h-none print:shadow-none print:border-none print:bg-white print:text-black print:p-0">

        {/* Top-Right Absolute Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 sm:top-6 sm:right-6 w-8 h-8 rounded-full bg-[#f1f5f9] hover:bg-[#e2e8f0] flex items-center justify-center text-[#64748b] hover:text-[#0f172a] transition-colors z-20 print:hidden shadow-sm border border-[#e2e8f0]"
          title="Close Report"
        >
          <MorphIcon icon={X} size={16} />
        </button>

        {/* Modal Controls (Hidden in Print) */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between pb-4 mb-4 border-b border-[#e2e8f0] gap-3 pr-10 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#e6f2ec] text-[#005a36] flex items-center justify-center shadow-sm shrink-0">
              <MorphIcon icon={FileSpreadsheet} size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-['Source_Serif_4',Georgia,serif] text-xl font-bold text-[#0f172a] leading-none">
                  Semester Attendance Master Record
                </h2>
              </div>
              <p className="text-xs text-[#64748b] mt-1">
                Cumulative attendance record across all {sessions.length} class sessions • Auto-updates live
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* View Switcher */}
            <div className="flex bg-[#f1f5f9] p-1 rounded-xl border border-[#e2e8f0]">
              <button
                onClick={() => setViewMode('summary')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                  viewMode === 'summary'
                    ? 'bg-white text-[#005a36] shadow-sm'
                    : 'text-[#64748b] hover:text-[#0f172a]'
                }`}
                title="Aggregate Summary View"
              >
                <MorphIcon icon={List} size={13} /> Summary
              </button>
              <button
                onClick={() => setViewMode('matrix')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                  viewMode === 'matrix'
                    ? 'bg-white text-[#005a36] shadow-sm'
                    : 'text-[#64748b] hover:text-[#0f172a]'
                }`}
                title="Session-by-Session Date Matrix View"
              >
                <MorphIcon icon={LayoutGrid} size={13} /> Dates Matrix
              </button>
            </div>

            <button
              onClick={() => fetchSemesterReport(false)}
              className="p-2 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] text-[#64748b] hover:text-[#005a36] hover:bg-[#e6f2ec] transition-colors"
              title="Refresh Record"
            >
              <MorphIcon icon={RefreshCw} size={14} />
            </button>
            <button
              onClick={handleExportExcel}
              disabled={loading || reportData.length === 0}
              className="btn-secondary btn-sm flex items-center gap-1.5"
              title="Download formatted Master Excel Class Record (.xlsx)"
            >
              <MorphIcon icon={FileSpreadsheet} size={14} className="text-[#15803d]" />
              <span>Export Excel</span>
            </button>
            <button
              onClick={handlePrint}
              disabled={loading || reportData.length === 0}
              className="btn-primary btn-sm flex items-center gap-1.5"
              title="Print or Save as PDF"
            >
              <MorphIcon icon={Printer} size={14} />
              <span>Print / PDF</span>
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
              Cumulative Semester Attendance Master Record
            </h1>
            <p className="text-xs print:text-[9px] text-[#64748b] print:text-slate-600 font-medium mt-0.5">
              Academic Term: AY 2026-2027 • Official Subject Roll & Attendance Log
            </p>
          </div>

          {/* Class Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 print:gap-1.5 bg-[#f8fafc] print:bg-slate-50 border border-[#e2e8f0] print:border-slate-200 rounded-[18px] print:rounded-lg p-4 print:p-2 mb-5 print:mb-2">
            <div>
              <p className="text-[10px] print:text-[8px] uppercase font-bold text-[#64748b] tracking-wider">Course Section</p>
              <p className="text-sm print:text-[10px] font-semibold text-[#0f172a] print:text-black truncate">{classInfo?.name}</p>
            </div>
            <div>
              <p className="text-[10px] print:text-[8px] uppercase font-bold text-[#64748b] tracking-wider">Instructor</p>
              <p className="text-sm print:text-[10px] font-semibold text-[#0f172a] print:text-black truncate">{teacherName || 'Authorized Faculty'}</p>
            </div>
            <div>
              <p className="text-[10px] print:text-[8px] uppercase font-bold text-[#64748b] tracking-wider">Schedule & Room</p>
              <p className="text-sm print:text-[10px] font-semibold text-[#0f172a] print:text-black truncate">
                {classInfo?.schedule || 'N/A'} {classInfo?.room ? `(${classInfo.room})` : ''}
              </p>
            </div>
            <div>
              <p className="text-[10px] print:text-[8px] uppercase font-bold text-[#64748b] tracking-wider">Cumulative As Of</p>
              <p className="text-sm print:text-[10px] font-semibold text-[#0f172a] print:text-black">
                {format(lastUpdated, 'MMM d, yyyy • h:mm a')}
              </p>
            </div>
          </div>

          {/* Semester Aggregate Metrics */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 print:gap-1 mb-5 print:mb-2">
            <div className="bg-[#f8fafc] print:bg-slate-100 border border-[#e2e8f0] print:border-slate-200 rounded-[14px] print:rounded-md p-2.5 print:p-1 text-center">
              <p className="font-['Source_Serif_4',Georgia,serif] text-lg print:text-xs font-bold text-[#0f172a] print:text-black">{overallStats.totalStudents}</p>
              <p className="text-[10px] print:text-[7.5px] uppercase text-[#64748b] font-bold mt-0.5">Enrolled</p>
            </div>
            <div className="bg-[#f8fafc] print:bg-slate-100 border border-[#e2e8f0] print:border-slate-200 rounded-[14px] print:rounded-md p-2.5 print:p-1 text-center">
              <p className="font-['Source_Serif_4',Georgia,serif] text-lg print:text-xs font-bold text-[#005a36] print:text-emerald-700">{overallStats.totalSessions}</p>
              <p className="text-[10px] print:text-[7.5px] uppercase text-[#64748b] font-bold mt-0.5">Sessions Held</p>
            </div>
            <div className="bg-[#f8fafc] print:bg-slate-100 border border-[#e2e8f0] print:border-slate-200 rounded-[14px] print:rounded-md p-2.5 print:p-1 text-center">
              <p className="font-['Source_Serif_4',Georgia,serif] text-lg print:text-xs font-bold text-[#15803d] print:text-emerald-700">{overallStats.totalPresents}</p>
              <p className="text-[10px] print:text-[7.5px] uppercase text-[#64748b] font-bold mt-0.5">Total Present</p>
            </div>
            <div className="bg-[#f8fafc] print:bg-slate-100 border border-[#e2e8f0] print:border-slate-200 rounded-[14px] print:rounded-md p-2.5 print:p-1 text-center">
              <p className="font-['Source_Serif_4',Georgia,serif] text-lg print:text-xs font-bold text-[#d97706] print:text-amber-700">{overallStats.totalLates}</p>
              <p className="text-[10px] print:text-[7.5px] uppercase text-[#64748b] font-bold mt-0.5">Total Late</p>
            </div>
            <div className="bg-[#f8fafc] print:bg-slate-100 border border-[#e2e8f0] print:border-slate-200 rounded-[14px] print:rounded-md p-2.5 print:p-1 text-center">
              <p className="font-['Source_Serif_4',Georgia,serif] text-lg print:text-xs font-bold text-[#b91c1c] print:text-red-700">{overallStats.totalAbsents}</p>
              <p className="text-[10px] print:text-[7.5px] uppercase text-[#64748b] font-bold mt-0.5">Total Absent</p>
            </div>
            <div className="bg-[#f8fafc] print:bg-slate-100 border border-[#e2e8f0] print:border-slate-200 rounded-[14px] print:rounded-md p-2.5 print:p-1 text-center">
              <p className={`font-['Source_Serif_4',Georgia,serif] text-lg print:text-xs font-bold ${overallStats.averageRate >= 80 ? 'text-[#15803d]' : overallStats.averageRate >= 60 ? 'text-[#d97706]' : 'text-[#b91c1c]'}`}>
                {overallStats.averageRate}%
              </p>
              <p className="text-[10px] print:text-[7.5px] uppercase text-[#64748b] font-bold mt-0.5">Semester Avg</p>
            </div>
          </div>

          {/* Main Record Table */}
          {loading ? (
            <div className="p-4">
              <TableRowSkeleton rows={6} />
            </div>
          ) : reportData.length === 0 ? (
            <div className="p-8 text-center bg-[#f8fafc] rounded-[18px] border border-[#e2e8f0]">
              <p className="text-[#64748b] text-xs">No enrolled students or session records found for this course.</p>
            </div>
          ) : viewMode === 'matrix' ? (
            /* ── VIEW 1: DATES MATRIX VIEW (Detailed Breakdown) ── */
            <div className="border border-[#e2e8f0] print:border-slate-300 rounded-[18px] print:rounded-none overflow-x-auto shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#005a36] text-white print:bg-[#005a36] print:text-white border-b border-[#00482b] text-[10px] print:text-[8px] font-bold uppercase tracking-wider">
                    <th className="py-2.5 px-3 print:py-1 print:px-1.5 w-8 sticky left-0 bg-[#005a36] z-10">#</th>
                    <th className="py-2.5 px-3 print:py-1 print:px-1.5 sticky left-8 bg-[#005a36] z-10">Student Name</th>
                    {sessions.map(s => (
                      <th
                        key={s.id}
                        className={`py-2.5 px-3 print:py-1 print:px-1 text-center border-l border-white/20 whitespace-nowrap font-bold text-xs print:text-[8.5px] text-white tracking-normal capitalize ${
                          sessions.length >= 4 ? 'w-1' : ''
                        }`}
                        style={sessions.length >= 4 ? { width: '1%' } : {}}
                        title={format(new Date(s.date), 'MMMM d, yyyy')}
                      >
                        {format(new Date(s.date), 'MMMM d')}
                      </th>
                    ))}
                    <th className={`py-2.5 px-3 print:py-1 print:px-1.5 text-center border-l border-white/30 bg-[#00462a] whitespace-nowrap ${sessions.length >= 4 ? 'w-1' : ''}`} style={sessions.length >= 4 ? { width: '1%' } : {}}>Attended</th>
                    <th className={`py-2.5 px-3 print:py-1 print:px-1.5 text-center bg-[#00462a] whitespace-nowrap ${sessions.length >= 4 ? 'w-1' : ''}`} style={sessions.length >= 4 ? { width: '1%' } : {}}>Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e2e8f0] print:divide-slate-200 text-xs print:text-[8px]">
                  {reportData.map((row, idx) => (
                    <tr key={row.id} className="hover:bg-[#f8fafc] print:hover:bg-transparent">
                      <td className="py-2 px-3 print:py-0.5 print:px-1 text-[#64748b] print:text-black font-mono sticky left-0 bg-white">{idx + 1}</td>
                      <td className="py-2 px-3 print:py-0.5 print:px-1 font-semibold text-[#0f172a] print:text-black sticky left-8 bg-white truncate max-w-[200px]">{row.name}</td>
                      {sessions.map(s => {
                        const status = row.sessionStatusMap[s.id] || 'absent'
                        return (
                          <td key={s.id} className={`py-2 px-2 print:py-0.5 print:px-1 text-center border-l border-[#e2e8f0] whitespace-nowrap ${sessions.length >= 4 ? 'w-1' : ''}`} style={sessions.length >= 4 ? { width: '1%' } : {}}>
                            {status === 'present' && (
                              <span className="inline-block px-1.5 py-0.5 text-[10px] font-bold text-[#15803d] bg-[#dcfce7] rounded">P</span>
                            )}
                            {status === 'late' && (
                              <span className="inline-block px-1.5 py-0.5 text-[10px] font-bold text-[#d97706] bg-[#fef3c7] rounded">L</span>
                            )}
                            {status === 'absent' && (
                              <span className="inline-block px-1.5 py-0.5 text-[10px] font-bold text-[#b91c1c] bg-[#fee2e2] rounded">A</span>
                            )}
                            {status === 'excused' && (
                              <span className="inline-block px-1.5 py-0.5 text-[10px] font-bold text-[#0369a1] bg-[#e0f2fe] rounded">E</span>
                            )}
                          </td>
                        )
                      })}
                      <td className={`py-2 px-3 print:py-0.5 print:px-1 text-center font-bold text-[#0f172a] border-l border-[#e2e8f0] bg-[#f8fafc] whitespace-nowrap ${sessions.length >= 4 ? 'w-1' : ''}`} style={sessions.length >= 4 ? { width: '1%' } : {}}>
                        {row.totalAttended} / {sessions.length}
                      </td>
                      <td className={`py-2 px-3 print:py-0.5 print:px-1 text-center font-bold text-[#005a36] bg-[#f8fafc] whitespace-nowrap ${sessions.length >= 4 ? 'w-1' : ''}`} style={sessions.length >= 4 ? { width: '1%' } : {}}>
                        {row.rate}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            /* ── VIEW 2: SUMMARY VIEW (Clean Standard Sheet) ── */
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
                    <th className="py-2.5 px-3 print:py-1 print:px-1.5 text-center">Attended</th>
                    <th className="py-2.5 px-3 print:py-1 print:px-1.5 text-center">Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e2e8f0] print:divide-slate-200 text-xs print:text-[8.5px]">
                  {reportData.map((row, idx) => (
                    <tr key={row.id} className="hover:bg-[#f8fafc] print:hover:bg-transparent">
                      <td className="py-2.5 px-3 print:py-0.5 print:px-1.5 text-[#64748b] print:text-black font-mono">{idx + 1}</td>
                      <td className="py-2.5 px-3 print:py-0.5 print:px-1.5 font-semibold text-[#0f172a] print:text-black">{row.name}</td>
                      <td className="py-2.5 px-3 print:py-0.5 print:px-1.5 font-mono text-[#64748b] print:text-black">{row.studentId}</td>
                      <td className="py-2.5 px-3 print:py-0.5 print:px-1.5 text-center font-bold text-[#15803d] print:text-black">{row.present}</td>
                      <td className="py-2.5 px-3 print:py-0.5 print:px-1.5 text-center font-bold text-[#d97706] print:text-black">{row.late}</td>
                      <td className="py-2.5 px-3 print:py-0.5 print:px-1.5 text-center font-bold text-[#b91c1c] print:text-black">{row.absent}</td>
                      <td className="py-2.5 px-3 print:py-0.5 print:px-1.5 text-center font-medium text-[#0f172a] print:text-black">
                        {row.totalAttended} / {sessions.length}
                      </td>
                      <td className="py-2.5 px-3 print:py-0.5 print:px-1.5 text-center font-bold text-[#005a36] print:text-black">{row.rate}%</td>
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

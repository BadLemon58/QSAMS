import * as XLSX from 'xlsx'

/**
 * Cleanly exports the full class attendance summary report to a styled Excel (.xlsx) workbook.
 */
export function exportAttendanceReportToExcel({
  classInfo,
  teacherName,
  reportData = [],
  sessions = [],
  overallStats = {},
  rawLogs = []
}) {
  const wb = XLSX.utils.book_new()

  // ══════════════════════════════════════════════════════════════
  // SHEET 1: ATTENDANCE SUMMARY
  // ══════════════════════════════════════════════════════════════
  const formattedDate = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })

  const summaryRows = [
    ['NOTRE DAME OF MIDSAYAP COLLEGE'],
    ['QR Code-Based Student Attendance Monitoring System (QSAMS)'],
    ['OFFICIAL CLASS ATTENDANCE SUMMARY REPORT'],
    [],
    ['Class Name:', classInfo?.name || 'Class', '', 'Report Date:', formattedDate],
    ['Teacher / Instructor:', teacherName || 'Authorized Faculty', '', 'Schedule / Room:', `${classInfo?.schedule || 'N/A'} ${classInfo?.room ? `(${classInfo.room})` : ''}`],
    ['Total Enrolled:', overallStats.totalStudents ?? reportData.length, '', 'Total Sessions:', sessions.length],
    ['Overall Attendance Rate:', `${overallStats.averageRate ?? 0}%`],
    [],
    [
      '#',
      'Student Name',
      'Student ID',
      'Present',
      'Late',
      'Absent',
      'Excused',
      'Total Attended',
      'Total Sessions',
      'Attendance Rate',
      'Performance Remarks'
    ],
  ]

  reportData.forEach((st, idx) => {
    let remarks = 'Good Standing'
    if (st.rate >= 90) remarks = 'Outstanding (≥90%)'
    else if (st.rate >= 80) remarks = 'Good (80-89%)'
    else if (st.rate >= 60) remarks = 'Needs Improvement (60-79%)'
    else remarks = 'Critical / Low Attendance (<60%)'

    summaryRows.push([
      idx + 1,
      st.name,
      st.studentId || '—',
      st.present,
      st.late,
      st.absent,
      st.excused,
      st.totalAttended,
      sessions.length,
      `${st.rate}%`,
      remarks,
    ])
  })

  // Class Totals / Footer
  summaryRows.push([])
  summaryRows.push([
    'CLASS TOTALS / AVERAGE',
    '',
    '',
    overallStats.totalPresents ?? reportData.reduce((a, b) => a + b.present, 0),
    overallStats.totalLates ?? reportData.reduce((a, b) => a + b.late, 0),
    overallStats.totalAbsents ?? reportData.reduce((a, b) => a + b.absent, 0),
    reportData.reduce((a, b) => a + b.excused, 0),
    (overallStats.totalPresents ?? 0) + (overallStats.totalLates ?? 0),
    sessions.length * reportData.length,
    `${overallStats.averageRate ?? 0}%`,
    (overallStats.averageRate ?? 0) >= 75 ? 'Satisfactory Class Rate' : 'Low Class Rate Warning',
  ])

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows)

  // Professional column widths
  wsSummary['!cols'] = [
    { wch: 6 },   // #
    { wch: 30 },  // Student Name
    { wch: 18 },  // Student ID
    { wch: 10 },  // Present
    { wch: 10 },  // Late
    { wch: 10 },  // Absent
    { wch: 10 },  // Excused
    { wch: 15 },  // Total Attended
    { wch: 14 },  // Total Sessions
    { wch: 18 },  // Attendance Rate
    { wch: 28 },  // Performance Remarks
  ]

  XLSX.utils.book_append_sheet(wb, wsSummary, 'Attendance Summary')

  // ══════════════════════════════════════════════════════════════
  // SHEET 2: SESSION-BY-SESSION MATRIX (Date Breakdown)
  // ══════════════════════════════════════════════════════════════
  if (sessions.length > 0 && reportData.length > 0) {
    const sessionDates = sessions.map(s =>
      new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    )

    const matrixRows = [
      ['NOTRE DAME OF MIDSAYAP COLLEGE - QSAMS'],
      [`DAILY SESSION BREAKDOWN: ${classInfo?.name || 'Class'}`],
      [],
      ['Legend:', 'P = Present', 'L = Late', 'A = Absent', 'E = Excused'],
      [],
      ['#', 'Student Name', 'Student ID', ...sessionDates, 'Total Present', 'Rate (%)'],
    ]

    reportData.forEach((st, idx) => {
      const studentLogs = rawLogs.filter(l => l.student_id === st.id)
      const sessionStatuses = sessions.map(sess => {
        const log = studentLogs.find(l => l.session_id === sess.id)
        if (!log) return 'A'
        if (log.status === 'present') return 'P'
        if (log.status === 'late') return 'L'
        if (log.status === 'absent') return 'A'
        if (log.status === 'excused') return 'E'
        return 'A'
      })

      matrixRows.push([
        idx + 1,
        st.name,
        st.studentId || '—',
        ...sessionStatuses,
        st.totalAttended,
        `${st.rate}%`,
      ])
    })

    const wsMatrix = XLSX.utils.aoa_to_sheet(matrixRows)

    // Dynamic column widths for matrix
    const matrixCols = [
      { wch: 6 },
      { wch: 28 },
      { wch: 16 },
      ...sessions.map(() => ({ wch: 14 })),
      { wch: 14 },
      { wch: 12 },
    ]
    wsMatrix['!cols'] = matrixCols

    XLSX.utils.book_append_sheet(wb, wsMatrix, 'Daily Breakdown')
  }

  // Generate clean filename and save
  const cleanClassName = (classInfo?.name || 'Class').replace(/[^a-zA-Z0-9_-]/g, '_')
  const dateStr = new Date().toISOString().slice(0, 10)
  const fileName = `QSAMS_${cleanClassName}_Attendance_Report_${dateStr}.xlsx`

  XLSX.writeFile(wb, fileName)
}

/**
 * Cleanly exports a single live/active attendance session to a styled Excel (.xlsx) workbook.
 */
export function exportSingleSessionToExcel({
  classInfo,
  session,
  roster = [],
  teacherName,
}) {
  const wb = XLSX.utils.book_new()

  const sessionDateFormatted = session?.date
    ? new Date(session.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    : new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  const presentCount = roster.filter(s => s.status === 'present').length
  const lateCount = roster.filter(s => s.status === 'late').length
  const absentCount = roster.filter(s => !s.status || s.status === 'absent').length
  const totalCount = roster.length
  const attendanceRate = totalCount > 0 ? Math.round(((presentCount + lateCount) / totalCount) * 100) : 0

  const rows = [
    ['NOTRE DAME OF MIDSAYAP COLLEGE'],
    ['QR Code-Based Student Attendance Monitoring System (QSAMS)'],
    ['SESSION ATTENDANCE LOG'],
    [],
    ['Class Name:', classInfo?.name || 'Class', '', 'Session Date:', sessionDateFormatted],
    ['Teacher / Faculty:', teacherName || 'Authorized Teacher', '', 'Schedule / Room:', `${classInfo?.schedule || 'N/A'} ${classInfo?.room ? `(${classInfo.room})` : ''}`],
    ['Total Enrolled:', totalCount, '', 'Present:', presentCount],
    ['Late:', lateCount, '', 'Absent / Unmarked:', absentCount],
    ['Session Attendance Rate:', `${attendanceRate}%`],
    [],
    ['#', 'Student Name', 'Student ID', 'Attendance Status', 'Method Recorded', 'Time Logged'],
  ]

  roster.forEach((s, idx) => {
    let statusLabel = 'Absent / Unmarked'
    if (s.status === 'present') statusLabel = 'Present'
    else if (s.status === 'late') statusLabel = 'Late'
    else if (s.status === 'absent') statusLabel = 'Absent'
    else if (s.status === 'excused') statusLabel = 'Excused'

    rows.push([
      idx + 1,
      s.full_name || 'Unknown Student',
      s.student_id || '—',
      statusLabel,
      s.method ? s.method.replace('_', ' ').toUpperCase() : (s.status ? 'MANUAL' : '—'),
      s.marked_at ? new Date(s.marked_at).toLocaleTimeString() : (s.status ? new Date().toLocaleTimeString() : '—'),
    ])
  })

  // Summary Row
  rows.push([])
  rows.push([
    'SUMMARY',
    `Total: ${totalCount} Students`,
    '',
    `Attended: ${presentCount + lateCount} / ${totalCount} (${attendanceRate}%)`,
    '',
    `Exported: ${new Date().toLocaleTimeString()}`,
  ])

  const ws = XLSX.utils.aoa_to_sheet(rows)

  ws['!cols'] = [
    { wch: 6 },   // #
    { wch: 30 },  // Student Name
    { wch: 18 },  // Student ID
    { wch: 18 },  // Attendance Status
    { wch: 20 },  // Method Recorded
    { wch: 18 },  // Time Logged
  ]

  XLSX.utils.book_append_sheet(wb, ws, 'Session Log')

  const cleanClassName = (classInfo?.name || 'Class').replace(/[^a-zA-Z0-9_-]/g, '_')
  const dateStr = session?.date || new Date().toISOString().slice(0, 10)
  const fileName = `QSAMS_${cleanClassName}_Session_${dateStr}.xlsx`

  XLSX.writeFile(wb, fileName)
}

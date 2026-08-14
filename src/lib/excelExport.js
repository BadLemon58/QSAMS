import ExcelJS from 'exceljs'

// ── Color Palettes for Excel Styling ────────────────────────
const COLORS = {
  headerBg: '1E1B4B',      // Dark Indigo
  headerText: 'FFFFFF',    // White
  subHeaderBg: '312E81',   // Indigo 900
  cardBg: 'F8FAFC',        // Slate 50
  cardBorder: 'CBD5E1',    // Slate 300
  tableHeaderBg: '1E293B', // Slate 800
  tableHeaderText: 'FFFFFF',
  
  // Status Colors (Background / Text)
  presentBg: 'DCFCE7',     // Soft Emerald
  presentText: '15803D',   // Dark Green
  lateBg: 'FEF9C3',        // Soft Yellow
  lateText: 'A16207',      // Dark Amber
  absentBg: 'FEE2E2',      // Soft Red
  absentText: 'B91C1C',    // Dark Red
  excusedBg: 'E0E7FF',     // Soft Indigo
  excusedText: '3730A3',   // Dark Indigo
  
  // Rate Color Scales
  rateHighBg: 'D1FAE5',
  rateHighText: '065F46',
  rateMedBg: 'FEF3C7',
  rateMedText: '92400E',
  rateLowBg: 'FEE2E2',
  rateLowText: '991B1B',
  
  // Grid / Row
  zebraBg: 'F8FAFC',
  borderColor: 'E2E8F0',
  summaryBg: 'EEF2F6',
}

const thinBorder = {
  top: { style: 'thin', color: { argb: COLORS.borderColor } },
  left: { style: 'thin', color: { argb: COLORS.borderColor } },
  bottom: { style: 'thin', color: { argb: COLORS.borderColor } },
  right: { style: 'thin', color: { argb: COLORS.borderColor } },
}

const doubleBottomBorder = {
  top: { style: 'thin', color: { argb: '94A3B8' } },
  left: { style: 'thin', color: { argb: COLORS.borderColor } },
  bottom: { style: 'double', color: { argb: '1E293B' } },
  right: { style: 'thin', color: { argb: COLORS.borderColor } },
}

/**
 * Automatically computes and sets column widths based on cell contents
 * so teachers never have to double-click column dividers in Excel.
 */
function autoFitColumns(ws, { startRow = 10, minWidths = {}, padding = 4 } = {}) {
  ws.columns.forEach((column) => {
    let maxLen = 0
    const colNum = column.number

    column.eachCell({ includeEmpty: false }, (cell, rowNumber) => {
      // Only measure from the table header downwards to avoid merged title banners
      if (rowNumber < startRow) return
      // Skip merged total summary cells
      if (cell.isMerged && cell.address !== cell.master.address) return

      const val = cell.value
      if (val === null || val === undefined) return

      let text = ''
      if (typeof val === 'object') {
        text = val.result !== undefined ? String(val.result) : (val.text || '')
      } else {
        text = String(val)
      }

      // Check line lengths
      text.split('\n').forEach(line => {
        if (line.length > maxLen) {
          maxLen = line.length
        }
      })
    })

    const minW = minWidths[colNum] || 10
    column.width = Math.max(maxLen + padding, minW)
  })
}

/**
 * Cleanly exports the class attendance report to a styled Excel (.xlsx) workbook.
 */
export async function exportAttendanceReportToExcel({
  classInfo,
  teacherName,
  reportData = [],
  sessions = [],
  overallStats = {},
  rawLogs = [],
}) {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'QSAMS - Notre Dame of Midsayap College'
  wb.created = new Date()

  // ══════════════════════════════════════════════════════════════
  // SHEET 1: ATTENDANCE SUMMARY
  // ══════════════════════════════════════════════════════════════
  const ws1 = wb.addWorksheet('Attendance Summary', {
    views: [{ showGridLines: true }],
  })

  // 1. Title Banner
  ws1.mergeCells('A1:K1')
  const title1 = ws1.getCell('A1')
  title1.value = 'NOTRE DAME OF MIDSAYAP COLLEGE'
  title1.font = { name: 'Arial', size: 14, bold: true, color: { argb: COLORS.headerText } }
  title1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerBg } }
  title1.alignment = { horizontal: 'center', vertical: 'middle' }
  ws1.getRow(1).height = 28

  ws1.mergeCells('A2:K2')
  const title2 = ws1.getCell('A2')
  title2.value = 'QR Code-Based Student Attendance Monitoring System (QSAMS)'
  title2.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'C7D2FE' } }
  title2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerBg } }
  title2.alignment = { horizontal: 'center', vertical: 'middle' }
  ws1.getRow(2).height = 20

  ws1.mergeCells('A3:K3')
  const title3 = ws1.getCell('A3')
  title3.value = 'OFFICIAL CLASS ATTENDANCE SUMMARY REPORT'
  title3.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'E0E7FF' } }
  title3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.subHeaderBg } }
  title3.alignment = { horizontal: 'center', vertical: 'middle' }
  ws1.getRow(3).height = 20

  // 2. Metadata Block (Rows 5-8)
  const metaRows = [
    ['Class Name:', classInfo?.name || 'Class', '', 'Report Date:', new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })],
    ['Teacher / Instructor:', teacherName || 'Authorized Faculty', '', 'Schedule / Room:', `${classInfo?.schedule || 'N/A'} ${classInfo?.room ? `(${classInfo.room})` : ''}`],
    ['Total Enrolled Students:', overallStats.totalStudents ?? reportData.length, '', 'Total Sessions Recorded:', sessions.length],
    ['Class Overall Attendance Rate:', `${overallStats.averageRate ?? 0}%`, '', 'Generated By:', 'QSAMS Portal'],
  ]

  metaRows.forEach((r, idx) => {
    const rowNum = 5 + idx
    const row = ws1.getRow(rowNum)
    row.values = r
    row.height = 19
    row.font = { name: 'Arial', size: 9.5 }

    // Style Key (Col A & Col D)
    const key1 = ws1.getCell(`A${rowNum}`)
    key1.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: '475569' } }
    
    const val1 = ws1.getCell(`B${rowNum}`)
    val1.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: '0F172A' } }

    const key2 = ws1.getCell(`D${rowNum}`)
    key2.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: '475569' } }

    const val2 = ws1.getCell(`E${rowNum}`)
    val2.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: '0F172A' } }
  })

  // 3. Table Header Row (Row 10)
  const headers1 = [
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
    'Performance Remarks',
  ]

  const headerRow1 = ws1.getRow(10)
  headerRow1.values = headers1
  headerRow1.height = 26

  headers1.forEach((_, cIdx) => {
    const cell = headerRow1.getCell(cIdx + 1)
    cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: COLORS.tableHeaderText } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.tableHeaderBg } }
    cell.alignment = { horizontal: cIdx === 1 ? 'left' : 'center', vertical: 'middle' }
    cell.border = thinBorder
  })

  // 4. Data Rows
  reportData.forEach((st, idx) => {
    const rowNum = 11 + idx
    const row = ws1.getRow(rowNum)
    row.height = 22

    let remarks = 'Good Standing'
    let rateBg = COLORS.rateHighBg
    let rateText = COLORS.rateHighText

    if (st.rate >= 90) {
      remarks = 'Outstanding (≥90%)'
      rateBg = COLORS.rateHighBg
      rateText = COLORS.rateHighText
    } else if (st.rate >= 80) {
      remarks = 'Good (80-89%)'
      rateBg = COLORS.rateHighBg
      rateText = COLORS.rateHighText
    } else if (st.rate >= 60) {
      remarks = 'Needs Improvement'
      rateBg = COLORS.rateMedBg
      rateText = COLORS.rateMedText
    } else {
      remarks = 'Critical / Low Attendance'
      rateBg = COLORS.rateLowBg
      rateText = COLORS.rateLowText
    }

    row.values = [
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
    ]

    const isZebra = idx % 2 === 1
    const defaultRowBg = isZebra ? COLORS.zebraBg : 'FFFFFF'

    for (let c = 1; c <= 11; c++) {
      const cell = row.getCell(c)
      cell.font = { name: 'Arial', size: 9 }
      cell.border = thinBorder
      cell.alignment = { vertical: 'middle', horizontal: c === 2 ? 'left' : 'center' }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: defaultRowBg } }

      // Status color highlights
      if (c === 4 && st.present > 0) { // Present
        cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: COLORS.presentText } }
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.presentBg } }
      } else if (c === 5 && st.late > 0) { // Late
        cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: COLORS.lateText } }
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.lateBg } }
      } else if (c === 6 && st.absent > 0) { // Absent
        cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: COLORS.absentText } }
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.absentBg } }
      } else if (c === 7 && st.excused > 0) { // Excused
        cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: COLORS.excusedText } }
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.excusedBg } }
      } else if (c === 10) { // Rate
        cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: rateText } }
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rateBg } }
      } else if (c === 11) { // Remarks
        cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: rateText } }
      }
    }
  })

  // 5. Totals / Average Row
  const totalRowNum = 11 + reportData.length + 1
  const totalRow = ws1.getRow(totalRowNum)
  totalRow.height = 24

  totalRow.values = [
    'TOTALS / CLASS AVERAGE',
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
  ]

  ws1.mergeCells(`A${totalRowNum}:C${totalRowNum}`)

  for (let c = 1; c <= 11; c++) {
    const cell = totalRow.getCell(c)
    cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: '0F172A' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.summaryBg } }
    cell.border = doubleBottomBorder
    cell.alignment = { vertical: 'middle', horizontal: c === 1 ? 'left' : 'center' }
  }

  // Auto-fit column widths based on contents
  autoFitColumns(ws1, {
    startRow: 10,
    padding: 4,
    minWidths: {
      1: 6,   // #
      2: 26,  // Student Name
      3: 16,  // Student ID
      4: 11,  // Present
      5: 10,  // Late
      6: 11,  // Absent
      7: 11,  // Excused
      8: 16,  // Total Attended
      9: 16,  // Total Sessions
      10: 18, // Attendance Rate
      11: 28, // Performance Remarks
    },
  })

  // ══════════════════════════════════════════════════════════════
  // SHEET 2: DAILY BREAKDOWN MATRIX
  // ══════════════════════════════════════════════════════════════
  if (sessions.length > 0 && reportData.length > 0) {
    const ws2 = wb.addWorksheet('Daily Breakdown', {
      views: [{ showGridLines: true }],
    })

    const totalCols = 3 + sessions.length + 2

    // Title
    ws2.mergeCells(1, 1, 1, totalCols)
    const t1 = ws2.getCell(1, 1)
    t1.value = 'NOTRE DAME OF MIDSAYAP COLLEGE - QSAMS'
    t1.font = { name: 'Arial', size: 12, bold: true, color: { argb: COLORS.headerText } }
    t1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerBg } }
    t1.alignment = { horizontal: 'center', vertical: 'middle' }
    ws2.getRow(1).height = 24

    ws2.mergeCells(2, 1, 2, totalCols)
    const t2 = ws2.getCell(2, 1)
    t2.value = `DAILY ATTENDANCE RECORD MATRIX: ${classInfo?.name || 'Class'}`
    t2.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'E0E7FF' } }
    t2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.subHeaderBg } }
    t2.alignment = { horizontal: 'center', vertical: 'middle' }
    ws2.getRow(2).height = 20

    // Legend Row (Row 4)
    ws2.getRow(4).values = ['Legend:', 'P = Present (Green)', 'L = Late (Yellow)', 'A = Absent (Red)', 'E = Excused (Blue)']
    ws2.getRow(4).font = { name: 'Arial', size: 9, italic: true }

    // Headers (Row 6)
    const sessionDates = sessions.map(s =>
      new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })
    )
    const matrixHeaders = ['#', 'Student Name', 'Student ID', ...sessionDates, 'Attended', 'Rate']
    const mHeaderRow = ws2.getRow(6)
    mHeaderRow.values = matrixHeaders
    mHeaderRow.height = 24

    matrixHeaders.forEach((_, idx) => {
      const cell = mHeaderRow.getCell(idx + 1)
      cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: COLORS.tableHeaderText } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.tableHeaderBg } }
      cell.alignment = { horizontal: idx === 1 ? 'left' : 'center', vertical: 'middle' }
      cell.border = thinBorder
    })

    // Matrix Data Rows
    reportData.forEach((st, idx) => {
      const rowNum = 7 + idx
      const row = ws2.getRow(rowNum)
      row.height = 20

      const studentLogs = rawLogs.filter(l => l.student_id === st.id)
      const sessionCodes = sessions.map(sess => {
        const log = studentLogs.find(l => l.session_id === sess.id)
        if (!log) return 'A'
        if (log.status === 'present') return 'P'
        if (log.status === 'late') return 'L'
        if (log.status === 'absent') return 'A'
        if (log.status === 'excused') return 'E'
        return 'A'
      })

      row.values = [
        idx + 1,
        st.name,
        st.studentId || '—',
        ...sessionCodes,
        `${st.totalAttended}/${sessions.length}`,
        `${st.rate}%`,
      ]

      const isZebra = idx % 2 === 1
      const defaultBg = isZebra ? COLORS.zebraBg : 'FFFFFF'

      for (let c = 1; c <= totalCols; c++) {
        const cell = row.getCell(c)
        cell.font = { name: 'Arial', size: 9 }
        cell.border = thinBorder
        cell.alignment = { vertical: 'middle', horizontal: c === 2 ? 'left' : 'center' }
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: defaultBg } }

        // Color coding for session matrix cells (Columns 4 to 3 + sessions.length)
        if (c >= 4 && c < 4 + sessions.length) {
          const val = cell.value
          if (val === 'P') {
            cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: COLORS.presentText } }
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.presentBg } }
          } else if (val === 'L') {
            cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: COLORS.lateText } }
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.lateBg } }
          } else if (val === 'A') {
            cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: COLORS.absentText } }
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.absentBg } }
          } else if (val === 'E') {
            cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: COLORS.excusedText } }
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.excusedBg } }
          }
        } else if (c === totalCols) {
          cell.font = { name: 'Arial', size: 9, bold: true }
        }
      }
    })

    // Auto-fit matrix columns
    const dynamicMinWidths = {
      1: 6,
      2: 26,
      3: 16,
    }
    sessions.forEach((_, sIdx) => {
      dynamicMinWidths[4 + sIdx] = 14
    })
    dynamicMinWidths[totalCols - 1] = 14
    dynamicMinWidths[totalCols] = 12

    autoFitColumns(ws2, {
      startRow: 6,
      padding: 4,
      minWidths: dynamicMinWidths,
    })
  }

  // Trigger Download
  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `QSAMS_${(classInfo?.name || 'Class').replace(/[^a-zA-Z0-9_-]/g, '_')}_Attendance_Report_${new Date().toISOString().slice(0, 10)}.xlsx`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Cleanly exports a single live/active attendance session to a styled Excel (.xlsx) workbook.
 */
export async function exportSingleSessionToExcel({
  classInfo,
  session,
  roster = [],
  teacherName,
}) {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'QSAMS - Notre Dame of Midsayap College'
  wb.created = new Date()

  const ws = wb.addWorksheet('Session Log', {
    views: [{ showGridLines: true }],
  })

  // 1. Title Banner
  ws.mergeCells('A1:F1')
  const title1 = ws.getCell('A1')
  title1.value = 'NOTRE DAME OF MIDSAYAP COLLEGE'
  title1.font = { name: 'Arial', size: 14, bold: true, color: { argb: COLORS.headerText } }
  title1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerBg } }
  title1.alignment = { horizontal: 'center', vertical: 'middle' }
  ws.getRow(1).height = 28

  ws.mergeCells('A2:F2')
  const title2 = ws.getCell('A2')
  title2.value = 'SESSION ATTENDANCE LOG'
  title2.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'E0E7FF' } }
  title2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.subHeaderBg } }
  title2.alignment = { horizontal: 'center', vertical: 'middle' }
  ws.getRow(2).height = 20

  const sessionDateFormatted = session?.date
    ? new Date(session.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    : new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  const presentCount = roster.filter(s => s.status === 'present').length
  const lateCount = roster.filter(s => s.status === 'late').length
  const absentCount = roster.filter(s => !s.status || s.status === 'absent').length
  const totalCount = roster.length
  const attendanceRate = totalCount > 0 ? Math.round(((presentCount + lateCount) / totalCount) * 100) : 0

  // 2. Metadata Block (Rows 4-7)
  const metaRows = [
    ['Class Name:', classInfo?.name || 'Class', '', 'Session Date:', sessionDateFormatted],
    ['Teacher / Faculty:', teacherName || 'Authorized Teacher', '', 'Schedule / Room:', `${classInfo?.schedule || 'N/A'} ${classInfo?.room ? `(${classInfo.room})` : ''}`],
    ['Total Enrolled:', totalCount, '', 'Present / Late:', `${presentCount} Present • ${lateCount} Late`],
    ['Session Attendance Rate:', `${attendanceRate}%`, '', 'Absent / Unmarked:', absentCount],
  ]

  metaRows.forEach((r, idx) => {
    const rowNum = 4 + idx
    const row = ws.getRow(rowNum)
    row.values = r
    row.height = 19

    const key1 = ws.getCell(`A${rowNum}`)
    key1.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: '475569' } }
    
    const val1 = ws.getCell(`B${rowNum}`)
    val1.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: '0F172A' } }

    const key2 = ws.getCell(`D${rowNum}`)
    key2.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: '475569' } }

    const val2 = ws.getCell(`E${rowNum}`)
    val2.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: '0F172A' } }
  })

  // 3. Table Headers (Row 9)
  const headers = ['#', 'Student Name', 'Student ID', 'Attendance Status', 'Method Recorded', 'Time Logged']
  const headerRow = ws.getRow(9)
  headerRow.values = headers
  headerRow.height = 24

  headers.forEach((_, cIdx) => {
    const cell = headerRow.getCell(cIdx + 1)
    cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: COLORS.tableHeaderText } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.tableHeaderBg } }
    cell.alignment = { horizontal: cIdx === 1 ? 'left' : 'center', vertical: 'middle' }
    cell.border = thinBorder
  })

  // 4. Data Rows
  roster.forEach((s, idx) => {
    const rowNum = 10 + idx
    const row = ws.getRow(rowNum)
    row.height = 22

    let statusLabel = 'Absent / Unmarked'
    let statusBg = COLORS.absentBg
    let statusText = COLORS.absentText

    if (s.status === 'present') {
      statusLabel = 'Present'
      statusBg = COLORS.presentBg
      statusText = COLORS.presentText
    } else if (s.status === 'late') {
      statusLabel = 'Late'
      statusBg = COLORS.lateBg
      statusText = COLORS.lateText
    } else if (s.status === 'absent') {
      statusLabel = 'Absent'
      statusBg = COLORS.absentBg
      statusText = COLORS.absentText
    } else if (s.status === 'excused') {
      statusLabel = 'Excused'
      statusBg = COLORS.excusedBg
      statusText = COLORS.excusedText
    }

    row.values = [
      idx + 1,
      s.full_name || 'Unknown Student',
      s.student_id || '—',
      statusLabel,
      s.method ? s.method.replace('_', ' ').toUpperCase() : (s.status ? 'MANUAL' : '—'),
      s.marked_at ? new Date(s.marked_at).toLocaleTimeString() : (s.status ? new Date().toLocaleTimeString() : '—'),
    ]

    const isZebra = idx % 2 === 1
    const defaultBg = isZebra ? COLORS.zebraBg : 'FFFFFF'

    for (let c = 1; c <= 6; c++) {
      const cell = row.getCell(c)
      cell.font = { name: 'Arial', size: 9 }
      cell.border = thinBorder
      cell.alignment = { vertical: 'middle', horizontal: c === 2 ? 'left' : 'center' }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: defaultBg } }

      if (c === 4) {
        cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: statusText } }
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: statusBg } }
      }
    }
  })

  // 5. Summary Footer Row
  const totalRowNum = 10 + roster.length + 1
  const totalRow = ws.getRow(totalRowNum)
  totalRow.height = 24

  totalRow.values = [
    'SESSION SUMMARY',
    `Total: ${totalCount} Students`,
    '',
    `Attended: ${presentCount + lateCount} / ${totalCount} (${attendanceRate}%)`,
    '',
    `Exported: ${new Date().toLocaleTimeString()}`,
  ]

  for (let c = 1; c <= 6; c++) {
    const cell = totalRow.getCell(c)
    cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: '0F172A' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.summaryBg } }
    cell.border = doubleBottomBorder
    cell.alignment = { vertical: 'middle', horizontal: c === 1 ? 'left' : 'center' }
  }

  // Auto-fit columns for session log
  autoFitColumns(ws, {
    startRow: 9,
    padding: 4,
    minWidths: {
      1: 6,
      2: 26,
      3: 16,
      4: 20,
      5: 20,
      6: 18,
    },
  })

  // Trigger Download
  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `QSAMS_${(classInfo?.name || 'Class').replace(/[^a-zA-Z0-9_-]/g, '_')}_Session_${session?.date || new Date().toISOString().slice(0, 10)}.xlsx`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

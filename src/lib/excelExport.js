import ExcelJS from 'exceljs'

// ── Color Palettes for Excel Styling (NDMC Forest Green & White Theme) ───────
const COLORS = {
  bannerBg: '005A36',        // NDMC Forest Green Banner
  bannerText: 'FFFFFF',      // White
  
  pillLabelBg: 'E6F2EC',     // Soft Mint Sage pill label
  pillLabelText: '005A36',   // Forest Green text
  pillValueBg: '005A36',     // Forest Green pill value
  pillValueText: 'FFFFFF',   // White text
  
  tableHeaderBg: '005A36',   // Forest Green Header
  tableHeaderText: 'FFFFFF', // White text
  
  dateHeaderBg: 'E6F2EC',    // Soft Mint Sage date header
  dateHeaderText: '005A36',  // Forest Green
  
  presentHeaderBg: '15803D', // Emerald Green
  lateHeaderBg: 'D97706',    // Amber
  absentHeaderBg: 'B91C1C',  // Crimson Red
  rateHeaderBg: '005A36',    // Forest Green
  
  // Status Colors (Background / Text)
  presentBg: 'DCFCE7',       // Soft Emerald Green
  presentText: '15803D',     // Dark Emerald Green
  
  lateBg: 'FEF9C3',          // Soft Yellow
  lateText: 'A16207',        // Dark Amber
  
  absentBg: 'FEE2E2',        // Soft Red
  absentText: 'B91C1C',      // Dark Red
  
  excusedBg: 'E6F2EC',       // Soft Mint
  excusedText: '005A36',     // Forest Green
  
  // Grid / Row
  zebraBg: 'F8FAF9',         // Subtle Mint / Off-White
  borderColor: 'D1E7DD',     // Clean Sage Border
  borderDark: '005A36',      // Forest Green
  summaryBg: 'E6F2EC',       // Soft Sage Mint Summary
  summaryText: '005A36',     // Forest Green
}

const thinBorder = {
  top: { style: 'thin', color: { argb: COLORS.borderColor } },
  left: { style: 'thin', color: { argb: COLORS.borderColor } },
  bottom: { style: 'thin', color: { argb: COLORS.borderColor } },
  right: { style: 'thin', color: { argb: COLORS.borderColor } },
}

const headerBorder = {
  top: { style: 'medium', color: { argb: COLORS.tableHeaderBg } },
  left: { style: 'thin', color: { argb: 'FFFFFF' } },
  bottom: { style: 'medium', color: { argb: COLORS.tableHeaderBg } },
  right: { style: 'thin', color: { argb: 'FFFFFF' } },
}

const doubleBottomBorder = {
  top: { style: 'thin', color: { argb: '94A3B8' } },
  left: { style: 'thin', color: { argb: COLORS.borderColor } },
  bottom: { style: 'double', color: { argb: COLORS.borderDark } },
  right: { style: 'thin', color: { argb: COLORS.borderColor } },
}

/**
 * Automatically computes and sets column widths based on cell contents
 */
function autoFitColumns(ws, { startRow = 6, minWidths = {}, padding = 3 } = {}) {
  ws.columns.forEach((column) => {
    let maxLen = 0
    const colNum = column.number

    column.eachCell({ includeEmpty: false }, (cell, rowNumber) => {
      if (rowNumber < startRow) return
      if (cell.isMerged && cell.address !== cell.master.address) return

      const val = cell.value
      if (val === null || val === undefined) return

      let text = ''
      if (typeof val === 'object') {
        text = val.result !== undefined ? String(val.result) : (val.text || '')
      } else {
        text = String(val)
      }

      text.split('\n').forEach(line => {
        if (line.length > maxLen) {
          maxLen = line.length
        }
      })
    })

    const minW = minWidths[colNum] || 8
    column.width = Math.max(maxLen + padding, minW)
  })
}

/**
 * Cleanly exports the class attendance record to a styled Excel (.xlsx) workbook
 * using the NDMC Forest Green and White institutional theme.
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

  // Ensure sessions are chronologically ordered (Day 1, Day 2, Day 3...)
  const sortedSessions = [...sessions].sort((a, b) => new Date(a.date) - new Date(b.date))

  // Determine Month & Year
  const refDate = sortedSessions.length > 0 ? new Date(sortedSessions[sortedSessions.length - 1].date) : new Date()
  const monthName = refDate.toLocaleDateString('en-US', { month: 'long' })
  const yearNum = refDate.getFullYear()

  // Total columns = Student ID (1) + Student Name (2) + Date columns (sortedSessions.length) + Present Count (1) + Late (1) + Absent (1) + Rate (1)
  const dateColCount = Math.max(sortedSessions.length, 1)
  const totalCols = 2 + dateColCount + 4

  // ══════════════════════════════════════════════════════════════
  // SHEET 1: ATTENDANCE SHEET (Class Record Grid in Forest Green & White)
  // ══════════════════════════════════════════════════════════════
  const ws1 = wb.addWorksheet('Attendance Sheet', {
    views: [{ showGridLines: true }],
  })

  // ── 1. Top Title Banner (Row 1) ──────────────────────────────
  ws1.mergeCells(1, 1, 1, totalCols)
  const titleBanner = ws1.getCell(1, 1)
  titleBanner.value = `Attendance Sheet for ${monthName} - ${yearNum}`
  titleBanner.font = { name: 'Calibri', size: 16, bold: true, color: { argb: COLORS.bannerText } }
  titleBanner.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.bannerBg } }
  titleBanner.alignment = { horizontal: 'center', vertical: 'middle' }
  ws1.getRow(1).height = 34

  // ── 2. Filter / Metadata Pills (Row 3, Left-Aligned within Header) ──
  // Pill 1: Month (Col A = Label, Col B = Value)
  const p1Label = ws1.getCell('A3')
  p1Label.value = 'Month'
  p1Label.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.pillLabelText } }
  p1Label.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.pillLabelBg } }
  p1Label.alignment = { horizontal: 'center', vertical: 'middle' }
  p1Label.border = thinBorder

  const p1Val = ws1.getCell('B3')
  p1Val.value = monthName
  p1Val.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.pillValueText } }
  p1Val.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.pillValueBg } }
  p1Val.alignment = { horizontal: 'center', vertical: 'middle' }
  p1Val.border = thinBorder

  // Pill 2: Year (Col C = Label, Col D = Value)
  if (totalCols >= 4) {
    const p2Label = ws1.getCell('C3')
    p2Label.value = 'Year'
    p2Label.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.pillLabelText } }
    p2Label.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.pillLabelBg } }
    p2Label.alignment = { horizontal: 'center', vertical: 'middle' }
    p2Label.border = thinBorder

    const p2Val = ws1.getCell('D3')
    p2Val.value = yearNum
    p2Val.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.pillValueText } }
    p2Val.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.pillValueBg } }
    p2Val.alignment = { horizontal: 'center', vertical: 'middle' }
    p2Val.border = thinBorder
  }

  // Pill 3: Class / Section (Col E = Label, Col F = Value or merged F:G)
  if (totalCols >= 6) {
    const p3Label = ws1.getCell('E3')
    p3Label.value = 'Class'
    p3Label.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.pillLabelText } }
    p3Label.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.pillLabelBg } }
    p3Label.alignment = { horizontal: 'center', vertical: 'middle' }
    p3Label.border = thinBorder

    if (totalCols >= 8) {
      ws1.mergeCells('F3:G3')
    }
    const p3Val = ws1.getCell('F3')
    p3Val.value = classInfo?.name || 'Class Section'
    p3Val.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.pillValueText } }
    p3Val.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.pillValueBg } }
    p3Val.alignment = { horizontal: 'center', vertical: 'middle' }
    p3Val.border = thinBorder
    if (totalCols >= 8) {
      ws1.getCell('G3').border = thinBorder
    }
  }

  // Pill 4: Teacher / Instructor (Col H:I if room allows)
  if (totalCols >= 10) {
    const p4Label = ws1.getCell('H3')
    p4Label.value = 'Teacher'
    p4Label.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.pillLabelText } }
    p4Label.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.pillLabelBg } }
    p4Label.alignment = { horizontal: 'center', vertical: 'middle' }
    p4Label.border = thinBorder

    if (totalCols >= 12) {
      ws1.mergeCells('I3:J3')
    }
    const p4Val = ws1.getCell('I3')
    p4Val.value = teacherName || 'Faculty'
    p4Val.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.pillValueText } }
    p4Val.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.pillValueBg } }
    p4Val.alignment = { horizontal: 'center', vertical: 'middle' }
    p4Val.border = thinBorder
    if (totalCols >= 12) {
      ws1.getCell('J3').border = thinBorder
    }
  }

  ws1.getRow(3).height = 22

  // ── 3. Table Header (Row 5) ──────────────────────────────────
  const dateHeaders = sortedSessions.map(s => {
    const d = new Date(s.date)
    return `${d.getDate()}-${d.toLocaleDateString('en-US', { month: 'short' })}`
  })
  if (dateHeaders.length === 0) dateHeaders.push('No Sessions')

  const headers = [
    'Student ID',
    'Student Name',
    ...dateHeaders,
    'Present Count',
    'Late Count',
    'Absent Count',
    'Rate (%)',
  ]

  const headerRow = ws1.getRow(5)
  headerRow.values = headers
  headerRow.height = 26

  const presentColIndex = 3 + dateHeaders.length
  const lateColIndex = presentColIndex + 1
  const absentColIndex = presentColIndex + 2
  const rateColIndex = presentColIndex + 3

  headers.forEach((h, idx) => {
    const colNum = idx + 1
    const cell = headerRow.getCell(colNum)
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFF' } }
    cell.alignment = { horizontal: colNum === 2 ? 'left' : 'center', vertical: 'middle' }
    cell.border = headerBorder

    if (colNum <= 2) {
      // Student ID / Name (Forest Green)
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.tableHeaderBg } }
    } else if (colNum === presentColIndex) {
      // Present Count (Emerald Green)
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.presentHeaderBg } }
    } else if (colNum === lateColIndex) {
      // Late Count (Amber)
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.lateHeaderBg } }
    } else if (colNum === absentColIndex) {
      // Absent Count (Crimson Red)
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.absentHeaderBg } }
    } else if (colNum === rateColIndex) {
      // Rate (Forest Green)
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.rateHeaderBg } }
    } else {
      // Date columns (Soft Mint Sage background with Forest Green text)
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.dateHeaderBg } }
      cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: COLORS.dateHeaderText } }
    }
  })

  // ── 4. Student Data Rows (Row 6 onwards) ─────────────────────
  reportData.forEach((st, idx) => {
    const rowNum = 6 + idx
    const row = ws1.getRow(rowNum)
    row.height = 22

    const studentLogs = rawLogs.filter(l => l.student_id === st.id)
    
    // Status per date column: ✔ for present, ⏱ for late, ✖ for absent, E for excused
    const sessionSymbols = sortedSessions.map(sess => {
      const log = studentLogs.find(l => l.session_id === sess.id)
      if (!log) return { symbol: '✖', status: 'absent' }
      if (log.status === 'present') return { symbol: '✔', status: 'present' }
      if (log.status === 'late') return { symbol: '⏱', status: 'late' }
      if (log.status === 'absent') return { symbol: '✖', status: 'absent' }
      if (log.status === 'excused') return { symbol: 'E', status: 'excused' }
      return { symbol: '✖', status: 'absent' }
    })

    if (sessionSymbols.length === 0) {
      sessionSymbols.push({ symbol: '—', status: 'none' })
    }

    row.values = [
      st.studentId || `1000${idx + 1}`,
      st.name,
      ...sessionSymbols.map(s => s.symbol),
      st.present,
      st.late,
      st.absent,
      `${st.rate}%`,
    ]

    const isZebra = idx % 2 === 1
    const defaultBg = isZebra ? COLORS.zebraBg : 'FFFFFF'

    for (let c = 1; c <= totalCols; c++) {
      const cell = row.getCell(c)
      cell.font = { name: 'Calibri', size: 10 }
      cell.border = thinBorder
      cell.alignment = { vertical: 'middle', horizontal: c === 2 ? 'left' : 'center' }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: defaultBg } }

      // Date Columns with styled Check / Cross icons
      if (c >= 3 && c < presentColIndex) {
        const item = sessionSymbols[c - 3]
        if (item) {
          if (item.status === 'present') {
            cell.font = { name: 'Segoe UI Symbol', size: 11, bold: true, color: { argb: COLORS.presentText } }
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.presentBg } }
          } else if (item.status === 'late') {
            cell.font = { name: 'Segoe UI Symbol', size: 10, bold: true, color: { argb: COLORS.lateText } }
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.lateBg } }
          } else if (item.status === 'absent') {
            cell.font = { name: 'Segoe UI Symbol', size: 11, bold: true, color: { argb: COLORS.absentText } }
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.absentBg } }
          } else if (item.status === 'excused') {
            cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.excusedText } }
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.excusedBg } }
          }
        }
      } else if (c === presentColIndex) {
        // Present Count
        cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.presentText } }
      } else if (c === lateColIndex) {
        // Late Count
        cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.lateText } }
      } else if (c === absentColIndex) {
        // Absent Count
        cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.absentText } }
      } else if (c === rateColIndex) {
        // Rate
        const rateVal = st.rate || 0
        const rateColor = rateVal >= 80 ? COLORS.presentText : rateVal >= 60 ? COLORS.lateText : COLORS.absentText
        cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: rateColor } }
      }
    }
  })

  // ── 5. Summary Footer Rows (Bottom of Sheet) ─────────────────
  const startSummaryRow = 6 + reportData.length + 1

  // Row A: Total Present per Date
  const totalPresRow = ws1.getRow(startSummaryRow)
  totalPresRow.height = 22
  ws1.mergeCells(startSummaryRow, 1, startSummaryRow, 2)
  const totalPresCell = ws1.getCell(startSummaryRow, 1)
  totalPresCell.value = 'TOTAL PRESENT / DAY'
  totalPresCell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: COLORS.presentText } }
  totalPresCell.alignment = { horizontal: 'right', vertical: 'middle' }

  for (let c = 1; c <= totalCols; c++) {
    const cell = totalPresRow.getCell(c)
    cell.border = thinBorder
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.presentBg } }
  }

  // Compute total present per date column
  sortedSessions.forEach((sess, sIdx) => {
    const colNum = 3 + sIdx
    const countPresent = rawLogs.filter(l => l.session_id === sess.id && (l.status === 'present' || l.status === 'late')).length
    const c = totalPresRow.getCell(colNum)
    c.value = countPresent
    c.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.presentText } }
    c.alignment = { horizontal: 'center', vertical: 'middle' }
  })

  const totalPresCount = reportData.reduce((a, b) => a + b.present, 0)
  const totalPresSummaryCell = totalPresRow.getCell(presentColIndex)
  totalPresSummaryCell.value = totalPresCount
  totalPresSummaryCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.presentText } }
  totalPresSummaryCell.alignment = { horizontal: 'center', vertical: 'middle' }

  // Row B: Total Absent per Date
  const totalAbsRow = ws1.getRow(startSummaryRow + 1)
  totalAbsRow.height = 22
  ws1.mergeCells(startSummaryRow + 1, 1, startSummaryRow + 1, 2)
  const totalAbsCell = ws1.getCell(startSummaryRow + 1, 1)
  totalAbsCell.value = 'TOTAL ABSENT / DAY'
  totalAbsCell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: COLORS.absentText } }
  totalAbsCell.alignment = { horizontal: 'right', vertical: 'middle' }

  for (let c = 1; c <= totalCols; c++) {
    const cell = totalAbsRow.getCell(c)
    cell.border = thinBorder
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.absentBg } }
  }

  sortedSessions.forEach((sess, sIdx) => {
    const colNum = 3 + sIdx
    const countPresent = rawLogs.filter(l => l.session_id === sess.id && (l.status === 'present' || l.status === 'late')).length
    const countAbsent = Math.max(reportData.length - countPresent, 0)
    const c = totalAbsRow.getCell(colNum)
    c.value = countAbsent
    c.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.absentText } }
    c.alignment = { horizontal: 'center', vertical: 'middle' }
  })

  const totalAbsCount = reportData.reduce((a, b) => a + b.absent, 0)
  const totalAbsSummaryCell = totalAbsRow.getCell(absentColIndex)
  totalAbsSummaryCell.value = totalAbsCount
  totalAbsSummaryCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.absentText } }
  totalAbsSummaryCell.alignment = { horizontal: 'center', vertical: 'middle' }

  // Row C: Class Average Attendance Rate
  const avgRow = ws1.getRow(startSummaryRow + 2)
  avgRow.height = 24
  ws1.mergeCells(startSummaryRow + 2, 1, startSummaryRow + 2, totalCols - 1)
  const avgCell = ws1.getCell(startSummaryRow + 2, 1)
  avgCell.value = 'CLASS AVERAGE ATTENDANCE'
  avgCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.summaryText } }
  avgCell.alignment = { horizontal: 'right', vertical: 'middle' }

  for (let c = 1; c <= totalCols; c++) {
    const cell = avgRow.getCell(c)
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.summaryBg } }
    cell.border = doubleBottomBorder
  }

  const rateAvgCell = avgRow.getCell(rateColIndex)
  rateAvgCell.value = `${overallStats.averageRate ?? 0}%`
  rateAvgCell.font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: COLORS.summaryText } }
  rateAvgCell.alignment = { horizontal: 'center', vertical: 'middle' }

  // Set clean column widths
  const dynamicMinWidths = {
    1: 14, // Student ID
    2: 24, // Student Name
  }
  sortedSessions.forEach((_, sIdx) => {
    dynamicMinWidths[3 + sIdx] = 10 // Date Column (e.g. 1-Jan)
  })
  dynamicMinWidths[presentColIndex] = 14
  dynamicMinWidths[lateColIndex] = 12
  dynamicMinWidths[absentColIndex] = 13
  dynamicMinWidths[rateColIndex] = 12

  autoFitColumns(ws1, {
    startRow: 5,
    padding: 3,
    minWidths: dynamicMinWidths,
  })

  // ══════════════════════════════════════════════════════════════
  // SHEET 2: INSTITUTIONAL SUMMARY & SIGN-OFF (NDMC Forest Green Theme)
  // ══════════════════════════════════════════════════════════════
  const ws2 = wb.addWorksheet('Summary & Sign-off', {
    views: [{ showGridLines: true }],
  })

  ws2.mergeCells('A1:G1')
  const sTitle = ws2.getCell('A1')
  sTitle.value = 'NOTRE DAME OF MIDSAYAP COLLEGE - QSAMS'
  sTitle.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFF' } }
  sTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.bannerBg } }
  sTitle.alignment = { horizontal: 'center', vertical: 'middle' }
  ws2.getRow(1).height = 28

  ws2.mergeCells('A2:G2')
  const sSub = ws2.getCell('A2')
  sSub.value = `Official Attendance Summary: ${classInfo?.name || 'Class'} (${classInfo?.schedule || 'N/A'})`
  sSub.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFF' } }
  sSub.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '00482B' } }
  sSub.alignment = { horizontal: 'center', vertical: 'middle' }
  ws2.getRow(2).height = 22

  const metaRows2 = [
    ['Instructor:', teacherName || 'Authorized Faculty', '', 'Report Date:', new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })],
    ['Total Enrolled:', overallStats.totalStudents ?? reportData.length, '', 'Total Sessions Recorded:', sortedSessions.length],
    ['Overall Attendance Rate:', `${overallStats.averageRate ?? 0}%`, '', 'Performance Standing:', (overallStats.averageRate ?? 0) >= 75 ? 'Satisfactory' : 'Needs Attention'],
  ]

  metaRows2.forEach((r, idx) => {
    const rowNum = 4 + idx
    const row = ws2.getRow(rowNum)
    row.values = r
    row.height = 18
    row.font = { name: 'Calibri', size: 9.5 }
    ws2.getCell(`A${rowNum}`).font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: '005A36' } }
    ws2.getCell(`B${rowNum}`).font = { name: 'Calibri', size: 9.5, bold: true }
    ws2.getCell(`D${rowNum}`).font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: '005A36' } }
    ws2.getCell(`E${rowNum}`).font = { name: 'Calibri', size: 9.5, bold: true }
  })

  // Table header
  const sHeaders = ['#', 'Student ID', 'Student Name', 'Present', 'Late', 'Absent', 'Attendance Rate']
  const sHeaderRow = ws2.getRow(8)
  sHeaderRow.values = sHeaders
  sHeaderRow.height = 24
  sHeaders.forEach((_, cIdx) => {
    const c = sHeaderRow.getCell(cIdx + 1)
    c.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FFFFFF' } }
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.tableHeaderBg } }
    c.alignment = { horizontal: cIdx === 2 ? 'left' : 'center', vertical: 'middle' }
    c.border = thinBorder
  })

  reportData.forEach((st, idx) => {
    const rowNum = 9 + idx
    const row = ws2.getRow(rowNum)
    row.height = 20
    row.values = [
      idx + 1,
      st.studentId || '—',
      st.name,
      st.present,
      st.late,
      st.absent,
      `${st.rate}%`,
    ]
    const isZebra = idx % 2 === 1
    const bg = isZebra ? COLORS.zebraBg : 'FFFFFF'
    for (let c = 1; c <= 7; c++) {
      const cell = row.getCell(c)
      cell.font = { name: 'Calibri', size: 9.5 }
      cell.border = thinBorder
      cell.alignment = { vertical: 'middle', horizontal: c === 3 ? 'left' : 'center' }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } }
    }
  })

  // Signature Block
  const sigRow = 9 + reportData.length + 3
  ws2.getCell(`B${sigRow}`).value = '_______________________________'
  ws2.getCell(`B${sigRow + 1}`).value = teacherName || 'Course Instructor'
  ws2.getCell(`B${sigRow + 1}`).font = { name: 'Calibri', size: 9.5, bold: true }
  ws2.getCell(`B${sigRow + 2}`).value = 'Faculty Signature'
  ws2.getCell(`B${sigRow + 2}`).font = { name: 'Calibri', size: 8.5, color: { argb: '64748B' } }

  ws2.getCell(`E${sigRow}`).value = '_______________________________'
  ws2.getCell(`E${sigRow + 1}`).value = 'Office of Academic Affairs'
  ws2.getCell(`E${sigRow + 1}`).font = { name: 'Calibri', size: 9.5, bold: true }
  ws2.getCell(`E${sigRow + 2}`).value = 'Verified & Recorded'
  ws2.getCell(`E${sigRow + 2}`).font = { name: 'Calibri', size: 8.5, color: { argb: '64748B' } }

  autoFitColumns(ws2, {
    startRow: 8,
    padding: 3,
    minWidths: { 1: 6, 2: 15, 3: 25, 4: 12, 5: 12, 6: 12, 7: 16 },
  })

  // ── Trigger Download ─────────────────────────────────────────
  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `QSAMS_Attendance_Sheet_${(classInfo?.name || 'Class').replace(/[^a-zA-Z0-9_-]/g, '_')}.xlsx`
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
  title1.font = { name: 'Calibri', size: 14, bold: true, color: { argb: COLORS.bannerText } }
  title1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.bannerBg } }
  title1.alignment = { horizontal: 'center', vertical: 'middle' }
  ws.getRow(1).height = 28

  ws.mergeCells('A2:F2')
  const title2 = ws.getCell('A2')
  title2.value = 'DAILY ATTENDANCE SESSION LOG'
  title2.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFF' } }
  title2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '00482B' } }
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
    key1.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: '005A36' } }
    
    const val1 = ws.getCell(`B${rowNum}`)
    val1.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: '0F172A' } }

    const key2 = ws.getCell(`D${rowNum}`)
    key2.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: '005A36' } }

    const val2 = ws.getCell(`E${rowNum}`)
    val2.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: '0F172A' } }
  })

  // 3. Table Headers (Row 9)
  const headers = ['#', 'Student Name', 'Student ID', 'Attendance Status', 'Method Recorded', 'Time Logged']
  const headerRow = ws.getRow(9)
  headerRow.values = headers
  headerRow.height = 24

  headers.forEach((_, cIdx) => {
    const cell = headerRow.getCell(cIdx + 1)
    cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FFFFFF' } }
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
      statusLabel = '✔ Present'
      statusBg = COLORS.presentBg
      statusText = COLORS.presentText
    } else if (s.status === 'late') {
      statusLabel = '⏱ Late'
      statusBg = COLORS.lateBg
      statusText = COLORS.lateText
    } else if (s.status === 'absent') {
      statusLabel = '✖ Absent'
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
      cell.font = { name: 'Calibri', size: 9.5 }
      cell.border = thinBorder
      cell.alignment = { vertical: 'middle', horizontal: c === 2 ? 'left' : 'center' }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: defaultBg } }

      if (c === 4) {
        cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: statusText } }
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
    cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: '005A36' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.summaryBg } }
    cell.border = doubleBottomBorder
    cell.alignment = { vertical: 'middle', horizontal: c === 1 ? 'left' : 'center' }
  }

  // Auto-fit columns
  autoFitColumns(ws, {
    startRow: 9,
    padding: 3,
    minWidths: {
      1: 6,
      2: 26,
      3: 16,
      4: 18,
      5: 18,
      6: 16,
    },
  })

  // Trigger Download
  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `QSAMS_Daily_Log_${(classInfo?.name || 'Class').replace(/[^a-zA-Z0-9_-]/g, '_')}_${session?.date || new Date().toISOString().slice(0, 10)}.xlsx`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

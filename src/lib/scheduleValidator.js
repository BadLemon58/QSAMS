/**
 * QSAMS Schedule and Room Conflict Validator
 * 
 * Rules:
 * 1. An instructor cannot be booked for two different classes at the same day & time.
 * 2. A classroom/room cannot be occupied by two different classes at the same day & time.
 * 3. Same time on DIFFERENT days (e.g. MW 10-11 AM vs TTH 10-11 AM) is ALLOWED.
 * 4. Same days and overlapping time is BLOCKED.
 */

// Normalize days string into array of normalized day tokens
export function parseDays(daysStr) {
  if (!daysStr) return []
  const clean = daysStr.toUpperCase().trim()

  if (clean === 'MW') return ['M', 'W']
  if (clean === 'TTH' || clean === 'TH' || clean === 'T-TH') return ['T', 'TH']
  if (clean === 'FS' || clean === 'F-S') return ['F', 'S']
  if (clean === 'MWF') return ['M', 'W', 'F']

  const tokens = []
  if (clean.includes('TH') || clean.includes('THU')) {
    tokens.push('TH')
  }
  if (clean.includes('M') || clean.includes('MON')) {
    tokens.push('M')
  }
  if (clean.includes('T') && !clean.includes('TH') || clean.includes('TUE')) {
    tokens.push('T')
  }
  if (clean.includes('W') || clean.includes('WED')) {
    tokens.push('W')
  }
  if (clean.includes('F') || clean.includes('FRI')) {
    tokens.push('F')
  }
  if (clean.includes('S') && !clean.includes('SUN') || clean.includes('SAT')) {
    tokens.push('S')
  }
  if (clean.includes('SUN')) {
    tokens.push('SUN')
  }

  return tokens.length > 0 ? Array.from(new Set(tokens)) : [clean]
}

// Convert "10:30 AM" or "14:00" to minutes from midnight
export function timeStringToMinutes(timeStr) {
  if (!timeStr) return null
  const str = timeStr.trim().toUpperCase()

  // Format "14:30" (24h format)
  if (/^\d{1,2}:\d{2}$/.test(str)) {
    const [h, m] = str.split(':').map(Number)
    return h * 60 + m
  }

  // Format "10:30 AM" or "1:00 PM"
  const match = str.match(/^(\d{1,2}):?(\d{2})?\s*(AM|PM)?$/)
  if (!match) return null

  let hours = parseInt(match[1], 10)
  const minutes = match[2] ? parseInt(match[2], 10) : 0
  const period = match[3]

  if (period === 'PM' && hours < 12) hours += 12
  if (period === 'AM' && hours === 12) hours = 0

  return hours * 60 + minutes
}

// Parse combined schedule string like "TTH 10:00 AM - 11:30 AM"
export function parseSchedule(scheduleStr) {
  if (!scheduleStr) return null
  const trimmed = scheduleStr.trim()

  // Match: [Days] [StartTime] - [EndTime]
  // e.g. "TTH 10:00 AM - 11:30 AM" or "MW 09:00 - 10:30" or "FS 1:00 PM - 3:00 PM"
  const regex = /^([A-Za-z,\s]+?)\s+(\d{1,2}(?::\d{2})?\s*(?:AM|PM)?)\s*(?:-|–|TO)\s*(\d{1,2}(?::\d{2})?\s*(?:AM|PM)?)$/i
  const match = trimmed.match(regex)

  if (!match) {
    // Fallback: try finding days at start
    return {
      raw: scheduleStr,
      days: parseDays(scheduleStr),
      startMin: null,
      endMin: null,
    }
  }

  const daysPart = match[1].trim()
  const startPart = match[2].trim()
  const endPart = match[3].trim()

  return {
    raw: scheduleStr,
    days: parseDays(daysPart),
    startMin: timeStringToMinutes(startPart),
    endMin: timeStringToMinutes(endPart),
  }
}

// Check if two day arrays have any overlapping days
export function doDaysOverlap(daysA, daysB) {
  if (!daysA?.length || !daysB?.length) return true // conservative fallback
  return daysA.some(day => daysB.includes(day))
}

// Check if two time ranges overlap: [startA, endA] and [startB, endB]
export function doTimesOverlap(startA, endA, startB, endB) {
  if (startA == null || endA == null || startB == null || endB == null) {
    return true // conservative fallback if time parsing is uncertain
  }
  return Math.max(startA, startB) < Math.min(endA, endB)
}

// Convert 24-hour time "10:00" to 12-hour "10:00 AM"
export function formatTime24to12(time24) {
  if (!time24) return ''
  const [hStr, mStr] = time24.split(':')
  let h = parseInt(hStr, 10)
  const m = mStr || '00'
  const period = h >= 12 ? 'PM' : 'AM'
  if (h === 0) h = 12
  else if (h > 12) h -= 12
  return `${h}:${m} ${period}`
}

/**
 * Validate conflict against existing classes in database
 * 
 * @param {Object} params
 * @param {string} [params.currentClassId] - ID of class if editing
 * @param {string} params.teacherId - ID of current teacher
 * @param {string} params.room - Classroom name/number
 * @param {string[]} params.days - Selected days array e.g. ['M', 'W']
 * @param {string} params.startTime24 - "10:00"
 * @param {string} params.endTime24 - "11:30"
 * @param {Array} params.existingClasses - Array of existing class objects
 * @returns {{ hasConflict: boolean, message?: string }}
 */
export function checkClassScheduleConflict({
  currentClassId,
  teacherId,
  room,
  days,
  startTime24,
  endTime24,
  existingClasses = []
}) {
  const newStartMin = timeStringToMinutes(startTime24)
  const newEndMin = timeStringToMinutes(endTime24)

  if (newStartMin == null || newEndMin == null) {
    return { hasConflict: true, message: 'Please specify a valid start and end time.' }
  }

  if (newEndMin <= newStartMin) {
    return { hasConflict: true, message: 'End time must be later than start time.' }
  }

  if (!days || days.length === 0) {
    return { hasConflict: true, message: 'Please select class schedule days (e.g. MW, TTH, FS).' }
  }

  const cleanNewRoom = (room || '').trim().toLowerCase()

  for (const cls of existingClasses) {
    // Skip self if editing
    if (currentClassId && cls.id === currentClassId) continue

    const parsedExisting = parseSchedule(cls.schedule)
    if (!parsedExisting) continue

    // Check if days overlap
    const daysOverlap = doDaysOverlap(days, parsedExisting.days)
    if (!daysOverlap) {
      // Days do NOT overlap (e.g. MW vs TTH) -> ALLOWED!
      continue
    }

    // Check if times overlap
    const timesOverlap = doTimesOverlap(
      newStartMin,
      newEndMin,
      parsedExisting.startMin,
      parsedExisting.endMin
    )

    if (!timesOverlap) {
      // Different times on same days -> ALLOWED!
      continue
    }

    // Both Day and Time overlap: Check Instructor & Room conflicts
    const isSameTeacher = cls.teacher_id === teacherId
    const isSameRoom = cleanNewRoom && cls.room && cls.room.trim().toLowerCase() === cleanNewRoom

    if (isSameTeacher) {
      return {
        hasConflict: true,
        type: 'instructor',
        message: `Instructor Schedule Conflict: You already teach "${cls.name}" on ${cls.schedule}.`
      }
    }

    if (isSameRoom) {
      return {
        hasConflict: true,
        type: 'room',
        message: `Room Conflict: "${cls.room}" is already reserved for "${cls.name}" on ${cls.schedule}.`
      }
    }
  }

  return { hasConflict: false }
}

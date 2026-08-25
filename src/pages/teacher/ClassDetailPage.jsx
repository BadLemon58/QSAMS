import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import Navbar from '../../components/common/Navbar'
import Spinner from '../../components/common/Spinner'
import AttendanceReportModal from '../../components/teacher/AttendanceReportModal'
import StudentSummaryModal from '../../components/teacher/StudentSummaryModal'
import { Users, QrCode, ArrowLeft, Plus, Clock, MapPin, ClipboardList, Copy, Check, X, AlertCircle, Trash2, BarChart2, FileSpreadsheet, UserPlus, AlertTriangle, User, CalendarDays, Pencil, Camera } from 'lucide';
import { MorphIcon } from 'morphicons/react';
import { format } from 'date-fns'
import {
  checkClassScheduleConflict,
  formatTime24to12,
  parseSchedule
} from '../../lib/scheduleValidator'
import IDCardScanner from '../../components/teacher/IDCardScanner'

// ── Edit Class Modal with Schedule Conflict Validation ──────────────────────
function EditClassModal({ classInfo, onClose, onUpdated }) {
  const { profile } = useAuth()
  const [name, setName] = useState(classInfo?.name || '')
  const [description, setDescription] = useState(classInfo?.description || '')
  const [room, setRoom] = useState(classInfo?.room || '')

  const parsed = parseSchedule(classInfo?.schedule)
  const initialDays = parsed?.days?.length ? parsed.days : ['M', 'W']

  const [dayPattern, setDayPattern] = useState(() => {
    if (initialDays.length === 2 && initialDays.includes('M') && initialDays.includes('W')) return 'MW'
    if (initialDays.length === 2 && initialDays.includes('T') && initialDays.includes('TH')) return 'TTH'
    if (initialDays.length === 2 && initialDays.includes('F') && initialDays.includes('S')) return 'FS'
    return 'CUSTOM'
  })
  const [customDays, setCustomDays] = useState(initialDays)

  const [startTime, setStartTime] = useState(() => {
    if (parsed?.startMin != null) {
      const h = Math.floor(parsed.startMin / 60).toString().padStart(2, '0')
      const m = (parsed.startMin % 60).toString().padStart(2, '0')
      return `${h}:${m}`
    }
    return '09:00'
  })

  const [endTime, setEndTime] = useState(() => {
    if (parsed?.endMin != null) {
      const h = Math.floor(parsed.endMin / 60).toString().padStart(2, '0')
      const m = (parsed.endMin % 60).toString().padStart(2, '0')
      return `${h}:${m}`
    }
    return '10:30'
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const ALL_DAYS = [
    { key: 'M', label: 'Mon' },
    { key: 'T', label: 'Tue' },
    { key: 'W', label: 'Wed' },
    { key: 'TH', label: 'Thu' },
    { key: 'F', label: 'Fri' },
    { key: 'S', label: 'Sat' },
    { key: 'SUN', label: 'Sun' },
  ]

  const getEffectiveDays = () => {
    if (dayPattern === 'MW') return ['M', 'W']
    if (dayPattern === 'TTH') return ['T', 'TH']
    if (dayPattern === 'FS') return ['F', 'S']
    return customDays
  }

  const getDayLabel = () => {
    if (dayPattern === 'MW') return 'MW'
    if (dayPattern === 'TTH') return 'TTH'
    if (dayPattern === 'FS') return 'FS'
    return customDays.join('/')
  }

  const formattedSchedulePreview = `${getDayLabel()} ${formatTime24to12(startTime)} - ${formatTime24to12(endTime)}`

  const handleCustomDayToggle = (dayKey) => {
    setCustomDays(prev =>
      prev.includes(dayKey)
        ? (prev.length > 1 ? prev.filter(d => d !== dayKey) : prev)
        : [...prev, dayKey]
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const effectiveDays = getEffectiveDays()
    if (effectiveDays.length === 0) {
      setError('Please select at least one class day.')
      setLoading(false)
      return
    }

    if (!startTime || !endTime) {
      setError('Please specify both start and end time.')
      setLoading(false)
      return
    }

    // 1. Fetch existing classes for conflict validation
    const { data: allExistingClasses, error: fetchErr } = await supabase
      .from('classes')
      .select('id, name, schedule, room, teacher_id')

    if (fetchErr) {
      setError(`Database verification error: ${fetchErr.message}`)
      setLoading(false)
      return
    }

    // 2. Validate conflict (skipping current class id)
    const conflictResult = checkClassScheduleConflict({
      currentClassId: classInfo.id,
      teacherId: profile.id,
      room,
      days: effectiveDays,
      startTime24: startTime,
      endTime24: endTime,
      existingClasses: allExistingClasses || []
    })

    if (conflictResult.hasConflict) {
      setError(conflictResult.message)
      setLoading(false)
      return
    }

    // 3. Update the class
    const scheduleFormatted = `${getDayLabel()} ${formatTime24to12(startTime)} - ${formatTime24to12(endTime)}`

    const { data: updatedClass, error: updateErr } = await supabase
      .from('classes')
      .update({
        name,
        description,
        room,
        schedule: scheduleFormatted
      })
      .eq('id', classInfo.id)
      .select()
      .single()

    if (updateErr) {
      setError(updateErr.message)
      setLoading(false)
      return
    }

    onUpdated(updatedClass)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in font-['Gambarino',system-ui,sans-serif]">
      <div className="bg-[#ffffff] text-[#0f172a] w-full max-w-md max-h-[90vh] overflow-y-auto p-6 sm:p-7 rounded-[24px] shadow-2xl border border-[#e2e8f0] relative">
        <button
          onClick={onClose}
          className="absolute right-5 top-5 w-8 h-8 rounded-full bg-[#f1f5f9] flex items-center justify-center text-[#64748b] hover:text-[#0f172a] transition-colors"
        >
          <MorphIcon icon={X} size={16} />
        </button>

        <div className="mb-4">
          <span className="text-xs uppercase font-bold tracking-wider text-[#005a36]">Faculty Portal</span>
          <h2 className="font-['Source_Serif_4',Georgia,serif] text-2xl font-bold text-[#0f172a] mt-0.5">
            Edit Class Details
          </h2>
          <p className="text-[#64748b] text-xs mt-1">Update schedule, room assignment, and details</p>
        </div>

        {error && (
          <div className="flex items-start gap-2.5 bg-[#fee2e2] text-[#b91c1c] border border-[#fca5a5] rounded-[16px] p-3.5 mb-4 text-xs font-semibold leading-relaxed animate-fade-in">
            <MorphIcon icon={AlertCircle} size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#64748b] mb-1.5">
              Class Name *
            </label>
            <input
              type="text"
              className="input-field"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#64748b] mb-1.5">
              Classroom / Room *
            </label>
            <input
              type="text"
              className="input-field"
              value={room}
              onChange={e => setRoom(e.target.value)}
              required
            />
          </div>

          {/* Schedule Days Selection */}
          <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-[18px] p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#005a36]">
                Day Pattern *
              </label>
              <span className="text-[11px] text-[#64748b] font-medium">
                {dayPattern === 'CUSTOM' ? 'Select specific days' : 'Standard patterns'}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {[
                { id: 'MW', label: 'MW', sub: 'Mon/Wed' },
                { id: 'TTH', label: 'TTH', sub: 'Tue/Thu' },
                { id: 'FS', label: 'FS', sub: 'Fri/Sat' },
                { id: 'CUSTOM', label: 'Custom', sub: 'Pick days' },
              ].map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setDayPattern(p.id)}
                  className={`py-2 px-1 rounded-[12px] border text-center transition-all ${
                    dayPattern === p.id
                      ? 'bg-[#005a36] text-white border-[#005a36] shadow-sm font-bold'
                      : 'bg-white text-[#64748b] border-[#e2e8f0] hover:text-[#0f172a]'
                  }`}
                >
                  <p className="text-xs font-bold">{p.label}</p>
                  <p className={`text-[9px] ${dayPattern === p.id ? 'opacity-90' : 'text-[#64748b]'}`}>{p.sub}</p>
                </button>
              ))}
            </div>

            {dayPattern === 'CUSTOM' && (
              <div className="pt-2 border-t border-[#e2e8f0]">
                <p className="text-[11px] text-[#64748b] mb-1.5 font-semibold">Select Meeting Days:</p>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_DAYS.map(d => {
                    const isSelected = customDays.includes(d.key)
                    return (
                      <button
                        key={d.key}
                        type="button"
                        onClick={() => handleCustomDayToggle(d.key)}
                        className={`py-1.5 px-3 rounded-full text-xs font-bold transition-all border ${
                          isSelected
                            ? 'bg-[#e6f2ec] text-[#005a36] border-[#005a36]'
                            : 'bg-white text-[#64748b] border-[#e2e8f0] hover:text-[#0f172a]'
                        }`}
                      >
                        {d.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Time Selection */}
          <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-[18px] p-3.5 space-y-2.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#005a36]">
              Class Time Range *
            </label>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="block text-[11px] text-[#64748b] font-semibold mb-1">Start Time</span>
                <input
                  type="time"
                  className="input-field py-2 font-mono font-bold"
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                  required
                />
              </div>

              <div>
                <span className="block text-[11px] text-[#64748b] font-semibold mb-1">End Time</span>
                <input
                  type="time"
                  className="input-field py-2 font-mono font-bold"
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-[#e2e8f0] text-xs">
              <span className="text-[#64748b] font-medium">Generated Schedule:</span>
              <span className="font-mono font-bold text-[#005a36] bg-[#e6f2ec] px-2 py-0.5 rounded-md">
                {formattedSchedulePreview}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#64748b] mb-1.5">
              Description (Optional)
            </label>
            <textarea
              className="input-field resize-none"
              rows={2}
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          <div className="flex gap-2.5 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center py-3">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center py-3">
              {loading ? <Spinner size="sm" /> : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Join Code Modal (NDMC Forest Green Style) ───────────────────────────────
function JoinCodeModal({ joinCode, className, onClose }) {
  const [copied, setCopied] = useState(false)
  const qrData = JSON.stringify({ type: 'join_class', joinCode, className })

  const handleCopy = () => {
    navigator.clipboard.writeText(joinCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in font-['Gambarino',system-ui,sans-serif]">
      <div className="bg-[#ffffff] text-[#0f172a] w-full max-w-sm p-7 rounded-[24px] shadow-2xl border border-[#e2e8f0] relative text-center">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 w-8 h-8 rounded-full bg-[#f1f5f9] flex items-center justify-center text-[#64748b] hover:text-[#0f172a] transition-colors"
        >
          <MorphIcon icon={X} size={16} />
        </button>

        <div className="inline-flex items-center gap-1.5 bg-[#e6f2ec] border border-[#005a36]/20 rounded-full px-3.5 py-1 text-[#005a36] text-xs font-bold uppercase tracking-wider mb-3">
          <MorphIcon icon={QrCode} size={13} />
          <span>Student Enrollment</span>
        </div>

        <h2 className="font-['Source_Serif_4',Georgia,serif] text-xl font-bold text-[#0f172a] mb-1">{className}</h2>
        <p className="text-[#64748b] text-xs mb-5">Students scan or enter this code in their QSAMS app to enroll</p>

        <div className="flex justify-center mb-5">
          <div className="p-4 bg-[#f8fafc] rounded-[20px] border border-[#e2e8f0] shadow-sm">
            <QRCodeSVG value={qrData} size={190} level="H" includeMargin={false} fgColor="#005a36" />
          </div>
        </div>

        <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-[16px] p-3.5 mb-5">
          <span className="text-[10px] uppercase font-bold tracking-widest text-[#64748b]">Class Join Code</span>
          <p className="text-2xl font-mono font-extrabold text-[#005a36] tracking-wider mt-0.5">{joinCode}</p>
        </div>

        <button onClick={handleCopy} className="btn-primary w-full justify-center">
          {copied ? <><MorphIcon icon={Check} size={16} /> Copied to Clipboard!</> : <><MorphIcon icon={Copy} size={16} /> Copy Code</>}
        </button>
      </div>
    </div>
  )
}

// ── Manual Add Student Modal (NDMC Forest Green Style) ─────────────────────
function ManualEnrollModal({ classId, existingStudentIds, onClose, onEnrolled }) {
  const [students, setStudents] = useState([])
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    const fetchAvailableStudents = async () => {
      setLoading(true)
      const { data, error: err } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'student')
        .order('full_name', { ascending: true })

      if (err) setError(err.message)
      else setStudents(data || [])
      setLoading(false)
    }
    fetchAvailableStudents()
  }, [])

  const availableStudents = students.filter(
    s => !existingStudentIds.includes(s.id) &&
    (s.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
     s.student_id?.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const handleEnroll = async (e) => {
    e.preventDefault()
    if (!selectedStudentId) return
    setSubmitting(true)
    setError('')

    const { error: err } = await supabase
      .from('enrollments')
      .insert({ class_id: classId, student_id: selectedStudentId })

    if (err) {
      setError(err.message)
      setSubmitting(false)
      return
    }

    const newlyEnrolled = students.find(s => s.id === selectedStudentId)
    onEnrolled(newlyEnrolled)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in font-['Gambarino',system-ui,sans-serif]">
      <div className="bg-[#ffffff] text-[#0f172a] w-full max-w-md p-7 rounded-[24px] shadow-2xl border border-[#e2e8f0] relative">
        <button
          onClick={onClose}
          className="absolute right-5 top-5 w-8 h-8 rounded-full bg-[#f1f5f9] flex items-center justify-center text-[#64748b] hover:text-[#0f172a] transition-colors"
        >
          <MorphIcon icon={X} size={16} />
        </button>

        <div className="mb-5">
          <span className="text-xs uppercase font-bold tracking-wider text-[#005a36]">Student Roster</span>
          <h2 className="font-['Source_Serif_4',Georgia,serif] text-2xl font-bold text-[#0f172a] mt-0.5">
            Add Student to Class
          </h2>
          <p className="text-[#64748b] text-xs mt-1">Select a registered student to add directly to this class roster</p>
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-[#fee2e2] text-[#b91c1c] border border-[#fca5a5] rounded-[16px] px-4 py-3 mb-4 text-xs font-semibold">
            <MorphIcon icon={AlertCircle} size={15} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleEnroll} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#64748b] mb-1.5">
              Filter Student Name or ID
            </label>
            <input
              type="text"
              className="input-field mb-2"
              placeholder="Search by name or student ID..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#64748b] mb-1.5">
              Select Student *
            </label>
            {loading ? (
              <div className="py-6 text-center text-xs text-[#64748b]"><Spinner size="sm" /></div>
            ) : availableStudents.length === 0 ? (
              <p className="text-xs text-[#64748b] italic p-3 bg-[#f8fafc] rounded-[16px]">
                No available students matching search.
              </p>
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                {availableStudents.map(st => (
                  <label
                    key={st.id}
                    className={`flex items-center justify-between p-3 rounded-[14px] border cursor-pointer transition-all ${
                      selectedStudentId === st.id
                        ? 'bg-[#e6f2ec] border-[#005a36] text-[#005a36]'
                        : 'bg-[#f8fafc] border-[#e2e8f0] text-[#0f172a] hover:bg-[#f1f5f9]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="radio"
                        name="student"
                        value={st.id}
                        checked={selectedStudentId === st.id}
                        onChange={() => setSelectedStudentId(st.id)}
                        className="accent-[#005a36]"
                      />
                      <span className="font-semibold text-sm">{st.full_name}</span>
                    </div>
                    <span className="text-xs font-mono text-[#64748b]">{st.student_id || 'No ID'}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2.5 pt-3">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center py-3">
              Cancel
            </button>
            <button type="submit" disabled={submitting || !selectedStudentId} className="btn-primary flex-1 justify-center py-3">
              {submitting ? <Spinner size="sm" /> : 'Add to Roster'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Scan Enroll Modal ────────────────────────────────────────────────────────
function ScanEnrollModal({ classId, existingStudentIds, onClose, onEnrolled }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleScan = async (decodedText) => {
    try {
      const parsed = JSON.parse(decodedText)
      if (parsed.type !== 'student_id' || !parsed.uid) {
        setError('Invalid student ID QR code.')
        return
      }

      if (existingStudentIds.includes(parsed.uid)) {
        setError(`${parsed.name || 'Student'} is already enrolled.`)
        return
      }

      setLoading(true)
      setError('')
      setSuccess('')

      const { error: err } = await supabase
        .from('enrollments')
        .insert({ class_id: classId, student_id: parsed.uid })

      if (err) {
        if (err.code === '23505') {
           setError('Student is already enrolled.')
        } else {
           setError(err.message)
        }
        setLoading(false)
        return
      }

      setSuccess(`Enrolled ${parsed.name || 'Student'}!`)
      
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', parsed.uid).single()
      
      setTimeout(() => {
        onEnrolled(profile || { id: parsed.uid, full_name: parsed.name, student_id: parsed.studentId })
        onClose()
      }, 1500)

    } catch (err) {
      setError('Invalid QR format.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in font-['Gambarino',system-ui,sans-serif]">
      <div className="bg-[#ffffff] text-[#0f172a] w-full max-w-sm p-7 rounded-[24px] shadow-2xl border border-[#e2e8f0] relative text-center">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 w-8 h-8 rounded-full bg-[#f1f5f9] flex items-center justify-center text-[#64748b] hover:text-[#0f172a] transition-colors"
        >
          <MorphIcon icon={X} size={16} />
        </button>

        <h2 className="font-['Source_Serif_4',Georgia,serif] text-xl font-bold text-[#0f172a] mb-1">Scan Student QR</h2>
        <p className="text-[#64748b] text-xs mb-5">Scan a student's digital ID to enroll them</p>

        {error && (
          <div className="flex items-center gap-2 bg-[#fee2e2] text-[#b91c1c] border border-[#fca5a5] rounded-[16px] px-4 py-3 mb-4 text-xs font-semibold">
            <MorphIcon icon={AlertCircle} size={15} className="shrink-0" />
            <span className="text-left">{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 bg-[#dcfce7] text-[#15803d] border border-[#86efac] rounded-[16px] px-4 py-3 mb-4 text-xs font-semibold">
            <MorphIcon icon={Check} size={15} className="shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {!success && (
          <IDCardScanner 
            onScan={handleScan}
            onError={(msg) => setError(msg)}
          />
        )}
      </div>
    </div>
  )
}

// ── Delete Class Confirmation Modal ───────────────────────────────────────
function DeleteClassModal({ className, onConfirm, onCancel, deleting }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in font-['Gambarino',system-ui,sans-serif]">
      <div className="bg-[#ffffff] text-[#0f172a] w-full max-w-sm p-6 rounded-[24px] shadow-2xl border border-[#e2e8f0] text-center">
        <div className="w-12 h-12 rounded-full bg-[#fee2e2] text-[#b91c1c] flex items-center justify-center mx-auto mb-3">
          <MorphIcon icon={Trash2} size={24} />
        </div>
        <h3 className="font-['Source_Serif_4',Georgia,serif] text-xl font-bold text-[#0f172a] mb-1">Delete Course?</h3>
        <p className="text-[#64748b] text-xs mb-5 leading-relaxed">
          Are you sure you want to permanently delete <strong className="text-[#0f172a]">{className}</strong>? All student enrollments, sessions, and attendance history will be deleted.
        </p>
        <div className="flex gap-2.5">
          <button onClick={onCancel} disabled={deleting} className="btn-secondary flex-1 justify-center py-3">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={deleting} className="btn-danger flex-1 justify-center py-3">
            {deleting ? <Spinner size="sm" /> : 'Delete Class'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Delete Confirmation Modal ──────────────────────────────────────────────
function DeleteStudentModal({ student, onConfirm, onCancel, deleting }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in font-['Gambarino',system-ui,sans-serif]">
      <div className="bg-[#ffffff] text-[#0f172a] w-full max-w-sm p-6 rounded-[24px] shadow-2xl border border-[#e2e8f0] text-center">
        <div className="w-12 h-12 rounded-full bg-[#fee2e2] text-[#b91c1c] flex items-center justify-center mx-auto mb-3">
          <MorphIcon icon={AlertTriangle} size={24} />
        </div>
        <h3 className="font-['Source_Serif_4',Georgia,serif] text-xl font-bold text-[#0f172a] mb-1">Remove Student?</h3>
        <p className="text-[#64748b] text-xs mb-5">
          Are you sure you want to remove <strong className="text-[#0f172a]">{student?.full_name}</strong> from this class roster?
        </p>
        <div className="flex gap-2.5">
          <button onClick={onCancel} disabled={deleting} className="btn-secondary flex-1 justify-center py-3">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={deleting} className="btn-danger flex-1 justify-center py-3">
            {deleting ? <Spinner size="sm" /> : 'Remove Student'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Class Detail Page (NDMC Forest Green Style) ───────────────────────
export default function ClassDetailPage() {
  const { classId } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuth()

  const [classInfo, setClassInfo] = useState(null)
  const [students, setStudents] = useState([])
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)

  // Modals
  const [showEdit, setShowEdit] = useState(false)
  const [showDeleteClass, setShowDeleteClass] = useState(false)
  const [deletingClass, setDeletingClass] = useState(false)
  const [showJoinCode, setShowJoinCode] = useState(false)
  const [showEnroll, setShowEnroll] = useState(false)
  const [showScanEnroll, setShowScanEnroll] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [selectedStudentForSummary, setSelectedStudentForSummary] = useState(null)
  const [studentToDelete, setStudentToDelete] = useState(null)
  const [removing, setRemoving] = useState(false)

  const loadData = async () => {
    try {
      const { data: cls } = await supabase
        .from('classes')
        .select('*')
        .eq('id', classId)
        .single()
      setClassInfo(cls)

      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('student_id, profiles(id, full_name, student_id, avatar_url)')
        .eq('class_id', classId)
      setStudents((enrollments || []).map(e => e.profiles).filter(Boolean))

      const { data: sess } = await supabase
        .from('attendance_sessions')
        .select('*')
        .eq('class_id', classId)
        .order('date', { ascending: false })
      setSessions(sess || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [classId])

  const handleDeleteClass = async () => {
    setDeletingClass(true)
    try {
      await supabase.from('attendance_logs').delete().eq('class_id', classId)
      await supabase.from('attendance_sessions').delete().eq('class_id', classId)
      await supabase.from('enrollments').delete().eq('class_id', classId)
      const { error } = await supabase.from('classes').delete().eq('id', classId)
      if (!error) {
        navigate('/teacher')
      }
    } catch (err) {
      console.error('Error deleting class:', err)
    } finally {
      setDeletingClass(false)
      setShowDeleteClass(false)
    }
  }

  const handleTakeAttendanceClick = (e) => {
    e.preventDefault()
    
    if (!classInfo?.schedule) {
      navigate(`/teacher/class/${classId}/attendance`)
      return
    }

    const parsed = parseSchedule(classInfo.schedule)
    if (!parsed || !parsed.days || parsed.startMin == null || parsed.endMin == null) {
      navigate(`/teacher/class/${classId}/attendance`)
      return
    }

    const now = new Date()
    const currentDayTokens = []
    const dayMap = ['SUN', 'M', 'T', 'W', 'TH', 'F', 'S']
    currentDayTokens.push(dayMap[now.getDay()])
    
    const currentMin = now.getHours() * 60 + now.getMinutes()
    const BUFFER = 30 // 30 mins grace period

    const isCorrectDay = parsed.days.some(d => currentDayTokens.includes(d))
    const isWithinTime = currentMin >= (parsed.startMin - BUFFER) && currentMin <= (parsed.endMin + BUFFER)

    if (isCorrectDay && isWithinTime) {
      navigate(`/teacher/class/${classId}/attendance`)
    } else {
      alert(`Cannot start attendance session.\n\nThis class is scheduled for ${classInfo.schedule}. You can only start attendance up to 30 minutes before or after the scheduled time.`)
    }
  }

  const handleRemoveStudent = async () => {
    if (!studentToDelete) return
    setRemoving(true)
    const { error } = await supabase
      .from('enrollments')
      .delete()
      .eq('class_id', classId)
      .eq('student_id', studentToDelete.id)

    if (!error) {
      setStudents(prev => prev.filter(s => s.id !== studentToDelete.id))
      setStudentToDelete(null)
    }
    setRemoving(false)
  }

  if (loading) return (
    <div className="min-h-screen bg-[#f4f6f8] flex items-center justify-center"><Spinner size="xl" /></div>
  )

  return (
    <div className="min-h-screen bg-[#f4f6f8] text-[#0f172a] font-['Gambarino',system-ui,sans-serif] selection:bg-[#005a36]/20">
      <Navbar />

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Back Link */}
        <button
          onClick={() => navigate('/teacher')}
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#005a36] hover:underline mb-4 transition-colors"
        >
          <MorphIcon icon={ArrowLeft} size={15} /> Back to Dashboard
        </button>

        {/* Institutional Forest Green Banner */}
        <div className="ndmc-banner mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <span className="text-[11px] font-mono tracking-wider opacity-90 block mb-1">
                {classInfo?.schedule || 'Academic Schedule'} • Section Details
              </span>
              <h1 className="font-['Source_Serif_4',Georgia,serif] text-2xl sm:text-3xl font-bold tracking-tight text-white">
                {classInfo?.name}
              </h1>
              {classInfo?.description && (
                <p className="text-xs opacity-90 mt-1 max-w-2xl leading-relaxed">{classInfo.description}</p>
              )}
              <div className="flex flex-wrap gap-2.5 text-xs mt-3">
                {classInfo?.room && (
                  <span className="flex items-center gap-1.5 bg-white/15 px-3 py-1 rounded-full text-white backdrop-blur-sm">
                    <MorphIcon icon={MapPin} size={12} /> Room: {classInfo.room}
                  </span>
                )}
                <span className="flex items-center gap-1.5 bg-white/15 px-3 py-1 rounded-full text-white backdrop-blur-sm">
                  <MorphIcon icon={Users} size={12} /> {students.length} Enrolled Students
                </span>
                <span className="flex items-center gap-1.5 bg-white/15 px-3 py-1 rounded-full text-white backdrop-blur-sm font-mono font-bold">
                  Join Code: {classInfo?.join_code || classInfo?.id?.substring(0, 6).toUpperCase()}
                </span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-2.5 self-start md:self-auto">
              <button
                onClick={() => setShowEdit(true)}
                className="bg-white text-[#005a36] hover:bg-[#f1f5f9] font-bold text-xs py-2.5 px-4 rounded-[12px] shadow-sm transition-all flex items-center gap-1.5"
              >
                <MorphIcon icon={Pencil} size={14} /> Edit Class
              </button>
              <button
                onClick={() => setShowJoinCode(true)}
                className="bg-white text-[#005a36] hover:bg-[#f1f5f9] font-bold text-xs py-2.5 px-4 rounded-[12px] shadow-sm transition-all flex items-center gap-1.5"
              >
                <MorphIcon icon={QrCode} size={14} /> Join QR
              </button>
              <button
                onClick={() => setShowReport(true)}
                className="bg-white text-[#005a36] hover:bg-[#f1f5f9] font-bold text-xs py-2.5 px-4 rounded-[12px] shadow-sm transition-all flex items-center gap-1.5"
              >
                <MorphIcon icon={FileSpreadsheet} size={14} /> Attendance Report
              </button>
              <button
                onClick={() => setShowEnroll(true)}
                className="bg-white text-[#005a36] hover:bg-[#f1f5f9] font-bold text-xs py-2.5 px-4 rounded-[12px] shadow-sm transition-all flex items-center gap-1.5"
              >
                <MorphIcon icon={UserPlus} size={14} /> Add Student
              </button>
              <button
                onClick={() => setShowScanEnroll(true)}
                className="bg-white text-[#005a36] hover:bg-[#f1f5f9] font-bold text-xs py-2.5 px-4 rounded-[12px] shadow-sm transition-all flex items-center gap-1.5"
              >
                <MorphIcon icon={Camera} size={14} /> Scan to Enroll
              </button>
              <button
                onClick={handleTakeAttendanceClick}
                className="bg-[#d97706] hover:bg-[#b45309] text-white font-bold text-xs py-2.5 px-4 rounded-[12px] shadow-sm transition-all flex items-center gap-1.5"
              >
                <MorphIcon icon={ClipboardList} size={14} /> Take Attendance
              </button>
              <button
                onClick={() => setShowDeleteClass(true)}
                className="bg-[#fee2e2] text-[#b91c1c] hover:bg-[#fecaca] font-bold text-xs py-2.5 px-4 rounded-[12px] shadow-sm transition-all flex items-center gap-1.5 border border-[#fca5a5]"
                title="Delete this class"
              >
                <MorphIcon icon={Trash2} size={14} /> Delete Class
              </button>
            </div>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Enrolled Students Roster */}
          <div className="lg:col-span-2 bg-[#ffffff] border border-[#e2e8f0] rounded-[24px] overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-[#e2e8f0] flex items-center justify-between bg-[#f8fafc]">
              <div className="flex items-center gap-2">
                <MorphIcon icon={Users} size={16} className="text-[#005a36]" />
                <h2 className="font-['Source_Serif_4',Georgia,serif] font-bold text-lg text-[#0f172a]">
                  Enrolled Students Roster
                </h2>
              </div>
              <span className="text-xs font-semibold text-[#64748b]">{students.length} Total</span>
            </div>

            {students.length === 0 ? (
              <div className="p-12 text-center text-[#64748b]">
                <p className="text-xs mb-4">No students enrolled in this section yet.</p>
                <div className="flex justify-center gap-3">
                  <button onClick={() => setShowJoinCode(true)} className="btn-secondary btn-sm">
                    <MorphIcon icon={QrCode} size={14} /> Show Join QR
                  </button>
                  <button onClick={() => setShowEnroll(true)} className="btn-primary btn-sm">
                    <MorphIcon icon={UserPlus} size={14} /> Add Student
                  </button>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-[#e2e8f0]">
                {students.map((student, idx) => (
                  <div
                    key={student.id}
                    className="px-6 py-3.5 flex items-center justify-between hover:bg-[#f8fafc] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-[#64748b] font-mono w-5">{idx + 1}</span>
                      <div className="w-8 h-8 rounded-full bg-[#005a36] text-[#ffffff] flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden">
                        {student.avatar_url ? (
                          <img src={student.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          student.full_name?.[0]?.toUpperCase() || <MorphIcon icon={User} size={12} />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-[#0f172a]">{student.full_name}</p>
                        <p className="text-xs text-[#64748b] font-mono">{student.student_id || 'No ID'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedStudentForSummary(student)}
                        className="px-3 py-1.5 rounded-[12px] bg-[#f1f5f9] text-[#005a36] hover:bg-[#e6f2ec] text-xs font-semibold flex items-center gap-1.5 transition-colors"
                        title="View Attendance History"
                      >
                        <MorphIcon icon={BarChart2} size={13} />
                        <span className="hidden sm:inline">Stats</span>
                      </button>
                      <button
                        onClick={() => setStudentToDelete(student)}
                        className="px-2.5 py-1.5 rounded-[12px] bg-[#fee2e2] text-[#b91c1c] hover:bg-[#fecaca] text-xs font-semibold flex items-center gap-1 transition-colors border border-[#fca5a5]/60"
                        title="Remove student from class"
                      >
                        <MorphIcon icon={Trash2} size={13} />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar: Recent Sessions */}
          <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-[24px] p-6 shadow-sm flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MorphIcon icon={CalendarDays} size={16} className="text-[#005a36]" />
                <h3 className="font-['Source_Serif_4',Georgia,serif] font-bold text-base text-[#0f172a]">
                  Recorded Sessions
                </h3>
              </div>
              <span className="text-xs font-semibold text-[#64748b]">{sessions.length} Sessions</span>
            </div>

            {sessions.length === 0 ? (
              <div className="py-8 text-center text-[#64748b] text-xs">
                No attendance sessions recorded yet.
              </div>
            ) : (
              <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                {sessions.map(sess => (
                  <div
                    key={sess.id}
                    className="p-3.5 bg-[#f8fafc] rounded-[16px] border border-[#e2e8f0] flex items-center justify-between"
                  >
                    <div>
                      <p className="font-semibold text-xs text-[#0f172a]">
                        {format(new Date(sess.date), 'EEEE, MMM d, yyyy')}
                      </p>
                      <p className="text-[11px] text-[#64748b] mt-0.5">
                        {sess.is_active ? '● Live Session' : 'Recorded'}
                      </p>
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${sess.is_active ? 'bg-[#dcfce7] text-[#15803d]' : 'bg-[#f1f5f9] text-[#64748b]'}`}>
                      {sess.is_active ? 'Active' : 'Closed'}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <Link
              to={`/teacher/class/${classId}/attendance`}
              className="btn-primary w-full justify-center mt-2"
            >
              <MorphIcon icon={ClipboardList} size={15} /> Launch Attendance
            </Link>
          </div>

        </div>
      </div>

      {/* Modals */}
      {showJoinCode && (
        <JoinCodeModal
          joinCode={classInfo?.join_code || classInfo?.id?.substring(0, 6).toUpperCase()}
          className={classInfo?.name}
          onClose={() => setShowJoinCode(false)}
        />
      )}

      {showEdit && classInfo && (
        <EditClassModal
          classInfo={classInfo}
          onClose={() => setShowEdit(false)}
          onUpdated={(updated) => setClassInfo(updated)}
        />
      )}

      {showEnroll && (
        <ManualEnrollModal
          classId={classId}
          existingStudentIds={students.map(s => s.id)}
          onClose={() => setShowEnroll(false)}
          onEnrolled={(newStudent) => setStudents(prev => [...prev, newStudent])}
        />
      )}

      {showScanEnroll && (
        <ScanEnrollModal
          classId={classId}
          existingStudentIds={students.map(s => s.id)}
          onClose={() => setShowScanEnroll(false)}
          onEnrolled={(st) => setStudents(prev => [...prev, st])}
        />
      )}

      {showReport && (
        <AttendanceReportModal
          classId={classId}
          classInfo={classInfo}
          teacherName={profile?.full_name}
          onClose={() => setShowReport(false)}
        />
      )}

      {selectedStudentForSummary && (
        <StudentSummaryModal
          student={selectedStudentForSummary}
          classId={classId}
          className={classInfo?.name}
          onClose={() => setSelectedStudentForSummary(null)}
        />
      )}

      {studentToDelete && (
        <DeleteStudentModal
          student={studentToDelete}
          onConfirm={handleRemoveStudent}
          onCancel={() => setStudentToDelete(null)}
          deleting={removing}
        />
      )}

      {showDeleteClass && (
        <DeleteClassModal
          className={classInfo?.name}
          onConfirm={handleDeleteClass}
          onCancel={() => setShowDeleteClass(false)}
          deleting={deletingClass}
        />
      )}
    </div>
  )
}

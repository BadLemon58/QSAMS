import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import Navbar from '../../components/common/Navbar'
import Spinner from '../../components/common/Spinner'
import { CourseCardSkeleton, Skeleton } from '../../components/common/Skeleton'
import HoldToDeleteButton from '../../components/common/HoldToDeleteButton'
import Badge from '../../components/common/Badge'
import { BookOpen, Plus, Users, Calendar, Clock, ChevronRight, MapPin, X, AlertCircle, Tv2, ScanLine, LogOut, User, Sparkles, RefreshCw, QrCode, CheckCircle, FileText, ArrowRight, Trash2, CalendarDays } from 'lucide';
import { MorphIcon } from 'morphicons/react';
import { format, isToday } from 'date-fns'

import {
  checkClassScheduleConflict,
  formatTime24to12,
  parseDays,
  parseSchedule
} from '../../lib/scheduleValidator'

// ── Schedule Restriction Error Modal (Red Outline / Error Accent) ─────────────
function ScheduleRestrictionModal({ schedule, onClose }) {
  const now = new Date()
  const currentFormatted = format(now, 'EEEE, h:mm a')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in font-['Gambarino',system-ui,sans-serif]">
      <div className="bg-[#ffffff] text-[#0f172a] w-full max-w-md p-6 sm:p-7 rounded-[26px] shadow-2xl border-2 border-[#ef4444] relative text-center">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 w-8 h-8 rounded-full bg-[#fef2f2] text-[#ef4444] flex items-center justify-center hover:bg-[#fee2e2] transition-colors"
        >
          <MorphIcon icon={X} size={16} />
        </button>

        {/* Error Icon Badge with Red Outline */}
        <div className="w-14 h-14 rounded-[20px] bg-[#fef2f2] border-2 border-[#fca5a5] text-[#dc2626] flex items-center justify-center mx-auto mb-3.5 shadow-sm">
          <MorphIcon icon={AlertCircle} size={30} />
        </div>

        {/* Tag */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#fee2e2] text-[#b91c1c] text-[11px] font-bold uppercase tracking-wider mb-2.5 border border-[#fca5a5]/60">
          <MorphIcon icon={Clock} size={13} />
          <span>Attendance Window Closed</span>
        </div>

        <h3 className="font-['Source_Serif_4',Georgia,serif] text-xl font-bold text-[#0f172a] mb-2">
          Cannot Start Attendance Session
        </h3>

        <p className="text-[#64748b] text-xs sm:text-sm leading-relaxed mb-5">
          Live attendance sessions can only be launched within <strong className="text-[#0f172a]">30 minutes</strong> before or after the designated class schedule.
        </p>

        {/* Schedule vs Current Time Breakdown */}
        <div className="bg-[#fef2f2]/60 border border-[#fecaca] rounded-[18px] p-4 text-left space-y-2.5 mb-6">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#991b1b] font-semibold flex items-center gap-1.5">
              <MorphIcon icon={CalendarDays} size={14} /> Scheduled Time:
            </span>
            <span className="font-mono font-bold text-[#b91c1c] bg-[#fee2e2] px-2.5 py-0.5 rounded-lg border border-[#fca5a5]/70">
              {schedule || 'Not Specified'}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs pt-2 border-t border-[#fecaca]">
            <span className="text-[#64748b] font-semibold flex items-center gap-1.5">
              <MorphIcon icon={Clock} size={14} /> Current Time:
            </span>
            <span className="font-mono font-semibold text-[#0f172a]">
              {currentFormatted}
            </span>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={onClose}
          className="w-full py-3.5 px-4 rounded-[16px] bg-[#dc2626] hover:bg-[#b91c1c] text-white font-semibold text-sm shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2"
        >
          Understood
        </button>
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
          <HoldToDeleteButton
            onConfirm={onConfirm}
            deleting={deleting}
            label="Delete Class"
            durationMs={1000}
          />
        </div>
      </div>
    </div>
  )
}

// ── Create Class Modal with Schedule Conflict Restraints (NDMC Forest Green Style) ──
function CreateClassModal({ onClose, onCreated }) {
  const { profile } = useAuth()
  const [form, setForm] = useState({ name: '', description: '', room: '' })
  const [dayPattern, setDayPattern] = useState('MW') // 'MW' | 'TTH' | 'FS' | 'CUSTOM'
  const [customDays, setCustomDays] = useState(['M', 'W'])
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('10:30')
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
      setError('Please provide valid start and end times.')
      setLoading(false)
      return
    }

    // 1. Fetch all classes in database for conflict validation
    const { data: allExistingClasses, error: fetchErr } = await supabase
      .from('classes')
      .select('id, name, schedule, room, teacher_id')

    if (fetchErr) {
      setError(`Database verification error: ${fetchErr.message}`)
      setLoading(false)
      return
    }

    // 2. Validate Instructor & Room Schedule Conflicts
    const conflictResult = checkClassScheduleConflict({
      teacherId: profile.id,
      room: form.room,
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

    // 3. Create the class
    const scheduleFormatted = `${getDayLabel()} ${formatTime24to12(startTime)} - ${formatTime24to12(endTime)}`

    const { data, error: err } = await supabase
      .from('classes')
      .insert({
        name: form.name,
        description: form.description,
        room: form.room,
        schedule: scheduleFormatted,
        teacher_id: profile.id
      })
      .select('*, enrollments(id), attendance_sessions(*)')
      .single()

    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }

    onCreated(data)
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
            Create New Class
          </h2>
          <p className="text-[#64748b] text-xs mt-1">Set up course section with conflict-free day & time validation</p>
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
              placeholder="e.g. BSIT 3B - Information Management"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#64748b] mb-1.5">
              Classroom / Room *
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. Room 204 or CompLab 2"
              value={form.room}
              onChange={e => setForm({ ...form, room: e.target.value })}
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
                {dayPattern === 'CUSTOM' ? 'Select specific days' : 'Standard academic patterns'}
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

            {/* Custom Day Checkboxes if CUSTOM selected */}
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

          {/* Time Selection with strict time inputs */}
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

            {/* Live Schedule String Preview */}
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
              placeholder="Brief course outline or subject description..."
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div className="flex gap-2.5 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center py-3">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center py-3">
              {loading ? <Spinner size="sm" /> : 'Create & Verify'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main Component: Responsive Teacher Dashboard ───────────────────────────
export default function TeacherDashboard() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState('overview') // 'overview' | 'classes' | 'activity'
  const [classes, setClasses] = useState([])
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [classToDelete, setClassToDelete] = useState(null)
  const [deletingClass, setDeletingClass] = useState(false)
  const [scheduleErrorModal, setScheduleErrorModal] = useState(null)

  const handleLaunchKiosk = (cls) => {
    if (!cls) return
    if (!cls.schedule) {
      navigate(`/teacher/attendance/${cls.id}`)
      return
    }

    const parsed = parseSchedule(cls.schedule)
    if (!parsed || !parsed.days || parsed.startMin == null || parsed.endMin == null) {
      navigate(`/teacher/attendance/${cls.id}`)
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
      navigate(`/teacher/attendance/${cls.id}`)
    } else {
      setScheduleErrorModal(cls.schedule)
    }
  }

  const handleDeleteClass = async () => {
    if (!classToDelete) return
    setDeletingClass(true)
    try {
      await supabase.from('attendance_logs').delete().eq('class_id', classToDelete.id)
      await supabase.from('attendance_sessions').delete().eq('class_id', classToDelete.id)
      await supabase.from('enrollments').delete().eq('class_id', classToDelete.id)
      const { error } = await supabase.from('classes').delete().eq('id', classToDelete.id)
      if (!error) {
        setClasses(prev => prev.filter(c => c.id !== classToDelete.id))
        setClassToDelete(null)
      }
    } catch (err) {
      console.error('Error deleting class:', err)
    } finally {
      setDeletingClass(false)
    }
  }

  const fetchTeacherData = async () => {
    if (!profile?.id) return
    try {
      const { data: clsData } = await supabase
        .from('classes')
        .select('*, enrollments(id), attendance_sessions(*)')
        .eq('teacher_id', profile.id)
        .order('created_at', { ascending: false })

      setClasses(clsData || [])

      const classIds = (clsData || []).map(c => c.id)
      if (classIds.length > 0) {
        const { data: recentLogs } = await supabase
          .from('attendance_logs')
          .select('*, profiles(full_name, student_id), classes(name, room)')
          .in('class_id', classIds)
          .order('marked_at', { ascending: false })
          .limit(25)
        setLogs(recentLogs || [])
      } else {
        setLogs([])
      }
    } catch (err) {
      console.error('Error loading teacher data:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchTeacherData()
  }, [profile?.id])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchTeacherData()
  }

  // Quick stats calculation
  const totalClasses = classes.length
  const totalStudents = classes.reduce((sum, c) => sum + (c.enrollments?.length || 0), 0)
  const activeSessionsCount = classes.reduce((sum, c) => {
    const active = (c.attendance_sessions || []).filter(s => s.is_active).length
    return sum + active
  }, 0)
  const todayLogsCount = logs.filter(l => l.marked_at && isToday(new Date(l.marked_at))).length

  const primaryClass = classes[0]

  return (
    <div className="min-h-screen bg-[#f4f6f8] text-[#0f172a] font-['Gambarino',system-ui,sans-serif] selection:bg-[#005a36]/20">

      {/* ══════════════════════════════════════════════════════════════
          1. DESKTOP LAYOUT (Visible on lg, xl screens)
          ══════════════════════════════════════════════════════════════ */}
      <div className="hidden lg:block">
        <Navbar />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          {/* Institutional Forest Green Header Banner */}
          <div className="ndmc-banner mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <span className="text-[11px] font-mono tracking-wider opacity-90 block mb-1">
                {format(new Date(), 'yyyy')} - {format(new Date(), 'MMMM d')} • Faculty Dashboard
              </span>
              <h1 className="font-['Source_Serif_4',Georgia,serif] text-2xl sm:text-3xl font-bold tracking-tight text-white">
                Welcome back, {profile?.full_name || 'Faculty Member'}
              </h1>
              <p className="text-xs opacity-90 mt-1">
                Notre Dame of Midsayap College — Smart Attendance Monitoring System
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowModal(true)}
                className="bg-[#ffffff] text-[#005a36] hover:bg-[#f1f5f9] font-bold text-xs py-3 px-5 rounded-[14px] shadow-sm transition-all active:scale-[0.98] flex items-center gap-2"
              >
                <MorphIcon icon={Plus} size={16} />
                Create New Class
              </button>
            </div>
          </div>

          {/* Stat Metrics Band */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-[20px] p-5 shadow-sm">
              <span className="text-xs font-bold uppercase tracking-wider text-[#64748b]">Total Classes</span>
              <span className="font-['Source_Serif_4',Georgia,serif] text-3xl font-bold text-[#005a36] block mt-1">
                {totalClasses}
              </span>
            </div>

            <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-[20px] p-5 shadow-sm">
              <span className="text-xs font-bold uppercase tracking-wider text-[#64748b]">Total Students</span>
              <span className="font-['Source_Serif_4',Georgia,serif] text-3xl font-bold text-[#0f172a] block mt-1">
                {totalStudents}
              </span>
            </div>

            <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-[20px] p-5 shadow-sm">
              <span className="text-xs font-bold uppercase tracking-wider text-[#64748b]">Active Kiosks</span>
              <span className="font-['Source_Serif_4',Georgia,serif] text-3xl font-bold text-[#15803d] block mt-1">
                {activeSessionsCount} Live
              </span>
            </div>

            <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-[20px] p-5 shadow-sm">
              <span className="text-xs font-bold uppercase tracking-wider text-[#64748b]">Today's Check-ins</span>
              <span className="font-['Source_Serif_4',Georgia,serif] text-3xl font-bold text-[#d97706] block mt-1">
                {todayLogsCount}
              </span>
            </div>
          </div>

          {/* Classes Section Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <MorphIcon icon={BookOpen} size={18} className="text-[#005a36]" />
              <h2 className="font-['Source_Serif_4',Georgia,serif] font-bold text-xl text-[#0f172a]">
                Active Class Sections
              </h2>
            </div>
            <span className="text-xs font-semibold text-[#64748b]">
              {classes.length} Total Course{classes.length === 1 ? '' : 's'}
            </span>
          </div>

          {/* Classes Grid */}
          {loading ? (
            <CourseCardSkeleton count={4} />
          ) : classes.length === 0 ? (
            <div className="bg-[#ffffff] rounded-[24px] border border-[#e2e8f0] p-12 text-center max-w-md mx-auto shadow-sm">
              <div className="w-14 h-14 rounded-full bg-[#e6f2ec] text-[#005a36] flex items-center justify-center mx-auto mb-3">
                <MorphIcon icon={BookOpen} size={24} />
              </div>
              <h3 className="font-['Source_Serif_4',Georgia,serif] font-bold text-lg text-[#0f172a] mb-1">
                No classes created yet
              </h3>
              <p className="text-xs text-[#64748b] mb-5">
                Click the button below to add your first course section and generate student join codes.
              </p>
              <button onClick={() => setShowModal(true)} className="btn-primary">
                <MorphIcon icon={Plus} size={16} />
                Create First Class
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {classes.map(cls => (
                <div
                  key={cls.id}
                  className="bg-[#ffffff] border border-[#e2e8f0] rounded-[22px] p-5 group hover:border-[#005a36]/40 hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <Link to={`/teacher/class/${cls.id}`} className="block">
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-10 h-10 rounded-xl bg-[#e6f2ec] text-[#005a36] flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                        <MorphIcon icon={BookOpen} size={18} />
                      </div>
                      <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-[#f8fafc] text-[#005a36] border border-[#e2e8f0]">
                        {cls.join_code || cls.id.substring(0, 6).toUpperCase()}
                      </span>
                    </div>

                    <h3 className="font-['Source_Serif_4',Georgia,serif] font-bold text-[#0f172a] text-base mb-1 group-hover:text-[#005a36] transition-colors line-clamp-1">
                      {cls.name}
                    </h3>
                    {cls.description && (
                      <p className="text-[#64748b] text-xs mb-2 line-clamp-2 leading-relaxed">{cls.description}</p>
                    )}
                    <div className="flex items-center gap-1.5 text-xs text-[#005a36] font-semibold bg-[#e6f2ec] px-2.5 py-1 rounded-lg w-fit mt-2">
                      <MorphIcon icon={Clock} size={12} />
                      <span>{cls.schedule || 'Schedule TBA'}</span>
                    </div>
                  </Link>

                  <div className="space-y-3 pt-3 border-t border-[#e2e8f0] mt-3">
                    <div className="flex items-center justify-between text-xs text-[#64748b]">
                      <span>{cls.enrollments?.length || 0} Enrolled</span>
                      <span>{cls.room || 'Room TBA'}</span>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleLaunchKiosk(cls)}
                        className="btn-primary flex-1 justify-center text-xs py-2"
                      >
                        <MorphIcon icon={Tv2} size={13} /> Live Kiosk
                      </button>
                      <Link
                        to={`/teacher/class/${cls.id}`}
                        className="btn-secondary flex-1 justify-center text-xs py-2"
                      >
                        Details
                      </Link>
                      <button
                        onClick={() => setClassToDelete(cls)}
                        className="p-2 rounded-[12px] bg-[#fee2e2] text-[#b91c1c] hover:bg-[#fecaca] transition-colors border border-[#fca5a5]/60"
                        title="Delete Class"
                      >
                        <MorphIcon icon={Trash2} size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>


      {/* ══════════════════════════════════════════════════════════════
          2. MOBILE PHONE & TABLET APP LAYOUT (Visible on < lg screens)
             - Matches Student mobile layout & TabBar at bottom
             - Sign out button in exact same location & style
          ══════════════════════════════════════════════════════════════ */}
      <div className="lg:hidden flex justify-center">
        <div className="w-full max-w-md sm:max-w-xl md:max-w-2xl min-h-screen bg-[#ffffff] flex flex-col justify-between px-4 sm:px-6 md:px-8 pt-5 pb-24 relative shadow-sm border-x border-[#e2e8f0] transition-all">

          {/* ── Scrollable Content ── */}
          <div className="flex flex-col gap-6 w-full">

            {/* 1. Header Row (Exact same location as student dashboard) */}
            <section className="flex items-center justify-between w-full">
              <button
                onClick={() => navigate('/profile')}
                aria-label="Profile settings"
                className="flex items-center gap-2.5 group text-left"
              >
                <div className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-[#005a36] text-[#ffffff] flex items-center justify-center font-bold text-sm shadow-sm overflow-hidden border border-[#e2e8f0]">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    profile?.full_name?.[0]?.toUpperCase() || <MorphIcon icon={User} size={18} />
                  )}
                </div>
                <div>
                  <p className="text-xs font-bold text-[#0f172a] leading-none group-hover:text-[#005a36] transition-colors truncate max-w-[120px] sm:max-w-[180px]">
                    {profile?.full_name || 'Faculty Member'}
                  </p>
                  <p className="text-[11px] text-[#005a36] font-semibold leading-none mt-1">
                    Instructor Portal
                  </p>
                </div>
              </button>

              <button
                onClick={async () => {
                  await signOut()
                  navigate('/login')
                }}
                className="flex items-center gap-2 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-[14px] text-xs sm:text-sm font-semibold text-[#b91c1c] hover:bg-[#fecaca] active:scale-95 transition-all border border-[#fca5a5] bg-[#fee2e2] shadow-sm"
                title="Sign out of account"
              >
                <MorphIcon icon={LogOut} size={16} />
                <span>Sign out</span>
              </button>
            </section>

            {loading ? (
              <div className="space-y-4 py-2">
                <Skeleton className="h-48 w-full rounded-[24px]" />
                <Skeleton className="h-14 w-full rounded-[16px]" />
                <Skeleton className="h-32 w-full rounded-[20px]" />
              </div>
            ) : (
              <>
                {/* ── TAB 1: OVERVIEW / QUICK LAUNCH (DEFAULT) ── */}
                {activeTab === 'overview' && (
                  <>
                    {/* Faculty Hero Hub Stage */}
                    <section className="bg-[#f8fafc] border border-[#e2e8f0] rounded-[24px] p-6 sm:p-8 md:p-10 flex flex-col items-center gap-4 relative shadow-sm">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-[22px] bg-[#005a36] text-white flex items-center justify-center shadow-md relative">
                        <div
                          className="absolute inset-[-6px] rounded-[26px] border-2 border-[#005a36]/20 opacity-55 pointer-events-none"
                          style={{ animation: 'gesso-qr-breathe 3.2s ease-in-out infinite' }}
                        />
                        <MorphIcon icon={Tv2} size={36} className="text-white" />
                      </div>

                      <div className="flex flex-col items-center gap-1 text-center mt-1">
                        <span className="font-['Source_Serif_4',Georgia,serif] font-bold text-[22px] md:text-[26px] text-[#0f172a] tracking-tight">
                          {primaryClass ? primaryClass.name : 'Create Your First Class'}
                        </span>
                        <div className="flex flex-wrap items-center justify-center gap-2 mt-1 text-xs text-[#64748b]">
                          {primaryClass ? (
                            <>
                              <span className="inline-flex items-center gap-1.5 bg-[#e6f2ec] text-[#005a36] font-semibold px-3 py-1 rounded-full text-xs">
                                <MorphIcon icon={Clock} size={13} /> {primaryClass.schedule || 'Schedule TBA'}
                              </span>
                              {primaryClass.room && (
                                <span className="inline-flex items-center gap-1.5 bg-[#f1f5f9] text-[#64748b] font-medium px-3 py-1 rounded-full text-xs">
                                  <MorphIcon icon={MapPin} size={13} /> {primaryClass.room}
                                </span>
                              )}
                            </>
                          ) : (
                            'Set up class sections and launch live kiosk tokens'
                          )}
                        </div>
                      </div>

                      {primaryClass && (
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#dcfce7] text-[#15803d] font-bold text-xs border border-[#86efac]">
                            <MorphIcon icon={Users} size={13} /> {primaryClass.enrollments?.length || 0} Students Enrolled
                          </span>
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ffffff] text-[#005a36] font-mono font-bold text-xs border border-[#e2e8f0] shadow-sm">
                            Code: {primaryClass.join_code || primaryClass.id.substring(0,6).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </section>

                    {/* Action Buttons Row */}
                    <section className="flex flex-col gap-3">
                      {primaryClass ? (
                        <button
                          onClick={() => handleLaunchKiosk(primaryClass)}
                          className="w-full py-4 px-4 rounded-[16px] bg-[#005a36] text-[#ffffff] font-semibold text-[14px] md:text-[15px] flex items-center justify-center gap-2 hover:bg-[#00482b] active:scale-[0.98] transition-all shadow-sm"
                        >
                          <MorphIcon icon={Tv2} size={18} />
                          Launch Live Attendance Kiosk
                        </button>
                      ) : (
                        <button
                          onClick={() => setShowModal(true)}
                          className="w-full py-4 px-4 rounded-[16px] bg-[#005a36] text-[#ffffff] font-semibold text-[14px] md:text-[15px] flex items-center justify-center gap-2 hover:bg-[#00482b] active:scale-[0.98] transition-all shadow-sm"
                        >
                          <MorphIcon icon={Plus} size={18} />
                          Create First Course
                        </button>
                      )}

                      <div className="flex gap-3">
                        <button
                          onClick={() => setShowModal(true)}
                          className="flex-1 py-3.5 px-3 rounded-[16px] bg-[#f8fafc] text-[#0f172a] border border-[#e2e8f0] font-semibold text-[14px] flex items-center justify-center gap-2 hover:bg-[#f1f5f9] active:scale-[0.98] transition-all shadow-sm"
                        >
                          <MorphIcon icon={Plus} size={16} />
                          New Class
                        </button>
                        <button
                          onClick={handleRefresh}
                          className="flex-1 py-3.5 px-3 rounded-[16px] bg-[#f8fafc] text-[#0f172a] border border-[#e2e8f0] font-semibold text-[14px] flex items-center justify-center gap-2 hover:bg-[#f1f5f9] active:scale-[0.98] transition-all shadow-sm"
                        >
                          <MorphIcon icon={RefreshCw} size={16} className={refreshing ? 'animate-pulse' : ''} />
                          Refresh
                        </button>
                        <button
                          onClick={() => setActiveTab('classes')}
                          className="flex-1 py-3.5 px-3 rounded-[16px] bg-[#f8fafc] text-[#0f172a] border border-[#e2e8f0] font-semibold text-[14px] flex items-center justify-center gap-2 hover:bg-[#f1f5f9] active:scale-[0.98] transition-all shadow-sm"
                        >
                          <MorphIcon icon={BookOpen} size={16} />
                          All ({classes.length})
                        </button>
                      </div>
                    </section>

                    {/* Stat Pair Band — 4-columns on tablet */}
                    <section className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                      <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-[18px] p-4 sm:p-5 flex flex-col gap-1 shadow-sm">
                        <span className="text-[12px] text-[#64748b] font-medium">Class Sections</span>
                        <span className="font-['Source_Serif_4',Georgia,serif] font-bold text-[28px] md:text-[32px] leading-tight text-[#005a36]">
                          {totalClasses}
                        </span>
                      </div>

                      <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-[18px] p-4 sm:p-5 flex flex-col gap-1 shadow-sm">
                        <span className="text-[12px] text-[#64748b] font-medium">Total Students</span>
                        <span className="font-['Source_Serif_4',Georgia,serif] font-bold text-[28px] md:text-[32px] leading-tight text-[#0f172a]">
                          {totalStudents}
                        </span>
                      </div>

                      <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-[18px] p-4 sm:p-5 flex flex-col gap-1 shadow-sm">
                        <span className="text-[12px] text-[#64748b] font-medium">Active Kiosks</span>
                        <span className="font-['Source_Serif_4',Georgia,serif] font-bold text-[28px] md:text-[32px] leading-tight text-[#15803d]">
                          {activeSessionsCount} Live
                        </span>
                      </div>

                      <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-[18px] p-4 sm:p-5 flex flex-col gap-1 shadow-sm">
                        <span className="text-[12px] text-[#64748b] font-medium">Today's Logs</span>
                        <span className="font-['Source_Serif_4',Georgia,serif] font-bold text-[28px] md:text-[32px] leading-tight text-[#d97706]">
                          {todayLogsCount}
                        </span>
                      </div>
                    </section>

                    {/* Quick Class Section Launch List */}
                    <section className="flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] uppercase font-bold tracking-[0.06em] text-[#005a36]">
                          Quick Course Launcher
                        </span>
                        <button
                          onClick={() => setActiveTab('classes')}
                          className="text-[12px] font-semibold text-[#005a36] hover:underline"
                        >
                          View all ({classes.length})
                        </button>
                      </div>

                      <div className="flex flex-col gap-3">
                        {classes.slice(0, 3).map(cls => (
                          <div
                            key={cls.id}
                            className="bg-[#f8fafc] border border-[#e2e8f0] rounded-[20px] p-4 flex flex-col gap-3 shadow-sm hover:border-[#005a36]/30 transition-all"
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <h3 className="font-['Source_Serif_4',Georgia,serif] font-bold text-[16px] text-[#0f172a]">
                                  {cls.name}
                                </h3>
                                <div className="flex flex-wrap items-center gap-1.5 text-[12px] text-[#64748b] mt-1.5">
                                  <span className="inline-flex items-center gap-1 bg-[#e6f2ec] text-[#005a36] font-semibold px-2 py-0.5 rounded-md text-[11px]">
                                    <MorphIcon icon={Clock} size={12} /> {cls.schedule || 'Schedule TBA'}
                                  </span>
                                  {cls.room && (
                                    <span className="inline-flex items-center gap-1 bg-[#f1f5f9] text-[#64748b] font-medium px-2 py-0.5 rounded-md text-[11px]">
                                      <MorphIcon icon={MapPin} size={12} /> {cls.room}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <span className="text-xs font-mono font-bold text-[#005a36] bg-[#e6f2ec] px-2.5 py-0.5 rounded-full">
                                {cls.enrollments?.length || 0} Students
                              </span>
                            </div>

                            <div className="flex gap-2 pt-1 border-t border-[#e2e8f0]">
                              <Link
                                to={`/teacher/attendance/${cls.id}`}
                                className="btn-primary flex-1 justify-center text-xs py-2.5"
                              >
                                <MorphIcon icon={Tv2} size={14} /> Start Kiosk
                              </Link>
                              <Link
                                to={`/teacher/class/${cls.id}`}
                                className="btn-secondary flex-1 justify-center text-xs py-2.5"
                              >
                                Manage Roster
                              </Link>
                              <button
                                onClick={() => setClassToDelete(cls)}
                                className="p-2.5 rounded-[12px] bg-[#fee2e2] text-[#b91c1c] hover:bg-[#fecaca] transition-colors border border-[#fca5a5]/60 flex items-center justify-center"
                                title="Delete Class"
                              >
                                <MorphIcon icon={Trash2} size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  </>
                )}

                {/* ── TAB 2: ALL COURSES (MOBILE/TABLET) ── */}
                {activeTab === 'classes' && (
                  <section className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] uppercase font-bold tracking-[0.06em] text-[#005a36]">
                        All Class Sections ({classes.length})
                      </span>
                      <button
                        onClick={() => setShowModal(true)}
                        className="text-[12px] font-semibold text-[#005a36] flex items-center gap-1 hover:underline"
                      >
                        <MorphIcon icon={Plus} size={14} /> Add Class
                      </button>
                    </div>

                    {classes.length === 0 ? (
                      <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-[24px] p-8 text-center flex flex-col items-center gap-3">
                        <MorphIcon icon={BookOpen} size={32} className="text-[#64748b]" />
                        <p className="text-sm font-semibold text-[#0f172a]">No classes created yet</p>
                        <p className="text-xs text-[#64748b]">Set up your first course to begin tracking roll calls.</p>
                        <button
                          onClick={() => setShowModal(true)}
                          className="py-2.5 px-5 rounded-[16px] bg-[#005a36] text-[#ffffff] font-semibold text-xs mt-2"
                        >
                          Create First Class
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        {classes.map(cls => (
                          <div
                            key={cls.id}
                            className="bg-[#f8fafc] border border-[#e2e8f0] rounded-[20px] p-4 md:p-5 flex flex-col justify-between gap-3 shadow-sm hover:border-[#005a36]/40 transition-all"
                          >
                            <Link to={`/teacher/class/${cls.id}`} className="block group">
                              <div className="flex items-start justify-between mb-1">
                                <h3 className="font-['Source_Serif_4',Georgia,serif] font-bold text-[16px] md:text-[17px] text-[#0f172a] group-hover:text-[#005a36] transition-colors">
                                  {cls.name}
                                </h3>
                                <span className="font-mono text-xs font-bold text-[#005a36] bg-[#e6f2ec] px-2 py-0.5 rounded-md">
                                  {cls.join_code || cls.id.substring(0,6).toUpperCase()}
                                </span>
                              </div>
                              <div className="flex flex-wrap items-center gap-1.5 text-[12px] text-[#64748b] mt-1.5">
                                <span className="inline-flex items-center gap-1 bg-[#e6f2ec] text-[#005a36] font-semibold px-2 py-0.5 rounded-md text-[11px]">
                                  <MorphIcon icon={Clock} size={12} /> {cls.schedule || 'Schedule TBA'}
                                </span>
                                {cls.room && (
                                  <span className="inline-flex items-center gap-1 bg-[#f1f5f9] text-[#64748b] font-medium px-2 py-0.5 rounded-md text-[11px]">
                                    <MorphIcon icon={MapPin} size={12} /> {cls.room}
                                  </span>
                                )}
                              </div>
                              {cls.description && (
                                <p className="text-[11px] text-[#64748b] mt-2 line-clamp-2">{cls.description}</p>
                              )}
                            </Link>

                            <div className="space-y-2 pt-2 border-t border-[#e2e8f0]">
                              <div className="flex items-center justify-between text-[11px] text-[#64748b]">
                                <span>{cls.enrollments?.length || 0} Enrolled Students</span>
                                <span>Join Code Active</span>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleLaunchKiosk(cls)}
                                  className="btn-primary flex-1 justify-center text-xs py-2"
                                >
                                  <MorphIcon icon={Tv2} size={13} /> Kiosk
                                </button>
                                <Link
                                  to={`/teacher/class/${cls.id}`}
                                  className="btn-secondary flex-1 justify-center text-xs py-2"
                                >
                                  Roster
                                </Link>
                                <button
                                  onClick={() => setClassToDelete(cls)}
                                  className="p-2 rounded-[12px] bg-[#fee2e2] text-[#b91c1c] hover:bg-[#fecaca] transition-colors border border-[#fca5a5]/60 flex items-center justify-center"
                                  title="Delete Class"
                                >
                                  <MorphIcon icon={Trash2} size={13} />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                )}

                {/* ── TAB 3: LIVE ACTIVITY / RECENT LOGS (MOBILE/TABLET) ── */}
                {activeTab === 'activity' && (
                  <section className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] uppercase font-bold tracking-[0.06em] text-[#005a36]">
                        Recent Check-in Logs ({logs.length})
                      </span>
                      <span className="text-[12px] font-semibold text-[#005a36]">
                        {todayLogsCount} Today
                      </span>
                    </div>

                    {logs.length === 0 ? (
                      <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-[24px] p-8 text-center shadow-sm">
                        <div className="w-12 h-12 rounded-full bg-[#f8fafc] text-[#94a3b8] flex items-center justify-center mx-auto mb-3">
                          <MorphIcon icon={Calendar} size={22} />
                        </div>
                        <p className="font-['Source_Serif_4',Georgia,serif] font-bold text-base text-[#0f172a] mb-1">No check-ins yet</p>
                        <p className="text-xs text-[#64748b] leading-relaxed max-w-xs mx-auto">
                          Launch a live attendance kiosk to start recording real-time student check-ins.
                        </p>
                      </div>
                    ) : (
                      <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-[22px] p-2 divide-y divide-[#f1f5f9] shadow-sm">
                        {logs.map((log) => (
                          <div key={log.id} className="p-3 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-[#e6f2ec] text-[#005a36] flex items-center justify-center font-bold text-xs">
                                {log.profiles?.full_name?.[0] || 'S'}
                              </div>
                              <div>
                                <p className="font-semibold text-xs text-[#0f172a]">{log.profiles?.full_name || 'Student'}</p>
                                <p className="text-[10px] text-[#64748b]">{log.classes?.name || 'Class'}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <Badge status={log.status} />
                              <p className="text-[9px] text-[#94a3b8] mt-0.5">
                                {log.marked_at ? format(new Date(log.marked_at), 'h:mm a') : ''}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                )}
              </>
            )}

          </div>

          {/* ── Fixed Bottom Tab Bar ── */}
          <nav
            data-component="TeacherTabBar"
            className="fixed bottom-0 left-0 right-0 max-w-md sm:max-w-xl md:max-w-2xl mx-auto h-16 md:h-18 bg-[#ffffff]/95 backdrop-blur-md border-t border-[#e2e8f0] flex items-center justify-between px-6 sm:px-12 md:px-16 z-40 shadow-lg"
          >
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex flex-col items-center gap-1 flex-1 text-[10px] md:text-xs font-semibold transition-all hover:scale-105 active:scale-95 ${
                activeTab === 'overview' ? 'text-[#005a36] font-bold' : 'text-[#64748b]'
              }`}
            >
              <MorphIcon icon={Tv2} size={22} className={activeTab === 'overview' ? 'text-[#005a36]' : 'text-[#64748b]'} />
              <span>Overview</span>
            </button>

            <button
              onClick={() => setActiveTab('classes')}
              className={`flex flex-col items-center gap-1 flex-1 text-[10px] md:text-xs font-semibold transition-all hover:scale-105 active:scale-95 ${
                activeTab === 'classes' ? 'text-[#005a36] font-bold' : 'text-[#64748b]'
              }`}
            >
              <MorphIcon icon={BookOpen} size={22} className={activeTab === 'classes' ? 'text-[#005a36]' : 'text-[#64748b]'} />
              <span>Courses</span>
            </button>

            <button
              onClick={() => setActiveTab('activity')}
              className={`flex flex-col items-center gap-1 flex-1 text-[10px] md:text-xs font-semibold transition-all hover:scale-105 active:scale-95 ${
                activeTab === 'activity' ? 'text-[#005a36] font-bold' : 'text-[#64748b]'
              }`}
            >
              <MorphIcon icon={Calendar} size={22} className={activeTab === 'activity' ? 'text-[#005a36]' : 'text-[#64748b]'} />
              <span>Activity</span>
            </button>
          </nav>

        </div>
      </div>

      {showModal && (
        <CreateClassModal
          onClose={() => setShowModal(false)}
          onCreated={(cls) => setClasses(prev => [cls, ...prev])}
        />
      )}

      {classToDelete && (
        <DeleteClassModal
          className={classToDelete.name}
          onConfirm={handleDeleteClass}
          onCancel={() => setClassToDelete(null)}
          deleting={deletingClass}
        />
      )}

      {scheduleErrorModal && (
        <ScheduleRestrictionModal
          schedule={scheduleErrorModal}
          onClose={() => setScheduleErrorModal(null)}
        />
      )}
    </div>
  )
}

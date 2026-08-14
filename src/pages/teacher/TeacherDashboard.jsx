import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import Navbar from '../../components/common/Navbar'
import Spinner from '../../components/common/Spinner'
import {
  BookOpen, Plus, Users, Calendar, Clock,
  ChevronRight, MapPin, X, AlertCircle
} from 'lucide-react'
import { format } from 'date-fns'

// ── Create Class Modal (NDMC Forest Green Style) ───────────────────────────
function CreateClassModal({ onClose, onCreated }) {
  const { profile } = useAuth()
  const [form, setForm] = useState({ name: '', description: '', schedule: '', room: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error: err } = await supabase
      .from('classes')
      .insert({ ...form, teacher_id: profile.id })
      .select()
      .single()

    if (err) { setError(err.message); setLoading(false); return }
    onCreated(data)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in font-['Gambarino',system-ui,sans-serif]">
      <div className="bg-[#ffffff] text-[#0f172a] w-full max-w-md p-7 rounded-[24px] shadow-2xl border border-[#e2e8f0] relative">
        <button
          onClick={onClose}
          className="absolute right-5 top-5 w-8 h-8 rounded-full bg-[#f1f5f9] flex items-center justify-center text-[#64748b] hover:text-[#0f172a] transition-colors"
        >
          <X size={16} />
        </button>

        <div className="mb-5">
          <span className="text-xs uppercase font-bold tracking-wider text-[#005a36]">Faculty Portal</span>
          <h2 className="font-['Source_Serif_4',Georgia,serif] text-2xl font-bold text-[#0f172a] mt-0.5">
            Create New Class
          </h2>
          <p className="text-[#64748b] text-xs mt-1">Set up a course section to start tracking attendance</p>
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-[#fee2e2] text-[#b91c1c] border border-[#fca5a5] rounded-[16px] px-4 py-3 mb-4 text-xs font-semibold">
            <AlertCircle size={15} />
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
              Description
            </label>
            <textarea
              className="input-field resize-none"
              rows={2}
              placeholder="Brief course outline or subject description..."
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#64748b] mb-1.5">
                Schedule
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="MWF 9:00–10:30 AM"
                value={form.schedule}
                onChange={e => setForm({ ...form, schedule: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#64748b] mb-1.5">
                Room
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="Room 204"
                value={form.room}
                onChange={e => setForm({ ...form, room: e.target.value })}
              />
            </div>
          </div>

          <div className="flex gap-2.5 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center py-3">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center py-3">
              {loading ? <Spinner size="sm" /> : 'Create Class'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Class Card (NDMC Forest Green Style) ──────────────────────────────────
function ClassCard({ cls }) {
  return (
    <Link
      to={`/teacher/class/${cls.id}`}
      className="bg-[#ffffff] border border-[#e2e8f0] rounded-[22px] p-5 group hover:border-[#005a36]/40 hover:shadow-md active:scale-[0.99] transition-all block flex flex-col justify-between"
    >
      <div>
        <div className="flex items-start justify-between mb-3">
          <div className="w-10 h-10 rounded-xl bg-[#e6f2ec] text-[#005a36] flex items-center justify-center shadow-sm">
            <BookOpen size={18} />
          </div>
          <div className="w-7 h-7 rounded-full bg-[#f8fafc] flex items-center justify-center text-[#64748b] group-hover:text-[#005a36] transition-colors">
            <ChevronRight size={15} />
          </div>
        </div>

        <h3 className="font-['Source_Serif_4',Georgia,serif] font-bold text-[#0f172a] text-base mb-1 group-hover:text-[#005a36] transition-colors">
          {cls.name}
        </h3>
        {cls.description && (
          <p className="text-[#64748b] text-xs mb-3 line-clamp-2 leading-relaxed">{cls.description}</p>
        )}
      </div>

      <div className="space-y-1.5 pt-3 border-t border-[#e2e8f0] mt-3">
        {cls.schedule && (
          <div className="flex items-center gap-1.5 text-xs text-[#64748b]">
            <Clock size={12} className="text-[#005a36]" />
            <span>{cls.schedule}</span>
          </div>
        )}
        {cls.room && (
          <div className="flex items-center gap-1.5 text-xs text-[#64748b]">
            <MapPin size={12} className="text-[#005a36]" />
            <span>{cls.room}</span>
          </div>
        )}
      </div>
    </Link>
  )
}

// ── Main Teacher Dashboard ─────────────────────────────────────────────────
export default function TeacherDashboard() {
  const { profile } = useAuth()
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  const fetchClasses = async () => {
    if (!profile?.id) {
      setLoading(false)
      return
    }
    try {
      const { data } = await supabase
        .from('classes')
        .select('*')
        .eq('teacher_id', profile.id)
        .order('created_at', { ascending: false })
      setClasses(data || [])
    } catch (err) {
      console.error('Error fetching classes:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchClasses() }, [profile?.id])

  return (
    <div className="min-h-screen bg-[#f4f6f8] text-[#0f172a] font-['Gambarino',system-ui,sans-serif] selection:bg-[#005a36]/20">
      <Navbar />

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Institutional Forest Green Header Banner (Matches Image Exactly) */}
        <div className="ndmc-banner mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <span className="text-[11px] font-mono tracking-wider opacity-90 block mb-1">
              {format(new Date(), 'yyyy')} - {format(new Date(), 'MMMM d')} • Faculty Dashboard
            </span>
            <h1 className="font-['Source_Serif_4',Georgia,serif] text-2xl sm:text-3xl font-bold tracking-tight">
              Welcome back, {profile?.full_name || 'Faculty Member'}
            </h1>
            <p className="text-xs opacity-90 mt-1">
              Notre Dame of Midsayap College — Smart Attendance Monitoring System
            </p>
          </div>

          <button
            id="create-class-btn"
            onClick={() => setShowModal(true)}
            className="bg-[#ffffff] text-[#005a36] hover:bg-[#f1f5f9] font-bold text-xs py-3 px-5 rounded-[14px] self-start sm:self-center shadow-md transition-all active:scale-[0.98] flex items-center gap-2"
          >
            <Plus size={16} />
            Create New Class
          </button>
        </div>

        {/* Stat Pair Band */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-[20px] p-5 flex flex-col gap-1 shadow-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-[#64748b]">Total Classes</span>
            <span className="font-['Source_Serif_4',Georgia,serif] text-3xl font-bold text-[#005a36]">
              {classes.length}
            </span>
          </div>

          <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-[20px] p-5 flex flex-col gap-1 shadow-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-[#64748b]">Academic Date</span>
            <span className="font-['Source_Serif_4',Georgia,serif] text-3xl font-bold text-[#0f172a]">
              {format(new Date(), 'MMM d')}
            </span>
          </div>

          <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-[20px] p-5 flex flex-col gap-1 shadow-sm col-span-2 sm:col-span-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[#64748b]">System Status</span>
            <div className="flex items-center gap-2 mt-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[#15803d] animate-pulse" />
              <span className="font-semibold text-sm text-[#0f172a]">NDMC Live Sync Active</span>
            </div>
          </div>
        </div>

        {/* Classes Section Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BookOpen size={18} className="text-[#005a36]" />
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
          <div className="flex items-center justify-center py-20">
            <Spinner size="lg" />
          </div>
        ) : classes.length === 0 ? (
          <div className="bg-[#ffffff] rounded-[24px] border border-[#e2e8f0] p-12 text-center max-w-md mx-auto shadow-sm">
            <div className="w-14 h-14 rounded-full bg-[#e6f2ec] text-[#005a36] flex items-center justify-center mx-auto mb-3">
              <BookOpen size={24} />
            </div>
            <h3 className="font-['Source_Serif_4',Georgia,serif] font-bold text-lg text-[#0f172a] mb-1">
              No classes created yet
            </h3>
            <p className="text-xs text-[#64748b] mb-5">
              Click the button below to add your first course section and generate student join codes.
            </p>
            <button onClick={() => setShowModal(true)} className="btn-primary">
              <Plus size={16} />
              Create First Class
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {classes.map(cls => <ClassCard key={cls.id} cls={cls} />)}
          </div>
        )}
      </div>

      {showModal && (
        <CreateClassModal
          onClose={() => setShowModal(false)}
          onCreated={(cls) => setClasses(prev => [cls, ...prev])}
        />
      )}
    </div>
  )
}

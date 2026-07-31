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

// ── Create Class Modal ─────────────────────────────────────────────────────
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="glass-card w-full max-w-md p-6 animate-fade-in">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-white">Create New Class</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2.5 mb-4 text-red-400 text-sm">
            <AlertCircle size={15} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Class Name *</label>
            <input
              type="text"
              className="input-field"
              placeholder="CS101 - Introduction to Programming"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Description</label>
            <textarea
              className="input-field resize-none"
              rows={2}
              placeholder="Brief course description..."
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Schedule</label>
              <input
                type="text"
                className="input-field"
                placeholder="MWF 9:00–10:30 AM"
                value={form.schedule}
                onChange={e => setForm({ ...form, schedule: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Room</label>
              <input
                type="text"
                className="input-field"
                placeholder="Room 201"
                value={form.room}
                onChange={e => setForm({ ...form, room: e.target.value })}
              />
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
              {loading ? <Spinner size="sm" /> : 'Create Class'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Class Card ─────────────────────────────────────────────────────────────
function ClassCard({ cls }) {
  return (
    <Link
      to={`/teacher/class/${cls.id}`}
      className="glass-card p-5 group hover:border-indigo-500/30 hover:shadow-lg hover:shadow-indigo-500/5 transition-all duration-200 block"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center flex-shrink-0">
          <BookOpen size={18} className="text-white" />
        </div>
        <ChevronRight size={16} className="text-slate-600 group-hover:text-indigo-400 transition-colors mt-1" />
      </div>

      <h3 className="font-semibold text-white text-sm mb-1 line-clamp-2 group-hover:text-indigo-200 transition-colors">
        {cls.name}
      </h3>
      {cls.description && (
        <p className="text-slate-500 text-xs mb-3 line-clamp-2">{cls.description}</p>
      )}

      <div className="space-y-1.5 mt-3 pt-3 border-t border-white/5">
        {cls.schedule && (
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Clock size={11} />
            <span>{cls.schedule}</span>
          </div>
        )}
        {cls.room && (
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <MapPin size={11} />
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
    <div className="min-h-screen bg-[#0a0f1e]">
      <Navbar />

      {/* Hero banner */}
      <div className="relative overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-900/30 to-purple-900/20" />
        <div className="absolute top-0 right-0 w-96 h-48 bg-indigo-600/10 rounded-full blur-3xl" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <p className="text-indigo-400 text-sm font-medium mb-1">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
          <h1 className="text-3xl font-bold text-white">
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'},{' '}
            <span className="gradient-text">{profile?.full_name?.split(' ')[0] || 'Teacher'}</span>
          </h1>
          <p className="text-slate-400 mt-1">Manage your classes and take attendance below.</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Total Classes', value: classes.length, icon: BookOpen, color: 'from-indigo-600 to-purple-600' },
            { label: "Today's Date", value: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), icon: Calendar, color: 'from-sky-600 to-indigo-600' },
            { label: 'Active Sessions', value: '—', icon: Users, color: 'from-emerald-600 to-teal-600' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="glass-card p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center flex-shrink-0`}>
                <Icon size={18} className="text-white" />
              </div>
              <div>
                <p className="text-xl font-bold text-white">{value}</p>
                <p className="text-slate-500 text-xs">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Classes header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-white">My Classes</h2>
          <button
            id="create-class-btn"
            onClick={() => setShowModal(true)}
            className="btn-primary btn-sm"
          >
            <Plus size={15} />
            New Class
          </button>
        </div>

        {/* Classes grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Spinner size="lg" />
          </div>
        ) : classes.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto mb-4">
              <BookOpen size={24} className="text-slate-600" />
            </div>
            <h3 className="text-white font-medium mb-1">No classes yet</h3>
            <p className="text-slate-500 text-sm mb-4">Create your first class to get started</p>
            <button onClick={() => setShowModal(true)} className="btn-primary">
              <Plus size={16} />
              Create Class
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

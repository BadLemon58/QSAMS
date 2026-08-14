import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { Settings, Trash2, X, RefreshCw, AlertTriangle } from 'lucide-react'

export default function DebugPanel() {
  const { profile } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  // Only show for specific test accounts
  const isDebugUser = profile?.full_name === 'TestStudent' || profile?.full_name === 'TestTeacher' || profile?.full_name === 'Test Teacher' || profile?.full_name === 'Test Student'

  if (!profile || !isDebugUser) return null

  const handleAction = async (actionFn, successMsg) => {
    setLoading(true)
    setMessage('')
    try {
      await actionFn()
      setMessage(`Success: ${successMsg}`)
      // Reload page to reflect changes after a short delay
      setTimeout(() => window.location.reload(), 1500)
    } catch (err) {
      setMessage(`Error: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const resetStreak = async () => {
    if (!window.confirm('Delete ALL your attendance logs to reset streak?')) return
    await handleAction(async () => {
      const { error } = await supabase
        .from('attendance_logs')
        .delete()
        .eq('student_id', profile.id)
      if (error) throw error
    }, 'Attendance logs deleted and streak reset')
  }

  const clearEnrollments = async () => {
    if (!window.confirm('Delete ALL your class enrollments?')) return
    await handleAction(async () => {
      const { error } = await supabase
        .from('enrollments')
        .delete()
        .eq('student_id', profile.id)
      if (error) throw error
    }, 'All enrollments cleared')
  }

  const deleteClasses = async () => {
    if (!window.confirm('Delete ALL classes you created?')) return
    await handleAction(async () => {
      const { error } = await supabase
        .from('classes')
        .delete()
        .eq('teacher_id', profile.id)
      if (error) throw error
    }, 'All classes deleted')
  }

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 bg-pink-600 hover:bg-pink-700 text-white p-3 rounded-full shadow-lg shadow-pink-500/30 transition-transform hover:scale-105"
        title="Open Debug Panel"
      >
        <Settings size={24} />
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-pink-500/30 rounded-2xl w-full max-w-md p-6 relative shadow-2xl shadow-pink-900/20">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute right-4 top-4 text-slate-500 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
            
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-pink-500/20 text-pink-500 rounded-lg">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Debug Panel</h2>
                <p className="text-xs text-pink-400">Testing actions only</p>
              </div>
            </div>

            {message && (
              <div className={`p-3 rounded-lg mb-4 text-sm font-medium ${message.startsWith('Error') ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}>
                {message}
              </div>
            )}

            <div className="space-y-3">
              {profile.role === 'student' && (
                <>
                  <button
                    onClick={resetStreak}
                    disabled={loading}
                    className="w-full flex items-center justify-between p-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors group disabled:opacity-50"
                  >
                    <div className="flex items-center gap-3 text-white">
                      <RefreshCw size={18} className="text-slate-400 group-hover:text-blue-400" />
                      <div className="text-left">
                        <p className="font-semibold text-sm">Reset Streak & Logs</p>
                        <p className="text-xs text-slate-400">Deletes all your attendance history</p>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={clearEnrollments}
                    disabled={loading}
                    className="w-full flex items-center justify-between p-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors group disabled:opacity-50"
                  >
                    <div className="flex items-center gap-3 text-white">
                      <Trash2 size={18} className="text-slate-400 group-hover:text-red-400" />
                      <div className="text-left">
                        <p className="font-semibold text-sm">Clear Enrollments</p>
                        <p className="text-xs text-slate-400">Unenrolls you from all classes</p>
                      </div>
                    </div>
                  </button>
                </>
              )}

              {profile.role === 'teacher' && (
                <button
                  onClick={deleteClasses}
                  disabled={loading}
                  className="w-full flex items-center justify-between p-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors group disabled:opacity-50"
                >
                  <div className="flex items-center gap-3 text-white">
                    <Trash2 size={18} className="text-slate-400 group-hover:text-red-400" />
                    <div className="text-left">
                      <p className="font-semibold text-sm">Delete All My Classes</p>
                      <p className="text-xs text-slate-400">Removes all your classes & logs</p>
                    </div>
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

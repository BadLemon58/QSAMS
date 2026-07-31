import { useState } from 'react'
import { Search, CheckCircle, XCircle, Clock, ChevronDown } from 'lucide-react'
import Badge from '../common/Badge'

const STATUS_OPTIONS = ['present', 'late', 'absent', 'excused']

/**
 * RosterTable — displays the full student roster with attendance status.
 *
 * Props:
 *   students: Array<{ id, full_name, student_id, status, log_id }>
 *   onStatusChange(studentId, newStatus) — called when teacher manually changes status
 *   loading: boolean
 */
export default function RosterTable({ students = [], onStatusChange, loading = false }) {
  const [search, setSearch] = useState('')
  const [updating, setUpdating] = useState(null)

  const filtered = students.filter(s =>
    s.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.student_id?.toLowerCase().includes(search.toLowerCase())
  )

  const handleChange = async (studentId, newStatus) => {
    setUpdating(studentId)
    await onStatusChange?.(studentId, newStatus)
    setUpdating(null)
  }

  const counts = {
    present: students.filter(s => s.status === 'present').length,
    late:    students.filter(s => s.status === 'late').length,
    absent:  students.filter(s => s.status === 'absent').length,
    total:   students.length,
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total', value: counts.total, color: 'text-slate-300' },
          { label: 'Present', value: counts.present, color: 'text-emerald-400' },
          { label: 'Late', value: counts.late, color: 'text-yellow-400' },
          { label: 'Absent', value: counts.absent, color: 'text-red-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="glass-card p-3 text-center">
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-slate-500 text-xs">{label}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          className="input-field pl-9"
          placeholder="Search by name or student ID..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-400 rounded-full animate-spin mx-auto mb-2" />
            <p className="text-slate-500 text-sm">Loading roster...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-slate-500 text-sm">No students found</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">#</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Student</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">ID</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Override</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map((student, idx) => (
                <tr
                  key={student.id}
                  className="hover:bg-white/[0.02] transition-colors group"
                >
                  <td className="px-4 py-3 text-slate-600 text-sm">{idx + 1}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                        {student.full_name?.[0]?.toUpperCase() || '?'}
                      </div>
                      <span className="text-sm font-medium text-slate-200">{student.full_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500 hidden sm:table-cell font-mono">
                    {student.student_id || '—'}
                  </td>
                  <td className="px-4 py-3">
                    {student.status ? (
                      <Badge status={student.status} />
                    ) : (
                      <span className="text-slate-600 text-xs italic">Not marked</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {updating === student.id ? (
                      <div className="w-4 h-4 border-2 border-indigo-400/40 border-t-indigo-400 rounded-full animate-spin" />
                    ) : (
                      <div className="relative inline-block">
                        <select
                          value={student.status || ''}
                          onChange={e => handleChange(student.id, e.target.value)}
                          className="appearance-none bg-slate-800/60 border border-slate-700/60 text-slate-300 text-xs rounded-lg pl-2.5 pr-6 py-1.5 cursor-pointer hover:border-indigo-500/50 focus:outline-none focus:border-indigo-500 transition-colors"
                        >
                          <option value="" disabled>Mark...</option>
                          {STATUS_OPTIONS.map(s => (
                            <option key={s} value={s}>
                              {s.charAt(0).toUpperCase() + s.slice(1)}
                            </option>
                          ))}
                        </select>
                        <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

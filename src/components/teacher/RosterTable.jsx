import { useState } from 'react'
import { Search, ChevronDown, User } from 'lucide-react'
import Badge from '../common/Badge'

const STATUS_OPTIONS = ['present', 'late', 'absent', 'excused']

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
    <div className="flex flex-col gap-4 font-['Gambarino',system-ui,sans-serif]">
      {/* Stat Pair Cards */}
      <div className="grid grid-cols-4 gap-2.5">
        <div className="bg-[#ffffff] rounded-[18px] p-3 text-center border border-[#e2e8f0] shadow-sm">
          <p className="font-['Source_Serif_4',Georgia,serif] text-xl font-bold text-[#0f172a]">{counts.total}</p>
          <p className="text-[#64748b] text-[10px] uppercase font-bold tracking-wider">Enrolled</p>
        </div>
        <div className="bg-[#ffffff] rounded-[18px] p-3 text-center border border-[#e2e8f0] shadow-sm">
          <p className="font-['Source_Serif_4',Georgia,serif] text-xl font-bold text-[#15803d]">{counts.present}</p>
          <p className="text-[#64748b] text-[10px] uppercase font-bold tracking-wider">Present</p>
        </div>
        <div className="bg-[#ffffff] rounded-[18px] p-3 text-center border border-[#e2e8f0] shadow-sm">
          <p className="font-['Source_Serif_4',Georgia,serif] text-xl font-bold text-[#d97706]">{counts.late}</p>
          <p className="text-[#64748b] text-[10px] uppercase font-bold tracking-wider">Late</p>
        </div>
        <div className="bg-[#ffffff] rounded-[18px] p-3 text-center border border-[#e2e8f0] shadow-sm">
          <p className="font-['Source_Serif_4',Georgia,serif] text-xl font-bold text-[#b91c1c]">{counts.absent}</p>
          <p className="text-[#64748b] text-[10px] uppercase font-bold tracking-wider">Absent</p>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
        <input
          type="text"
          className="input-field pl-10"
          placeholder="Filter students by name or ID..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Table Card (Matches Institutional Assessment Table Style from Image) */}
      <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-[20px] overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-8 text-center">
            <div className="w-6 h-6 border-2 border-[#e2e8f0] border-t-[#005a36] rounded-full animate-spin mx-auto mb-2" />
            <p className="text-[#64748b] text-xs font-semibold">Loading classroom roster...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-[#64748b] text-xs">No students matching search filter</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              {/* Forest Green Table Header like the Assessment screenshot */}
              <tr className="bg-[#005a36] text-[#ffffff]">
                <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-white">#</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-white">Student Name</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-white hidden sm:table-cell">ID Number</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-white">Status</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-white">Override</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e8f0]">
              {filtered.map((student, idx) => (
                <tr
                  key={student.id}
                  className="hover:bg-[#f8fafc] transition-colors group"
                >
                  <td className="px-4 py-3 text-[#64748b] text-xs font-mono">{idx + 1}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-[#005a36] text-[#ffffff] flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden">
                        {student.avatar_url ? (
                          <img src={student.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                        ) : (
                          student.full_name?.[0]?.toUpperCase() || <User size={12} />
                        )}
                      </div>
                      <span className="text-sm font-semibold text-[#0f172a]">{student.full_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-[#64748b] hidden sm:table-cell font-mono">
                    {student.student_id || '—'}
                  </td>
                  <td className="px-4 py-3">
                    {student.status ? (
                      <Badge status={student.status} />
                    ) : (
                      <span className="text-[#94a3b8] text-xs italic">Unrecorded</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {updating === student.id ? (
                      <div className="w-4 h-4 border-2 border-[#cbd5e1] border-t-[#005a36] rounded-full animate-spin" />
                    ) : (
                      <div className="relative inline-block">
                        <select
                          value={student.status || ''}
                          onChange={e => handleChange(student.id, e.target.value)}
                          className="appearance-none bg-[#ffffff] border border-[#cbd5e1] text-[#0f172a] text-xs font-semibold rounded-[12px] pl-2.5 pr-6 py-1.5 cursor-pointer hover:border-[#005a36] focus:outline-none focus:border-[#005a36] shadow-sm transition-colors"
                        >
                          <option value="" disabled>Mark...</option>
                          {STATUS_OPTIONS.map(s => (
                            <option key={s} value={s}>
                              {s.charAt(0).toUpperCase() + s.slice(1)}
                            </option>
                          ))}
                        </select>
                        <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#94a3b8] pointer-events-none" />
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

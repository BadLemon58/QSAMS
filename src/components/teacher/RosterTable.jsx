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
        <div className="bg-[#ebebeb] rounded-[18px] p-3 text-center border border-[rgba(0,0,0,0.06)]">
          <p className="font-['Source_Serif_4',Georgia,serif] text-xl font-bold text-[#1a1a1a]">{counts.total}</p>
          <p className="text-[#7a7a7a] text-[10px] uppercase font-bold tracking-wider">Enrolled</p>
        </div>
        <div className="bg-[#ebebeb] rounded-[18px] p-3 text-center border border-[rgba(0,0,0,0.06)]">
          <p className="font-['Source_Serif_4',Georgia,serif] text-xl font-bold text-[#15803D]">{counts.present}</p>
          <p className="text-[#7a7a7a] text-[10px] uppercase font-bold tracking-wider">Present</p>
        </div>
        <div className="bg-[#ebebeb] rounded-[18px] p-3 text-center border border-[rgba(0,0,0,0.06)]">
          <p className="font-['Source_Serif_4',Georgia,serif] text-xl font-bold text-[#A16207]">{counts.late}</p>
          <p className="text-[#7a7a7a] text-[10px] uppercase font-bold tracking-wider">Late</p>
        </div>
        <div className="bg-[#ebebeb] rounded-[18px] p-3 text-center border border-[rgba(0,0,0,0.06)]">
          <p className="font-['Source_Serif_4',Georgia,serif] text-xl font-bold text-[#B91C1C]">{counts.absent}</p>
          <p className="text-[#7a7a7a] text-[10px] uppercase font-bold tracking-wider">Absent</p>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7a7a7a]" />
        <input
          type="text"
          className="input-field pl-10"
          placeholder="Filter students by name or ID..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Table Card */}
      <div className="bg-[#ebebeb] border border-[rgba(0,0,0,0.06)] rounded-[24px] overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-8 text-center">
            <div className="w-6 h-6 border-2 border-[#ebebeb] border-t-[#ee6a2a] rounded-full animate-spin mx-auto mb-2" />
            <p className="text-[#7a7a7a] text-xs font-semibold">Loading classroom roster...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-[#7a7a7a] text-xs">No students matching search filter</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[rgba(0,0,0,0.06)] bg-[#f5f5f5]/60">
                <th className="text-left px-4 py-3 text-[10px] font-bold text-[#7a7a7a] uppercase tracking-wider">#</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold text-[#7a7a7a] uppercase tracking-wider">Student</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold text-[#7a7a7a] uppercase tracking-wider hidden sm:table-cell">ID</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold text-[#7a7a7a] uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold text-[#7a7a7a] uppercase tracking-wider">Override</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(0,0,0,0.06)]">
              {filtered.map((student, idx) => (
                <tr
                  key={student.id}
                  className="hover:bg-[#e2e2e2]/60 transition-colors group"
                >
                  <td className="px-4 py-3 text-[#7a7a7a] text-xs font-mono">{idx + 1}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-[#f7b500] text-[#000000] flex items-center justify-center text-xs font-bold shrink-0">
                        {student.avatar_url ? (
                          <img src={student.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                        ) : (
                          student.full_name?.[0]?.toUpperCase() || <User size={12} />
                        )}
                      </div>
                      <span className="text-sm font-semibold text-[#1a1a1a]">{student.full_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-[#7a7a7a] hidden sm:table-cell font-mono">
                    {student.student_id || '—'}
                  </td>
                  <td className="px-4 py-3">
                    {student.status ? (
                      <Badge status={student.status} />
                    ) : (
                      <span className="text-[#7a7a7a] text-xs italic">Unrecorded</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {updating === student.id ? (
                      <div className="w-4 h-4 border-2 border-[#DDD9D3] border-t-[#ee6a2a] rounded-full animate-spin" />
                    ) : (
                      <div className="relative inline-block">
                        <select
                          value={student.status || ''}
                          onChange={e => handleChange(student.id, e.target.value)}
                          className="appearance-none bg-[#ffffff] border border-[#DDD9D3] text-[#1a1a1a] text-xs font-semibold rounded-[12px] pl-2.5 pr-6 py-1.5 cursor-pointer hover:border-[#ee6a2a] focus:outline-none focus:border-[#ee6a2a] shadow-sm transition-colors"
                        >
                          <option value="" disabled>Mark...</option>
                          {STATUS_OPTIONS.map(s => (
                            <option key={s} value={s}>
                              {s.charAt(0).toUpperCase() + s.slice(1)}
                            </option>
                          ))}
                        </select>
                        <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#7a7a7a] pointer-events-none" />
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

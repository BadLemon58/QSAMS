import { X, AlertCircle, Clock, CalendarDays } from 'lucide'
import { MorphIcon } from 'morphicons/react'
import { format } from 'date-fns'
import { useTheme } from '../../contexts/ThemeContext'

export default function ScheduleRestrictionModal({ schedule, onClose, buttonLabel = 'Understood' }) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  const now = new Date()
  const currentFormatted = format(now, 'EEEE, h:mm a')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in font-['Gambarino',system-ui,sans-serif]">
      <div className={`w-full max-w-md p-6 sm:p-7 rounded-[26px] shadow-2xl border-2 border-[#ef4444] relative text-center transition-colors ${
        isDark
          ? 'bg-[#1e293b] text-[#f8fafc]'
          : 'bg-[#ffffff] text-[#0f172a]'
      }`}>
        {/* Close Button */}
        <button
          onClick={onClose}
          className={`absolute right-4 top-4 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
            isDark
              ? 'bg-[#7f1d1d]/40 text-[#fca5a5] hover:bg-[#7f1d1d]/60'
              : 'bg-[#fef2f2] text-[#ef4444] hover:bg-[#fee2e2]'
          }`}
        >
          <MorphIcon icon={X} size={16} />
        </button>

        {/* Error Icon Badge with Red Outline */}
        <div className={`w-14 h-14 rounded-[20px] border-2 border-[#fca5a5] flex items-center justify-center mx-auto mb-3.5 shadow-sm ${
          isDark
            ? 'bg-[#7f1d1d]/40 border-[#ef4444]/50 text-[#fca5a5]'
            : 'bg-[#fef2f2] text-[#dc2626]'
        }`}>
          <MorphIcon icon={AlertCircle} size={30} />
        </div>

        {/* Tag */}
        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider mb-2.5 border ${
          isDark
            ? 'bg-[#991b1b]/50 text-[#fca5a5] border-[#ef4444]/50'
            : 'bg-[#fee2e2] text-[#b91c1c] border-[#fca5a5]/60'
        }`}>
          <MorphIcon icon={Clock} size={13} />
          <span>Attendance Window Closed</span>
        </div>

        <h3 className={`font-['Source_Serif_4',Georgia,serif] text-xl font-bold mb-2 ${
          isDark ? 'text-[#f8fafc]' : 'text-[#0f172a]'
        }`}>
          Cannot Start Attendance Session
        </h3>

        <p className={`text-xs sm:text-sm leading-relaxed mb-5 ${
          isDark ? 'text-[#94a3b8]' : 'text-[#64748b]'
        }`}>
          Live attendance sessions can only be launched within <strong className={isDark ? 'text-[#f8fafc]' : 'text-[#0f172a]'}>30 minutes</strong> before or after the designated class schedule.
        </p>

        {/* Schedule vs Current Time Breakdown */}
        <div className={`border rounded-[18px] p-4 text-left space-y-2.5 mb-6 ${
          isDark
            ? 'bg-[#7f1d1d]/20 border-[#ef4444]/30'
            : 'bg-[#fef2f2]/60 border-[#fecaca]'
        }`}>
          <div className="flex items-center justify-between text-xs">
            <span className={`font-semibold flex items-center gap-1.5 ${
              isDark ? 'text-[#fca5a5]' : 'text-[#991b1b]'
            }`}>
              <MorphIcon icon={CalendarDays} size={14} /> Scheduled Time:
            </span>
            <span className={`font-mono font-bold px-2.5 py-0.5 rounded-lg border ${
              isDark
                ? 'text-[#fecaca] bg-[#991b1b]/50 border-[#ef4444]/50'
                : 'text-[#b91c1c] bg-[#fee2e2] border-[#fca5a5]/70'
            }`}>
              {schedule || 'Not Specified'}
            </span>
          </div>

          <div className={`flex items-center justify-between text-xs pt-2 border-t ${
            isDark ? 'border-[#ef4444]/30' : 'border-[#fecaca]'
          }`}>
            <span className={`font-semibold flex items-center gap-1.5 ${
              isDark ? 'text-[#cbd5e1]' : 'text-[#64748b]'
            }`}>
              <MorphIcon icon={Clock} size={14} /> Current Time:
            </span>
            <span className={`font-mono font-semibold ${
              isDark ? 'text-[#f8fafc]' : 'text-[#0f172a]'
            }`}>
              {currentFormatted}
            </span>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={onClose}
          className="w-full py-3.5 px-4 rounded-[16px] bg-[#dc2626] hover:bg-[#b91c1c] text-white font-semibold text-sm shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
        >
          {buttonLabel}
        </button>
      </div>
    </div>
  )
}

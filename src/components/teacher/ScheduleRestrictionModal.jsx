import { X, AlertCircle, Clock, CalendarDays } from 'lucide'
import { MorphIcon } from 'morphicons/react'
import { format } from 'date-fns'

export default function ScheduleRestrictionModal({ schedule, onClose, buttonLabel = 'Understood' }) {
  const now = new Date()
  const currentFormatted = format(now, 'EEEE, h:mm a')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in font-['Gambarino',system-ui,sans-serif]">
      <div className="bg-[#ffffff] dark:bg-[#1e293b] text-[#0f172a] dark:text-[#f8fafc] w-full max-w-md p-6 sm:p-7 rounded-[26px] shadow-2xl border-2 border-[#ef4444] relative text-center">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 w-8 h-8 rounded-full bg-[#fef2f2] dark:bg-[#7f1d1d]/40 text-[#ef4444] dark:text-[#fca5a5] flex items-center justify-center hover:bg-[#fee2e2] dark:hover:bg-[#7f1d1d]/60 transition-colors"
        >
          <MorphIcon icon={X} size={16} />
        </button>

        {/* Error Icon Badge with Red Outline */}
        <div className="w-14 h-14 rounded-[20px] bg-[#fef2f2] dark:bg-[#7f1d1d]/40 border-2 border-[#fca5a5] dark:border-[#ef4444]/50 text-[#dc2626] dark:text-[#fca5a5] flex items-center justify-center mx-auto mb-3.5 shadow-sm">
          <MorphIcon icon={AlertCircle} size={30} />
        </div>

        {/* Tag */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#fee2e2] dark:bg-[#991b1b]/50 text-[#b91c1c] dark:text-[#fca5a5] text-[11px] font-bold uppercase tracking-wider mb-2.5 border border-[#fca5a5]/60 dark:border-[#ef4444]/50">
          <MorphIcon icon={Clock} size={13} />
          <span>Attendance Window Closed</span>
        </div>

        <h3 className="font-['Source_Serif_4',Georgia,serif] text-xl font-bold text-[#0f172a] dark:text-[#f8fafc] mb-2">
          Cannot Start Attendance Session
        </h3>

        <p className="text-[#64748b] dark:text-[#94a3b8] text-xs sm:text-sm leading-relaxed mb-5">
          Live attendance sessions can only be launched within <strong className="text-[#0f172a] dark:text-[#f8fafc]">30 minutes</strong> before or after the designated class schedule.
        </p>

        {/* Schedule vs Current Time Breakdown */}
        <div className="bg-[#fef2f2]/60 dark:bg-[#7f1d1d]/20 border border-[#fecaca] dark:border-[#ef4444]/30 rounded-[18px] p-4 text-left space-y-2.5 mb-6">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#991b1b] dark:text-[#fca5a5] font-semibold flex items-center gap-1.5">
              <MorphIcon icon={CalendarDays} size={14} /> Scheduled Time:
            </span>
            <span className="font-mono font-bold text-[#b91c1c] dark:text-[#fecaca] bg-[#fee2e2] dark:bg-[#991b1b]/50 px-2.5 py-0.5 rounded-lg border border-[#fca5a5]/70 dark:border-[#ef4444]/50">
              {schedule || 'Not Specified'}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs pt-2 border-t border-[#fecaca] dark:border-[#ef4444]/30">
            <span className="text-[#64748b] dark:text-[#cbd5e1] font-semibold flex items-center gap-1.5">
              <MorphIcon icon={Clock} size={14} /> Current Time:
            </span>
            <span className="font-mono font-semibold text-[#0f172a] dark:text-[#f8fafc]">
              {currentFormatted}
            </span>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={onClose}
          className="w-full py-3.5 px-4 rounded-[16px] bg-[#dc2626] hover:bg-[#b91c1c] text-white font-semibold text-sm shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2"
        >
          {buttonLabel}
        </button>
      </div>
    </div>
  )
}

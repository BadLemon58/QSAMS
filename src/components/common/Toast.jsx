import { useEffect } from 'react'
import { MorphIcon } from 'morphicons/react'
import { CheckCircle, AlertCircle, Trash2, X, Info } from 'lucide'

/**
 * Toast Notification Component
 * Displays actionable feedback, such as when a class or student has been deleted.
 */
export default function Toast({
  message,
  type = 'success',
  onDone,
  duration = 4000
}) {
  useEffect(() => {
    if (!onDone) return
    const timer = setTimeout(onDone, duration)
    return () => clearTimeout(timer)
  }, [onDone, duration])

  const isDelete = type === 'delete'
  const isError = type === 'error'
  const isInfo = type === 'info'

  const iconComponent = isDelete
    ? Trash2
    : isError
      ? AlertCircle
      : isInfo
        ? Info
        : CheckCircle

  const badgeBg = isDelete || isError
    ? 'bg-[#fee2e2] text-[#b91c1c]'
    : isInfo
      ? 'bg-[#e0f2fe] text-[#0284c7]'
      : 'bg-[#dcfce7] text-[#15803d]'

  const borderColor = isDelete || isError
    ? 'border-[#fca5a5]'
    : isInfo
      ? 'border-[#bae6fd]'
      : 'border-[#86efac]'

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-[100] flex items-center gap-3 px-4 py-3 bg-[#ffffff] border ${borderColor} text-[#0f172a] rounded-[20px] shadow-[0_12px_36px_rgba(0,0,0,0.14)] font-['Gambarino',system-ui,sans-serif] animate-fade-in max-w-sm sm:max-w-md select-none`}
    >
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${badgeBg}`}>
        <MorphIcon icon={iconComponent} size={16} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-xs sm:text-sm font-semibold text-[#0f172a] leading-snug break-words">
          {message}
        </p>
      </div>

      {onDone && (
        <button
          type="button"
          onClick={onDone}
          className="w-7 h-7 rounded-full flex items-center justify-center text-[#94a3b8] hover:text-[#0f172a] hover:bg-[#f1f5f9] transition-colors shrink-0 ml-1 active:scale-95 cursor-pointer"
          aria-label="Close notification"
        >
          <MorphIcon icon={X} size={14} />
        </button>
      )}
    </div>
  )
}

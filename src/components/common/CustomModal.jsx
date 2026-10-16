import { useEffect, useRef } from 'react'
import { MorphIcon } from 'morphicons/react'
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Info,
  Trash2,
  X,
  Smartphone,
  Monitor
} from 'lucide'
import { useTheme } from '../../contexts/ThemeContext'

/**
 * CustomModal Component
 * Premium NDMC Forest Green-themed modal dialog replacing native browser alerts & confirms.
 * Dynamically conforms to current theme (light or dark).
 */
export default function CustomModal({
  isOpen = true,
  title,
  message,
  type = 'info', // 'info' | 'warning' | 'danger' | 'error' | 'success'
  badge,
  icon: CustomIcon,
  instructions = null, // array of { platform, step } or strings
  details = null,
  confirmText = 'OK',
  cancelText = null, // if provided, modal acts as a confirmation modal with 2 buttons
  isDestructive = false,
  onConfirm,
  onCancel,
  onClose,
}) {
  const modalRef = useRef(null)
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (cancelText && onCancel) {
          onCancel()
        } else if (onClose) {
          onClose()
        } else if (onConfirm) {
          onConfirm()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, cancelText, onCancel, onClose, onConfirm])

  if (!isOpen) return null

  const isErrorOrDanger = type === 'danger' || type === 'error' || isDestructive
  const isWarning = type === 'warning'
  const isSuccess = type === 'success'

  // Icon resolution
  const IconComponent = CustomIcon || (
    isErrorOrDanger
      ? (isDestructive ? Trash2 : AlertCircle)
      : isWarning
        ? AlertTriangle
        : isSuccess
          ? CheckCircle
          : Info
  )

  // Category pill badge styling
  const badgeStyle = isErrorOrDanger
    ? (isDark ? 'bg-[#7f1d1d]/40 text-[#fca5a5] border-[#ef4444]/50' : 'bg-[#fee2e2] text-[#b91c1c] border-[#fca5a5]/70')
    : isWarning
      ? (isDark ? 'bg-[#78350f]/40 text-[#fcd34d] border-[#d97706]/50' : 'bg-[#fef3c7] text-[#b45309] border-[#fde68a]/80')
      : isSuccess
        ? (isDark ? 'bg-[#14532d]/40 text-[#86efac] border-[#22c55e]/50' : 'bg-[#dcfce7] text-[#15803d] border-[#86efac]/80')
        : (isDark ? 'bg-[#005a36]/20 text-[#86efac] border-[#005a36]/40' : 'bg-[#e6f2ec] text-[#005a36] border-[#005a36]/30')

  // Icon container badge styling
  const iconContainerBg = isErrorOrDanger
    ? (isDark ? 'bg-[#7f1d1d]/40 border-2 border-[#ef4444]/50 text-[#fca5a5]' : 'bg-[#fef2f2] border-2 border-[#fca5a5] text-[#dc2626]')
    : isWarning
      ? (isDark ? 'bg-[#78350f]/40 border-2 border-[#d97706]/50 text-[#fcd34d]' : 'bg-[#fffbeb] border-2 border-[#fde68a] text-[#d97706]')
      : isSuccess
        ? (isDark ? 'bg-[#14532d]/40 border-2 border-[#22c55e]/50 text-[#86efac]' : 'bg-[#f0fdf4] border-2 border-[#86efac] text-[#16a34a]')
        : (isDark ? 'bg-[#005a36]/30 border-2 border-[#005a36]/50 text-[#86efac]' : 'bg-[#e6f2ec] border-2 border-[#005a36]/30 text-[#005a36]')

  // Default category badge text
  const badgeLabel = badge || (
    isErrorOrDanger
      ? (isDestructive ? 'Destructive Action' : 'System Alert')
      : isWarning
        ? 'Action Confirmation'
        : isSuccess
          ? 'Completed'
          : 'Notice'
  )

  // Primary confirm button styling
  const confirmBtnStyle = isErrorOrDanger
    ? 'bg-[#dc2626] hover:bg-[#b91c1c] text-white shadow-red-500/20'
    : isWarning
      ? (isDestructive ? 'bg-[#dc2626] hover:bg-[#b91c1c] text-white shadow-red-500/20' : 'bg-[#d97706] hover:bg-[#b45309] text-white shadow-amber-500/20')
      : 'bg-[#005a36] hover:bg-[#00482b] text-white shadow-[#005a36]/20'

  const handleBackdropClick = (e) => {
    if (modalRef.current && !modalRef.current.contains(e.target)) {
      if (cancelText && onCancel) {
        onCancel()
      } else if (onClose) {
        onClose()
      } else if (onConfirm) {
        onConfirm()
      }
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={handleBackdropClick}
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in font-['Gambarino',system-ui,sans-serif]"
    >
      <div
        ref={modalRef}
        className={`w-full max-w-sm sm:max-w-md p-6 sm:p-7 rounded-[26px] shadow-2xl relative text-center border animate-in zoom-in-95 duration-200 transition-colors ${
          isDark
            ? 'bg-[#1e293b] text-[#f8fafc] border-[#334155]'
            : 'bg-[#ffffff] text-[#0f172a] border-[#e2e8f0]'
        }`}
      >
        {/* Close 'X' Button */}
        {(onClose || onCancel) && (
          <button
            type="button"
            onClick={onCancel || onClose}
            className={`absolute right-4 top-4 w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
              isDark
                ? 'bg-[#334155] text-[#cbd5e1] hover:bg-[#475569]'
                : 'bg-[#f1f5f9] text-[#64748b] hover:bg-[#e2e8f0] hover:text-[#0f172a]'
            }`}
            aria-label="Close dialog"
          >
            <MorphIcon icon={X} size={16} />
          </button>
        )}

        {/* Header Icon */}
        <div className={`w-14 h-14 rounded-[20px] ${iconContainerBg} flex items-center justify-center mx-auto mb-3.5 shadow-sm`}>
          <MorphIcon icon={IconComponent} size={28} />
        </div>

        {/* Pill Badge */}
        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider mb-2.5 border ${badgeStyle}`}>
          <span>{badgeLabel}</span>
        </div>

        {/* Title */}
        {title && (
          <h3 className={`font-['Source_Serif_4',Georgia,serif] text-xl font-bold mb-2 leading-snug ${
            isDark ? 'text-[#f8fafc]' : 'text-[#0f172a]'
          }`}>
            {title}
          </h3>
        )}

        {/* Message */}
        {message && (
          <p className={`text-xs sm:text-sm leading-relaxed mb-4 whitespace-pre-line text-center ${
            isDark ? 'text-[#94a3b8]' : 'text-[#64748b]'
          }`}>
            {message}
          </p>
        )}

        {/* Structured Instructions / Steps (if provided) */}
        {instructions && Array.isArray(instructions) && instructions.length > 0 && (
          <div className={`border rounded-[18px] p-3.5 text-left space-y-2.5 mb-5 ${
            isDark
              ? 'bg-[#0f172a]/60 border-[#334155]'
              : 'bg-[#f8fafc] border-[#e2e8f0]'
          }`}>
            {instructions.map((item, idx) => {
              const platform = typeof item === 'object' ? item.platform : null
              const step = typeof item === 'object' ? item.step : item
              const isDesktop = platform?.toLowerCase().includes('desktop')
              const PlatformIcon = isDesktop ? Monitor : Smartphone

              return (
                <div key={idx} className={`flex items-start gap-2.5 text-xs ${
                  isDark ? 'text-[#cbd5e1]' : 'text-[#334155]'
                }`}>
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                    isDark ? 'bg-[#005a36]/30 text-[#86efac]' : 'bg-[#e6f2ec] text-[#005a36]'
                  }`}>
                    <MorphIcon icon={PlatformIcon} size={13} />
                  </div>
                  <div className="flex-1">
                    {platform && (
                      <span className={`font-bold block mb-0.5 ${
                        isDark ? 'text-[#f8fafc]' : 'text-[#0f172a]'
                      }`}>
                        {platform}
                      </span>
                    )}
                    <span className={`leading-snug ${
                      isDark ? 'text-[#94a3b8]' : 'text-[#64748b]'
                    }`}>{step}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Optional details box */}
        {details && (
          <div className={`border rounded-[16px] p-3 text-left text-xs font-mono mb-5 overflow-x-auto break-all ${
            isDark
              ? 'bg-[#0f172a]/60 border-[#334155] text-[#94a3b8]'
              : 'bg-[#f1f5f9] border-[#e2e8f0] text-[#475569]'
          }`}>
            {details}
          </div>
        )}

        {/* Action Buttons */}
        <div className={`flex gap-3 mt-2 ${cancelText ? 'items-center' : ''}`}>
          {cancelText && (
            <button
              type="button"
              onClick={onCancel || onClose}
              className={`flex-1 py-3 px-4 rounded-[16px] font-semibold text-xs sm:text-sm transition-all active:scale-[0.98] cursor-pointer ${
                isDark
                  ? 'bg-[#334155] text-[#cbd5e1] hover:bg-[#475569]'
                  : 'bg-[#f1f5f9] text-[#475569] hover:bg-[#e2e8f0]'
              }`}
            >
              {cancelText}
            </button>
          )}

          <button
            type="button"
            onClick={onConfirm || onClose}
            className={`${cancelText ? 'flex-1' : 'w-full'} py-3 px-4 rounded-[16px] ${confirmBtnStyle} font-semibold text-xs sm:text-sm shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

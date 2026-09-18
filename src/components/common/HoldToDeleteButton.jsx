import { useState, useRef, useEffect } from 'react'
import { MorphIcon } from 'morphicons/react';
import { Trash2 } from 'lucide';
import Spinner from './Spinner'

/**
 * HoldToDeleteButton
 * Smoothly and slowly fills across the button until reaching the required time.
 */
export default function HoldToDeleteButton({
  onConfirm,
  durationMs = 1200,
  label = 'Delete Class',
  deleting = false,
  className = ''
}) {
  const [holding, setHolding] = useState(false)
  const timerRef = useRef(null)

  const handleHoldStart = (e) => {
    if (deleting) return
    if (e.type === 'touchstart') {
      e.stopPropagation()
    }

    setHolding(true)

    timerRef.current = setTimeout(() => {
      setHolding(false)
      if (onConfirm) onConfirm()
    }, durationMs)
  }

  const handleHoldEnd = () => {
    if (deleting) return
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    setHolding(false)
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [])

  return (
    <button
      type="button"
      onMouseDown={handleHoldStart}
      onMouseUp={handleHoldEnd}
      onMouseLeave={handleHoldEnd}
      onTouchStart={handleHoldStart}
      onTouchEnd={handleHoldEnd}
      onTouchCancel={handleHoldEnd}
      disabled={deleting}
      className={`relative flex-1 overflow-hidden select-none py-3 px-4 rounded-[14px] font-bold text-xs flex items-center justify-center gap-1.5 active:scale-[0.98] border border-[#ef4444] bg-[#ffffff] hover:bg-[#fef2f2] text-[#ef4444] ${className}`}
      style={{ touchAction: 'none' }}
    >
      {/* Slow, Continuous Linear Progress Fill Layer */}
      <div
        className="absolute inset-0 bg-[#dc2626] origin-left pointer-events-none"
        style={{
          transform: holding ? 'scaleX(1)' : 'scaleX(0)',
          transition: holding
            ? `transform ${durationMs}ms linear`
            : 'transform 0.18s cubic-bezier(0.4, 0, 0.2, 1)',
          willChange: 'transform'
        }}
      />

      {/* Button Content */}
      <span className="relative z-10 flex items-center justify-center gap-1.5 text-center font-bold">
        {deleting ? (
          <>
            <Spinner size="sm" />
            <span className="text-[#b91c1c]">Deleting...</span>
          </>
        ) : (
          <>
            <MorphIcon
              icon={Trash2}
              size={14}
              className={`transition-colors duration-150 ${holding ? 'text-white' : 'text-[#ef4444]'}`}
            />
            <span className={`transition-colors duration-150 ${holding ? 'text-white drop-shadow-sm' : 'text-[#ef4444]'}`}>
              {label}
            </span>
          </>
        )}
      </span>
    </button>
  )
}

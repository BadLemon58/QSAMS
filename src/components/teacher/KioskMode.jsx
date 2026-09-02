import { useEffect, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { QRCodeSVG } from 'qrcode.react'
import { v4 as uuidv4 } from 'uuid'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { RefreshCw, Clock, Shield, Tv2, AlertCircle, Maximize2, X } from 'lucide';
import { MorphIcon } from 'morphicons/react';
import { QrBoxSkeleton } from '../common/Skeleton'

const TOKEN_DURATION_MS = 15 * 1000 // 15 seconds

export default function KioskMode({ classId, classInfo: propClassInfo }) {
  const { profile } = useAuth()
  const [classInfo, setClassInfo] = useState(propClassInfo || null)
  const [session, setSession] = useState(null)
  const [timeLeft, setTimeLeft] = useState(15)
  const [initialLoading, setInitialLoading] = useState(true)
  const [error, setError] = useState('')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
  const cachedLocationRef = useRef(null)
  const rotatingRef = useRef(false)

  // Sync / fetch class info for subject name
  useEffect(() => {
    if (propClassInfo) {
      setClassInfo(propClassInfo)
      return
    }
    if (!classId) return
    const fetchClass = async () => {
      const { data } = await supabase
        .from('classes')
        .select('*')
        .eq('id', classId)
        .single()
      if (data) setClassInfo(data)
    }
    fetchClass()
  }, [classId, propClassInfo])

  // Live time clock
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Keyboard shortcut: Esc to exit fullscreen
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsFullscreen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // 1. Fetch Geolocation once and cache it
  const fetchAndCacheLocation = () => {
    if (!navigator.geolocation) return Promise.resolve(null)
    if (cachedLocationRef.current) return Promise.resolve(cachedLocationRef.current)

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          }
          cachedLocationRef.current = loc
          resolve(loc)
        },
        (err) => {
          console.warn('Geolocation warning:', err)
          resolve(null)
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 60000 }
      )
    })
  }

  // 2. Fast token generation & rotation
  const rotateSessionToken = async (isFirst = false) => {
    if (rotatingRef.current) return
    rotatingRef.current = true

    if (isFirst) setInitialLoading(true)
    setError('')

    const token = uuidv4()
    const expiresAt = new Date(Date.now() + TOKEN_DURATION_MS).toISOString()
    const today = new Date().toLocaleDateString('en-CA')

    const loc = cachedLocationRef.current || await fetchAndCacheLocation()

    try {
      let currentSessionId = session?.id

      if (!currentSessionId) {
        const { data: existing } = await supabase
          .from('attendance_sessions')
          .select('*')
          .eq('class_id', classId)
          .eq('date', today)
          .eq('is_active', true)
          .maybeSingle()

        if (existing) {
          currentSessionId = existing.id
        }
      }

      let resultData = null
      let resultError = null

      if (currentSessionId) {
        const { data, error } = await supabase
          .from('attendance_sessions')
          .update({
            session_token: token,
            expires_at: expiresAt,
            latitude: loc?.latitude || null,
            longitude: loc?.longitude || null,
          })
          .eq('id', currentSessionId)
          .select()
          .single()

        resultData = data
        resultError = error
      } else {
        await supabase
          .from('attendance_sessions')
          .update({ is_active: false })
          .eq('class_id', classId)
          .eq('is_active', true)

        const { data, error } = await supabase
          .from('attendance_sessions')
          .insert({
            class_id: classId,
            teacher_id: profile.id,
            session_token: token,
            date: today,
            expires_at: expiresAt,
            is_active: true,
            latitude: loc?.latitude || null,
            longitude: loc?.longitude || null,
          })
          .select()
          .single()

        resultData = data
        resultError = error
      }

      if (resultError) {
        setError(resultError.message)
      } else if (resultData) {
        setSession(resultData)
        setTimeLeft(15)
      }
    } catch (err) {
      setError(err?.message || 'Error updating token')
    } finally {
      rotatingRef.current = false
      if (isFirst) setInitialLoading(false)
    }
  }

  // Initial mount: start session & warm up geolocation
  useEffect(() => {
    fetchAndCacheLocation()
    rotateSessionToken(true)
  }, [classId])

  // Countdown timer: smooth 1s tick, auto-rotate at 0
  useEffect(() => {
    if (!session) return

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          rotateSessionToken(false)
          return 15
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [session?.id])

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0')
    const s = (seconds % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  const pct = (timeLeft / 15) * 100
  const isExpiringSoon = timeLeft <= 3 && timeLeft > 0

  const qrValue = session
    ? JSON.stringify({ type: 'attendance', sessionId: session.id, token: session.session_token, classId })
    : ''

  return (
    <div className="flex flex-col items-center gap-5">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center gap-1.5 bg-[#e6f2ec] border border-[#005a36]/20 rounded-full px-3.5 py-1 mb-2 text-xs font-bold text-[#005a36] shadow-sm">
          <MorphIcon icon={Tv2} size={13} />
          <span>Kiosk Projection</span>
        </div>
        <p className="text-[#64748b] text-xs">Students scan this dynamic QR code using the QSAMS app</p>
      </div>

      {/* QR Code Container with Pulse Ring */}
      <div className="relative">
        {initialLoading ? (
          <QrBoxSkeleton />
        ) : session ? (
          <div className="relative group p-5 bg-[#ffffff] rounded-[24px] shadow-sm flex items-center justify-center border border-[#e2e8f0]">
            <div
              className="absolute inset-[-6px] rounded-[28px] border-2 border-[#005a36]/20 opacity-55 pointer-events-none"
              style={{ animation: 'gesso-qr-breathe 3.2s ease-in-out infinite' }}
            />
            <QRCodeSVG
              value={qrValue}
              size={210}
              level="H"
              includeMargin={false}
              fgColor="#005a36"
            />
            <button
              onClick={() => setIsFullscreen(true)}
              className="absolute top-2 right-2 p-1.5 bg-white/95 backdrop-blur shadow-sm border border-gray-200 rounded-full text-gray-600 hover:text-[#005a36] hover:bg-gray-50 opacity-0 group-hover:opacity-100 transition-all duration-200"
              title="Full Screen Mode"
            >
              <MorphIcon icon={Maximize2} size={16} />
            </button>
          </div>
        ) : null}

        {isExpiringSoon && session && (
          <div className="absolute inset-0 rounded-[24px] border-2 border-[#d97706] animate-pulse pointer-events-none" />
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 text-xs text-[#b91c1c] bg-[#fee2e2] border border-[#fca5a5] px-3.5 py-2 rounded-[14px]">
          <MorphIcon icon={AlertCircle} size={14} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Timer & Token Status */}
      <div className="w-full max-w-[260px] space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-[#0f172a]">
          <div className="flex items-center gap-1.5 text-[#64748b]">
            <MorphIcon icon={Clock} size={13} className={isExpiringSoon ? 'text-[#d97706] animate-pulse' : 'text-[#005a36]'} />
            <span className="text-[11px] uppercase tracking-wider font-bold">QR Token Expires in</span>
          </div>
          <span className={`font-mono text-sm font-bold ${isExpiringSoon ? 'text-[#d97706]' : 'text-[#005a36]'}`}>
            {formatTime(timeLeft)}
          </span>
        </div>

        {/* Progress Bar Track */}
        <div className="w-full h-2 bg-[#e2e8f0] rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${
              isExpiringSoon ? 'bg-[#d97706]' : 'bg-[#005a36]'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Action Buttons & Security Info */}
      <div className="flex flex-col items-center gap-2 text-center mt-1">
        <div className="flex items-center gap-2">
          <button
            onClick={() => rotateSessionToken(false)}
            className="text-xs text-[#005a36] hover:underline flex items-center gap-1.5 font-semibold py-1.5 px-3 rounded-full hover:bg-[#e6f2ec] transition-colors border border-transparent hover:border-[#005a36]/20"
          >
            <MorphIcon icon={RefreshCw} size={12} /> Rotate Token Now
          </button>
          <button
            onClick={() => setIsFullscreen(true)}
            className="text-xs bg-[#005a36] text-white hover:bg-[#00462a] flex items-center gap-1.5 font-semibold py-1.5 px-3.5 rounded-full shadow-sm transition-all hover:scale-105 active:scale-95"
          >
            <MorphIcon icon={Maximize2} size={12} /> Full Screen
          </button>
        </div>

        <div className="flex items-center gap-1 text-[11px] text-[#64748b]">
          <MorphIcon icon={Shield} size={11} className="text-[#005a36]" />
          <span>Dynamic Anti-Proxy Token active (Auto-refreshes every 15s)</span>
        </div>
      </div>

      {/* ── Dedicated Full Screen Mode Portal ── */}
      {isFullscreen && session && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[999999] bg-[#ffffff] flex flex-col items-center justify-between p-6 sm:p-12 select-none overflow-hidden">
          
          {/* Top: Subject Name & Live Time & Close */}
          <div className="w-full flex items-center justify-between max-w-5xl">
            <div className="flex flex-col">
              <span className="text-xs uppercase font-bold tracking-widest text-[#005a36] flex items-center gap-1.5 mb-1">
                <span className="w-2.5 h-2.5 rounded-full bg-[#005a36] animate-pulse" />
                Live Attendance Session
              </span>
              <h1 className="text-3xl sm:text-5xl font-bold font-['Source_Serif_4',Georgia,serif] text-[#0f172a] tracking-tight">
                {classInfo?.name || 'Class Subject'}
              </h1>
              {classInfo?.room && (
                <p className="text-sm sm:text-base font-semibold text-[#64748b] mt-1">
                  Room: {classInfo.room} {classInfo.schedule ? `• ${classInfo.schedule}` : ''}
                </p>
              )}
            </div>

            <div className="flex items-center gap-3 sm:gap-4">
              {/* Current Clock Time */}
              <div className="flex flex-col items-end px-4 py-2 bg-[#f8fafc] rounded-[16px] border border-[#e2e8f0] shadow-sm">
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#64748b]">Current Time</span>
                <span className="font-mono text-base sm:text-lg font-bold text-[#0f172a]">{currentTime}</span>
              </div>

              {/* Close Button */}
              <button
                onClick={() => setIsFullscreen(false)}
                className="p-3 bg-[#f1f5f9] hover:bg-[#e2e8f0] text-[#0f172a] rounded-[16px] transition-all hover:scale-105 active:scale-95 flex items-center gap-1.5 text-xs font-bold"
                title="Exit Fullscreen (Esc)"
              >
                <MorphIcon icon={X} size={20} />
                <span className="hidden sm:inline">Close</span>
              </button>
            </div>
          </div>

          {/* Center: Extra Large QR Code */}
          <div className="my-auto flex flex-col items-center">
            <div className="relative p-6 sm:p-10 bg-white rounded-[40px] shadow-2xl border-2 border-[#e2e8f0] flex items-center justify-center">
              <div
                className="absolute inset-[-8px] rounded-[48px] border-2 border-[#005a36]/30 pointer-events-none"
                style={{ animation: 'gesso-qr-breathe 3.2s ease-in-out infinite' }}
              />
              <QRCodeSVG
                value={qrValue}
                size={Math.min(typeof window !== 'undefined' ? window.innerHeight * 0.46 : 420, typeof window !== 'undefined' ? window.innerWidth * 0.8 : 420, 440)}
                level="H"
                includeMargin={false}
                fgColor="#005a36"
              />
            </div>
          </div>

          {/* Bottom: Expiration Countdown & Time Left */}
          <div className="w-full max-w-lg flex flex-col items-center gap-2">
            <div className="w-full flex items-center justify-between text-sm font-semibold">
              <div className="flex items-center gap-2 text-[#64748b]">
                <MorphIcon icon={Clock} size={15} className={isExpiringSoon ? 'text-[#d97706] animate-pulse' : 'text-[#005a36]'} />
                <span className="text-xs uppercase tracking-wider font-bold">QR Token Expires in</span>
              </div>
              <span className={`font-mono text-base font-bold ${isExpiringSoon ? 'text-[#d97706]' : 'text-[#005a36]'}`}>
                {formatTime(timeLeft)}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-3 bg-[#e2e8f0] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${
                  isExpiringSoon ? 'bg-[#d97706]' : 'bg-[#005a36]'
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>

            <span className="text-[11px] text-[#94a3b8] font-medium mt-1">
              Press <kbd className="px-1.5 py-0.5 bg-[#f1f5f9] border border-[#cbd5e1] rounded text-[10px] font-mono text-[#0f172a]">Esc</kbd> to exit fullscreen
            </span>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}


import { useEffect, useState, useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { v4 as uuidv4 } from 'uuid'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { RefreshCw, Clock, Shield, Tv2, AlertCircle, Maximize2, X } from 'lucide';
import { MorphIcon } from 'morphicons/react';

const TOKEN_DURATION_MS = 15 * 1000 // 15 seconds

export default function KioskMode({ classId }) {
  const { profile } = useAuth()
  const [session, setSession] = useState(null)
  const [timeLeft, setTimeLeft] = useState(15)
  const [initialLoading, setInitialLoading] = useState(true)
  const [error, setError] = useState('')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const cachedLocationRef = useRef(null)
  const rotatingRef = useRef(false)

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
      // Find existing active session for today
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
          <div className="w-[250px] h-[250px] rounded-[20px] bg-[#ffffff] flex flex-col items-center justify-center gap-3 shadow-sm border border-[#e2e8f0]">
            <div className="w-8 h-8 border-3 border-[#e2e8f0] border-t-[#005a36] rounded-full animate-spin" />
            <span className="text-xs text-[#64748b]">Initializing kiosk...</span>
          </div>
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
              className="absolute top-2 right-2 p-1.5 bg-white/90 backdrop-blur shadow-sm border border-gray-100 rounded-full text-gray-500 hover:text-[#005a36] hover:bg-gray-50 opacity-0 group-hover:opacity-100 transition-all duration-200"
              title="Full Screen"
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
            <MorphIcon icon={Clock} size={13} className={isExpiringSoon ? 'text-[#d97706] animate-spin' : 'text-[#005a36]'} />
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

      {/* Manual Refresh & Security Info */}
      <div className="flex flex-col items-center gap-2 text-center mt-1">
        <button
          onClick={() => rotateSessionToken(false)}
          className="text-xs text-[#005a36] hover:underline flex items-center gap-1.5 font-semibold py-1 px-3 rounded-full hover:bg-[#e6f2ec] transition-colors"
        >
          <MorphIcon icon={RefreshCw} size={12} /> Rotate Token Now
        </button>

        <div className="flex items-center gap-1 text-[11px] text-[#64748b]">
          <MorphIcon icon={Shield} size={11} className="text-[#005a36]" />
          <span>Dynamic Anti-Proxy Token active (Auto-refreshes every 15s)</span>
        </div>
      </div>

      {/* Full Screen Overlay */}
      {isFullscreen && session && (
        <div className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center p-8">
          <button
            onClick={() => setIsFullscreen(false)}
            className="absolute top-6 right-6 p-3 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-700 transition-colors"
          >
            <MorphIcon icon={X} size={24} />
          </button>
          
          <div className="text-center mb-10">
            <h2 className="text-4xl font-bold text-[#005a36] mb-3">Scan to join class</h2>
            <p className="text-gray-500 text-xl">Use the QSAMS app to scan this QR code</p>
          </div>
          
          <div className="relative p-10 bg-white rounded-[40px] shadow-2xl border border-gray-100 mb-16">
            <div
              className="absolute inset-[-8px] rounded-[48px] border-2 border-[#005a36]/20 opacity-55 pointer-events-none"
              style={{ animation: 'gesso-qr-breathe 3.2s ease-in-out infinite' }}
            />
            <QRCodeSVG
              value={qrValue}
              size={400}
              level="H"
              includeMargin={false}
              fgColor="#005a36"
            />
          </div>
          
          <div className="w-full max-w-lg space-y-4 text-center">
            <div className="text-3xl font-bold">
              <span className={isExpiringSoon ? 'text-[#d97706]' : 'text-[#005a36]'}>
                {formatTime(timeLeft)}
              </span>
            </div>
            <div className="w-full h-4 bg-[#e2e8f0] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${
                  isExpiringSoon ? 'bg-[#d97706]' : 'bg-[#005a36]'
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

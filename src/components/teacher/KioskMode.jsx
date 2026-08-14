import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { v4 as uuidv4 } from 'uuid'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { RefreshCw, Clock, Shield, Tv2 } from 'lucide-react'

const TOKEN_DURATION_MS = 15 * 1000 // 15 seconds

export default function KioskMode({ classId }) {
  const { profile } = useAuth()
  const [session, setSession] = useState(null)
  const [timeLeft, setTimeLeft] = useState(0)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  const getLocation = () => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null)
        return
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          })
        },
        (error) => {
          console.warn('Geolocation error:', error)
          resolve(null)
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      )
    })
  }

  const createSession = async () => {
    setCreating(true)
    setError('')

    const token = uuidv4()
    const expiresAt = new Date(Date.now() + TOKEN_DURATION_MS).toISOString()
    const today = new Date().toLocaleDateString('en-CA')

    const loc = await getLocation()

    const { data: existingSession } = await supabase
      .from('attendance_sessions')
      .select('*')
      .eq('class_id', classId)
      .eq('date', today)
      .eq('is_active', true)
      .maybeSingle()

    let resultData = null
    let resultError = null

    if (existingSession) {
      const { data, error } = await supabase
        .from('attendance_sessions')
        .update({
          session_token: token,
          expires_at: expiresAt,
          latitude: loc?.latitude || null,
          longitude: loc?.longitude || null,
        })
        .eq('id', existingSession.id)
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
      setCreating(false)
      return
    }

    setSession(resultData)
    setTimeLeft(TOKEN_DURATION_MS / 1000)
    setCreating(false)
  }

  useEffect(() => {
    if (!session) return
    if (timeLeft <= 0) {
      createSession()
      return
    }

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(interval); return 0 }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [session, timeLeft])

  useEffect(() => {
    createSession()
  }, [classId])

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0')
    const s = (seconds % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  const pct = session ? (timeLeft / (TOKEN_DURATION_MS / 1000)) * 100 : 0
  const isExpiringSoon = timeLeft < 5 && timeLeft > 0

  const qrValue = session
    ? JSON.stringify({ type: 'attendance', sessionId: session.id, token: session.session_token, classId })
    : ''

  return (
    <div className="flex flex-col items-center gap-5">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center gap-1.5 bg-[#ffffff] border border-[rgba(0,0,0,0.06)] rounded-full px-3.5 py-1 mb-2 text-xs font-bold text-[#ee6a2a] shadow-sm">
          <Tv2 size={13} />
          <span>Kiosk Projection</span>
        </div>
        <p className="text-[#7a7a7a] text-xs">Students scan this QR code using the QSAMS mobile app</p>
      </div>

      {/* QR Code Container with Pulse Ring */}
      <div className="relative">
        {creating ? (
          <div className="w-[220px] h-[220px] rounded-[20px] bg-[#ffffff] flex items-center justify-center shadow-sm">
            <div className="w-8 h-8 border-3 border-[#ebebeb] border-t-[#ee6a2a] rounded-full animate-spin" />
          </div>
        ) : session ? (
          <div className="relative p-5 bg-[#ffffff] rounded-[20px] shadow-sm flex items-center justify-center">
            <div
              className="absolute inset-[-6px] rounded-[26px] border-2 border-[rgba(0,0,0,0.06)] opacity-55 pointer-events-none"
              style={{ animation: 'gesso-qr-breathe 3.2s ease-in-out infinite' }}
            />
            <QRCodeSVG
              value={qrValue}
              size={210}
              level="H"
              includeMargin={false}
              fgColor="#1a1a1a"
            />
          </div>
        ) : null}

        {isExpiringSoon && session && (
          <div className="absolute inset-0 rounded-[20px] border-2 border-[#ee6a2a] animate-pulse pointer-events-none" />
        )}
      </div>

      {/* Timer Bar */}
      {session && (
        <div className="flex flex-col items-center gap-2 w-full max-w-xs">
          <div className="w-full h-2 bg-[#ffffff] rounded-full overflow-hidden border border-[rgba(0,0,0,0.06)]">
            <div
              className="h-full rounded-full bg-[#ee6a2a] transition-all duration-1000"
              style={{ width: `${pct}%` }}
            />
          </div>

          <div className="flex items-center justify-between w-full text-xs font-semibold text-[#7a7a7a]">
            <span className="flex items-center gap-1">
              <Clock size={12} className="text-[#ee6a2a]" />
              Token expires in
            </span>
            <span className="font-mono font-bold text-[#1a1a1a]">
              {formatTime(timeLeft)}
            </span>
          </div>
        </div>
      )}

      {/* Security Note */}
      <div className="flex items-center gap-1.5 text-[11px] text-[#7a7a7a]">
        <Shield size={12} className="text-[#ee6a2a]" />
        <span>Rotating token prevents photo proxy attendance</span>
      </div>

      {error && (
        <div className="text-[#B91C1C] text-xs bg-[#FEE2E2] border border-[#FCA5A5] rounded-[14px] px-3.5 py-2">
          {error}
        </div>
      )}

      {/* Manual Refresh */}
      <button
        onClick={createSession}
        disabled={creating}
        className="btn-secondary btn-sm"
      >
        <RefreshCw size={13} className={creating ? 'animate-spin' : ''} />
        Rotate Token Now
      </button>
    </div>
  )
}

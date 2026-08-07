import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { v4 as uuidv4 } from 'uuid'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { RefreshCw, Clock, Shield, Tv2 } from 'lucide-react'

const TOKEN_DURATION_MS = 15 * 1000 // 15 seconds

/**
 * KioskMode — displays a rotating, time-sensitive QR code for students to scan.
 *
 * Props:
 *   classId: string  — the class for which to generate the session
 */
export default function KioskMode({ classId }) {
  const { profile } = useAuth()
  const [session, setSession] = useState(null)
  const [timeLeft, setTimeLeft] = useState(0)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  // Generate or rotate attendance session in Supabase
  const createSession = async () => {
    setCreating(true)
    setError('')

    const token = uuidv4()
    const expiresAt = new Date(Date.now() + TOKEN_DURATION_MS).toISOString()
    
    // Get today's date in YYYY-MM-DD local time
    const today = new Date().toLocaleDateString('en-CA') // outputs YYYY-MM-DD

    // Check for an existing active session for this class today
    const { data: existingSession, error: checkErr } = await supabase
      .from('attendance_sessions')
      .select('*')
      .eq('class_id', classId)
      .eq('date', today)
      .eq('is_active', true)
      .maybeSingle()

    let resultData = null
    let resultError = null

    if (existingSession) {
      // Rotate token on the existing session
      const { data, error } = await supabase
        .from('attendance_sessions')
        .update({
          session_token: token,
          expires_at: expiresAt,
        })
        .eq('id', existingSession.id)
        .select()
        .single()
      
      resultData = data
      resultError = error
    } else {
      // Deactivate any old active sessions just in case (from previous days)
      await supabase
        .from('attendance_sessions')
        .update({ is_active: false })
        .eq('class_id', classId)
        .eq('is_active', true)

      // Create a brand new session for today
      const { data, error } = await supabase
        .from('attendance_sessions')
        .insert({
          class_id: classId,
          teacher_id: profile.id,
          session_token: token,
          date: today,
          expires_at: expiresAt,
          is_active: true,
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

  // Countdown timer
  useEffect(() => {
    if (!session) return
    if (timeLeft <= 0) {
      createSession() // Auto-rotate when token expires
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

  // Start session on mount
  useEffect(() => {
    createSession()
  }, [classId])

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0')
    const s = (seconds % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  const pct = session ? (timeLeft / (TOKEN_DURATION_MS / 1000)) * 100 : 0
  const isExpiringSoon = timeLeft < 60 && timeLeft > 0

  // QR value includes classId + sessionId for verification
  const qrValue = session
    ? JSON.stringify({ type: 'attendance', sessionId: session.id, token: session.session_token, classId })
    : ''

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/30 rounded-full px-4 py-1.5 mb-3">
          <Tv2 size={14} className="text-indigo-400" />
          <span className="text-indigo-300 text-xs font-semibold uppercase tracking-wide">Kiosk Mode Active</span>
        </div>
        <p className="text-slate-400 text-sm">Students scan this code with the QSAMS app</p>
      </div>

      {/* QR Code Card */}
      <div className="relative">
        {creating ? (
          <div className="w-72 h-72 rounded-2xl bg-white flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          </div>
        ) : session ? (
          <div className={`p-5 bg-white rounded-2xl shadow-2xl transition-all duration-500 ${
            isExpiringSoon ? 'shadow-red-500/20' : 'shadow-indigo-500/20'
          }`}>
            <QRCodeSVG
              value={qrValue}
              size={240}
              level="H"
              includeMargin={false}
              fgColor="#1e1b4b"
            />
          </div>
        ) : null}

        {/* Expiring overlay */}
        {isExpiringSoon && session && (
          <div className="absolute inset-0 rounded-2xl border-2 border-red-500 animate-pulse pointer-events-none" />
        )}
      </div>

      {/* Timer ring */}
      {session && (
        <div className="flex flex-col items-center gap-2 w-full max-w-xs">
          {/* Progress bar */}
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${
                isExpiringSoon
                  ? 'bg-gradient-to-r from-red-500 to-orange-400'
                  : 'bg-gradient-to-r from-indigo-500 to-purple-500'
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>

          <div className="flex items-center justify-between w-full text-sm">
            <span className="flex items-center gap-1.5 text-slate-400">
              <Clock size={13} />
              Token expires in
            </span>
            <span className={`font-mono font-bold tabular-nums ${isExpiringSoon ? 'text-red-400' : 'text-white'}`}>
              {formatTime(timeLeft)}
            </span>
          </div>
        </div>
      )}

      {/* Security note */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Shield size={12} />
        QR code auto-rotates every 15 seconds for security
      </div>

      {error && (
        <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2">
          {error}
        </div>
      )}

      {/* Manual refresh */}
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

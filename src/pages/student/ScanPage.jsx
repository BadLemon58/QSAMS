import { useEffect, useRef, useState, useCallback } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import Navbar from '../../components/common/Navbar'
import Spinner from '../../components/common/Spinner'
import {
  Camera, CameraOff, CheckCircle, AlertTriangle,
  RotateCcw, Info, ScanLine
} from 'lucide-react'

const SCANNER_ID = 'student-qr-scanner'

export default function ScanPage() {
  const { profile } = useAuth()
  const scannerRef = useRef(null)
  const [status, setStatus] = useState('idle')     // idle | requesting | scanning | success | error | already_marked
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [lastToken, setLastToken] = useState(null)

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); await scannerRef.current.clear() } catch (_) {}
      scannerRef.current = null
    }
    setStatus('idle')
  }, [])

  const startScanner = useCallback(async () => {
    setStatus('requesting')
    setErrorMsg('')
    setSuccessMsg('')

    try {
      await navigator.mediaDevices.getUserMedia({ video: true })
    } catch (err) {
      setErrorMsg(
        err.name === 'NotAllowedError'
          ? 'Camera access denied. Please allow camera in your browser settings and refresh.'
          : `Camera error: ${err.message}`
      )
      setStatus('error')
      return
    }

    const html5QrCode = new Html5Qrcode(SCANNER_ID)
    scannerRef.current = html5QrCode

    try {
      await html5QrCode.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 }, aspectRatio: 1 },
        async (decodedText) => {
          if (decodedText === lastToken) return

          // Parse payload
          let payload
          try { payload = JSON.parse(decodedText) } catch (_) {
            setErrorMsg('Invalid QR code. Please scan the QR projected by your teacher.')
            return
          }

          if (payload.type === 'class_enrollment') {
            setLastToken(decodedText)
            const { error: enrollErr } = await supabase
              .from('enrollments')
              .insert({ class_id: payload.classId, student_id: profile.id })

            if (enrollErr) {
              if (enrollErr.code === '23505') {
                setStatus('already_marked')
                setSuccessMsg(`You are already enrolled in "${payload.className || 'this class'}".`)
              } else {
                setErrorMsg(enrollErr.message)
              }
              await stopScanner()
              return
            }

            setStatus('success')
            setSuccessMsg(`Successfully enrolled in "${payload.className || 'Class'}"!`)
            await stopScanner()
            return
          }

          // Validate it's an attendance QR
          if (payload.type !== 'attendance' || !payload.sessionId || !payload.token) {
            setErrorMsg('Invalid QR code. Ask your teacher for the Attendance or Class Join QR.')
            return
          }

          setLastToken(decodedText)

          // Verify session is still valid and not expired
          const { data: session, error: sessErr } = await supabase
            .from('attendance_sessions')
            .select('*')
            .eq('id', payload.sessionId)
            .eq('session_token', payload.token)
            .eq('is_active', true)
            .single()

          if (sessErr || !session) {
            setErrorMsg('Session not found or has ended. Ask your teacher to generate a new QR.')
            return
          }

          if (new Date(session.expires_at) < new Date()) {
            setErrorMsg('This QR code has expired. Ask your teacher to rotate the token.')
            return
          }

          // Check if student is enrolled
          const { data: enrollment } = await supabase
            .from('enrollments')
            .select('id')
            .eq('class_id', session.class_id)
            .eq('student_id', profile.id)
            .maybeSingle()

          if (!enrollment) {
            setErrorMsg("You're not enrolled in this class. Contact your teacher.")
            return
          }

          // Check if already marked
          const { data: existing } = await supabase
            .from('attendance_logs')
            .select('id, status')
            .eq('session_id', session.id)
            .eq('student_id', profile.id)
            .maybeSingle()

          if (existing) {
            setStatus('already_marked')
            setSuccessMsg(`You are already marked as "${existing.status}" for this session.`)
            await stopScanner()
            return
          }

          // Determine status (on time vs late based on 15-min grace window)
          const createdAt = new Date(session.created_at)
          const now = new Date()
          const diffMin = (now - createdAt) / 60000
          const markStatus = diffMin <= 15 ? 'present' : 'late'

          // Insert attendance log
          const { error: logErr } = await supabase
            .from('attendance_logs')
            .insert({
              session_id: session.id,
              student_id: profile.id,
              class_id: session.class_id,
              status: markStatus,
              method: 'qr_student',
            })

          if (logErr) {
            if (logErr.code === '23505') {
              setStatus('already_marked')
              setSuccessMsg('You are already marked for this session.')
            } else {
              setErrorMsg(`Failed to record attendance: ${logErr.message}`)
            }
            await stopScanner()
            return
          }

          setStatus('success')
          setSuccessMsg(`You have been marked "${markStatus}" — attendance recorded!`)
          await stopScanner()
        },
        () => { /* frame with no QR — ok */ }
      )
      setStatus('scanning')
    } catch (err) {
      setErrorMsg(`Could not start scanner: ${err?.message || err}`)
      setStatus('error')
    }
  }, [lastToken, profile.id, stopScanner])

  useEffect(() => { return () => { stopScanner() } }, [stopScanner])

  return (
    <div className="min-h-screen bg-[#0a0f1e]">
      <Navbar />
      <div className="max-w-lg mx-auto px-4 py-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 mb-4 shadow-lg shadow-purple-500/30">
            <ScanLine size={26} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Scan Attendance QR</h1>
          <p className="text-slate-400 text-sm mt-1">Point your camera at the QR code projected by your teacher</p>
        </div>

        <div className="glass-card p-6 flex flex-col items-center gap-5">

          {/* Scanner viewport */}
          <div className="relative w-full">
            <div
              id={SCANNER_ID}
              className="w-full rounded-2xl overflow-hidden bg-slate-900 min-h-[280px] flex items-center justify-center"
            />

            {/* Idle overlay */}
            {status === 'idle' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl bg-slate-900/90 border border-white/5">
                <Camera size={36} className="text-slate-600" />
                <p className="text-slate-500 text-sm">Camera is off</p>
              </div>
            )}

            {status === 'requesting' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl bg-slate-900/95">
                <Spinner size="lg" />
                <p className="text-slate-400 text-sm">Requesting camera...</p>
              </div>
            )}

            {status === 'scanning' && (
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-[12%]">
                  <span className="absolute top-0 left-0 w-7 h-7 border-t-2 border-l-2 border-purple-400 rounded-tl" />
                  <span className="absolute top-0 right-0 w-7 h-7 border-t-2 border-r-2 border-purple-400 rounded-tr" />
                  <span className="absolute bottom-0 left-0 w-7 h-7 border-b-2 border-l-2 border-purple-400 rounded-bl" />
                  <span className="absolute bottom-0 right-0 w-7 h-7 border-b-2 border-r-2 border-purple-400 rounded-br" />
                </div>
              </div>
            )}

            {status === 'success' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl bg-emerald-900/70 border border-emerald-500/40 animate-fade-in">
                <CheckCircle size={48} className="text-emerald-400" />
                <p className="text-emerald-300 font-bold text-lg">Attendance Recorded!</p>
              </div>
            )}

            {status === 'already_marked' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl bg-indigo-900/70 border border-indigo-500/40 animate-fade-in">
                <CheckCircle size={48} className="text-indigo-400" />
                <p className="text-indigo-300 font-bold">Already Marked</p>
              </div>
            )}
          </div>

          {/* Status messages */}
          {(status === 'success' || status === 'already_marked') && successMsg && (
            <div className={`w-full flex items-start gap-3 rounded-xl px-4 py-3 animate-fade-in ${
              status === 'success'
                ? 'bg-emerald-500/10 border border-emerald-500/30'
                : 'bg-indigo-500/10 border border-indigo-500/30'
            }`}>
              <CheckCircle size={18} className={status === 'success' ? 'text-emerald-400' : 'text-indigo-400'} />
              <p className={`text-sm ${status === 'success' ? 'text-emerald-300' : 'text-indigo-300'}`}>{successMsg}</p>
            </div>
          )}

          {status === 'error' && (
            <div className="w-full flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 animate-fade-in">
              <AlertTriangle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-400 text-sm">{errorMsg}</p>
            </div>
          )}

          {/* Controls */}
          <div className="flex gap-3">
            {(status === 'idle' || status === 'error') && (
              <button onClick={startScanner} className="btn-primary">
                <Camera size={16} />
                Start Scanning
              </button>
            )}
            {(status === 'success' || status === 'already_marked') && (
              <button onClick={() => { setStatus('idle'); setLastToken(null) }} className="btn-secondary">
                <RotateCcw size={15} />
                Scan Another
              </button>
            )}
            {(status === 'scanning' || status === 'requesting') && (
              <button onClick={stopScanner} className="btn-danger">
                <CameraOff size={16} />
                Stop
              </button>
            )}
            {status === 'error' && (
              <button onClick={startScanner} className="btn-secondary">
                <RotateCcw size={15} />
                Retry
              </button>
            )}
          </div>

          {/* Hint */}
          <div className="flex items-start gap-2 bg-slate-800/40 border border-slate-700/30 rounded-xl px-4 py-3 w-full">
            <Info size={14} className="text-slate-500 flex-shrink-0 mt-0.5" />
            <p className="text-slate-500 text-xs leading-relaxed">
              Scan only the <strong className="text-slate-400">QSAMS attendance QR</strong> projected by your teacher. The QR must be active and not expired. You can only mark attendance once per session.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

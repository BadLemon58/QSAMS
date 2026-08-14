import { useEffect, useRef, useState, useCallback } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import Navbar from '../../components/common/Navbar'
import Spinner from '../../components/common/Spinner'
import {
  Camera, CameraOff, CheckCircle, AlertTriangle,
  RotateCcw, Info, ScanLine, MapPin
} from 'lucide-react'

const SCANNER_ID = 'student-qr-scanner'

// Haversine distance in meters
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3
  const p1 = lat1 * Math.PI/180
  const p2 = lat2 * Math.PI/180
  const dp = (lat2-lat1) * Math.PI/180
  const dl = (lon2-lon1) * Math.PI/180
  const a = Math.sin(dp/2) * Math.sin(dp/2) +
            Math.cos(p1) * Math.cos(p2) *
            Math.sin(dl/2) * Math.sin(dl/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}

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
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  })
}

export default function ScanPage() {
  const { profile } = useAuth()
  const scannerRef = useRef(null)
  const [status, setStatus] = useState('idle')     // idle | requesting | scanning | success | error | already_marked
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [lastToken, setLastToken] = useState(null)
  const isProcessingRef = useRef(false)

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); await scannerRef.current.clear() } catch (_) {}
      scannerRef.current = null
    }
  }, [])

  const startScanner = useCallback(async () => {
    setStatus('requesting')
    setErrorMsg('')
    setSuccessMsg('')
    isProcessingRef.current = false

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
          if (isProcessingRef.current) return
          if (decodedText === lastToken) return
          isProcessingRef.current = true

          let payload
          try {
            payload = JSON.parse(decodedText)
          } catch (_) {
            setErrorMsg('Invalid QR code. Please scan the QR projected by your teacher.')
            setStatus('error')
            await stopScanner()
            return
          }

          // Enrollment QR
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
                setErrorMsg(`Enrollment error: ${enrollErr.message}`)
                setStatus('error')
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
            setStatus('error')
            await stopScanner()
            return
          }

          setLastToken(decodedText)

          // Verify session is still valid
          const { data: session, error: sessErr } = await supabase
            .from('attendance_sessions')
            .select('*')
            .eq('id', payload.sessionId)
            .eq('session_token', payload.token)
            .eq('is_active', true)
            .maybeSingle()

          if (sessErr || !session) {
            setErrorMsg('Session not found or has ended. Ask your teacher to generate a new QR.')
            setStatus('error')
            await stopScanner()
            return
          }

          if (new Date(session.expires_at) < new Date()) {
            setErrorMsg('This QR code has expired. Ask your teacher to rotate the token.')
            setStatus('error')
            await stopScanner()
            return
          }

          // Geolocation Verification
          if (session.latitude && session.longitude) {
            setStatus('requesting')
            setErrorMsg('Verifying classroom location...')
            
            const loc = await getLocation()
            if (!loc) {
              setErrorMsg('Location access is required to check in. Please enable location permissions.')
              setStatus('error')
              await stopScanner()
              return
            }

            const distance = calculateDistance(loc.latitude, loc.longitude, session.latitude, session.longitude)
            const maxRadius = session.radius_meters || 100

            if (distance > maxRadius) {
              setErrorMsg(`You are too far from the classroom (${Math.round(distance)}m away). Location verification failed.`)
              setStatus('error')
              await stopScanner()
              return
            }
          }

          // Check enrollment
          const { data: enrollment, error: enrollCheckErr } = await supabase
            .from('enrollments')
            .select('id')
            .eq('class_id', session.class_id)
            .eq('student_id', profile.id)
            .maybeSingle()

          if (enrollCheckErr || !enrollment) {
            setErrorMsg("You're not enrolled in this class. Please join the class first!")
            setStatus('error')
            await stopScanner()
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

          // Grace period check
          const createdAt = new Date(session.created_at)
          const now = new Date()
          const diffMin = (now - createdAt) / 60000
          const markStatus = diffMin <= 15 ? 'present' : 'late'

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
              setStatus('error')
            }
            await stopScanner()
            return
          }

          setStatus('success')
          setSuccessMsg(`You have been marked "${markStatus.toUpperCase()}" — attendance recorded!`)
          await stopScanner()
        },
        () => {}
      )
      setStatus('scanning')
    } catch (err) {
      setErrorMsg(`Could not start scanner: ${err?.message || err}`)
      setStatus('error')
    }
  }, [lastToken, profile.id, stopScanner])

  useEffect(() => { return () => { stopScanner() } }, [stopScanner])

  return (
    <div className="min-h-screen bg-[#ffffff] text-[#1a1a1a] font-['Gambarino',system-ui,sans-serif] selection:bg-[#ee6a2a]/20">
      <Navbar />
      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-[20px] bg-[#ee6a2a] mb-3 text-[#000000] shadow-sm">
            <ScanLine size={26} />
          </div>
          <h1 className="font-['Source_Serif_4',Georgia,serif] text-2xl font-bold text-[#1a1a1a]">
            Scan Attendance QR
          </h1>
          <p className="text-[#7a7a7a] text-xs mt-1">
            Point camera at the live attendance QR displayed by your teacher
          </p>
        </div>

        <div className="bg-[#ebebeb] border border-[rgba(0,0,0,0.06)] rounded-[24px] p-6 flex flex-col items-center gap-5 shadow-sm">

          {/* Scanner Viewport */}
          <div className="relative w-full">
            <div
              id={SCANNER_ID}
              className="w-full rounded-[20px] overflow-hidden bg-[#f5f5f5] min-h-[280px] flex items-center justify-center border border-[#DDD9D3]"
            />

            {/* Idle Overlay */}
            {status === 'idle' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-[20px] bg-[#f5f5f5]">
                <Camera size={36} className="text-[#7a7a7a]" />
                <p className="text-[#7a7a7a] text-xs font-semibold">Camera is ready</p>
              </div>
            )}

            {status === 'requesting' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-[20px] bg-[#ffffff]/90 backdrop-blur-sm">
                <Spinner size="lg" />
                <p className="text-[#1a1a1a] text-xs font-semibold">Requesting camera access...</p>
              </div>
            )}

            {status === 'scanning' && (
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-[12%] border-2 border-dashed border-[#ee6a2a]/60 rounded-2xl animate-pulse" />
              </div>
            )}

            {status === 'success' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-[20px] bg-[#DCFCE7] text-[#15803D] p-4 text-center animate-fade-in">
                <CheckCircle size={44} />
                <p className="font-['Source_Serif_4',Georgia,serif] font-bold text-lg">Attendance Logged!</p>
              </div>
            )}

            {status === 'already_marked' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-[20px] bg-[#E0E7FF] text-[#3730A3] p-4 text-center animate-fade-in">
                <CheckCircle size={44} />
                <p className="font-['Source_Serif_4',Georgia,serif] font-bold text-lg">Already Marked</p>
              </div>
            )}
          </div>

          {/* Status Messages */}
          {(status === 'success' || status === 'already_marked') && successMsg && (
            <div className={`w-full flex items-start gap-2.5 rounded-[16px] px-4 py-3 text-xs font-semibold ${
              status === 'success' ? 'bg-[#DCFCE7] text-[#15803D]' : 'bg-[#E0E7FF] text-[#3730A3]'
            }`}>
              <CheckCircle size={16} className="shrink-0 mt-0.5" />
              <p>{successMsg}</p>
            </div>
          )}

          {status === 'error' && (
            <div className="w-full flex items-start gap-2.5 bg-[#FEE2E2] text-[#B91C1C] border border-[#FCA5A5] rounded-[16px] px-4 py-3 text-xs font-semibold animate-fade-in">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <p>{errorMsg}</p>
            </div>
          )}

          {/* Controls */}
          <div className="flex gap-2.5 w-full">
            {(status === 'idle' || status === 'error') && (
              <button onClick={startScanner} className="btn-primary flex-1 justify-center py-3.5">
                <Camera size={16} />
                Open Camera to Scan
              </button>
            )}
            {(status === 'success' || status === 'already_marked') && (
              <button onClick={() => { setStatus('idle'); setLastToken(null) }} className="btn-secondary flex-1 justify-center py-3.5">
                <RotateCcw size={15} />
                Scan Another
              </button>
            )}
            {(status === 'scanning' || status === 'requesting') && (
              <button onClick={stopScanner} className="btn-danger flex-1 justify-center py-3.5">
                <CameraOff size={16} />
                Stop Camera
              </button>
            )}
          </div>

          {/* Guidelines */}
          <div className="flex items-start gap-2.5 bg-[#f5f5f5] border border-[rgba(0,0,0,0.06)] rounded-[16px] px-4 py-3 w-full">
            <Info size={15} className="text-[#7a7a7a] shrink-0 mt-0.5" />
            <p className="text-[#7a7a7a] text-xs leading-relaxed">
              Scan the live dynamic attendance QR shown in class. Once scanned, your attendance is immediately synchronized with your teacher's roster.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
